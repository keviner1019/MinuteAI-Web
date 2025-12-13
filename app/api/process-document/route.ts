import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import PDFParser from 'pdf2json';
import mammoth from 'mammoth';

function sanitizeTextInput(raw: string): string {
  if (!raw) return '';

  let sanitized = raw;

  // Handle escaped unicode sequences of variable length (e.g. \u{1F600})
  sanitized = sanitized.replace(/\\u\{([0-9A-Fa-f]+)\}/g, (_, code) => {
    try {
      return String.fromCodePoint(parseInt(code, 16));
    } catch {
      return '';
    }
  });

  // Handle standard 4-digit \uXXXX sequences
  sanitized = sanitized.replace(/\\u([0-9A-Fa-f]{4})/g, (_, code) => {
    try {
      return String.fromCharCode(parseInt(code, 16));
    } catch {
      return '';
    }
  });

  // Remove incomplete unicode escapes like \u12 or \uXYZ
  sanitized = sanitized.replace(/\\u[0-9A-Fa-f]{0,3}/g, '');

  // Convert hex escapes like \xAB
  sanitized = sanitized.replace(/\\x([0-9A-Fa-f]{2})/g, (_, code) => {
    try {
      return String.fromCharCode(parseInt(code, 16));
    } catch {
      return '';
    }
  });

  // Remove any left-over stray backslash-u sequences
  sanitized = sanitized.replace(/\\u/g, '');

  // Strip non-printable control characters
  sanitized = sanitized.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ');

  // Collapse whitespace and normalize
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  try {
    return sanitized.normalize('NFC');
  } catch {
    return sanitized;
  }
}

export async function POST(request: NextRequest) {
  let noteId: string = '';

  try {
    const body = await request.json();
    noteId = body.noteId;
    const fileUrl = body.fileUrl;
    const fileType = body.fileType;
    const fileName = body.fileName;
    const skipAIAnalysis = body.skipAIAnalysis || false; // Flag to skip AI analysis for batching

    if (!noteId || !fileUrl) {
      return NextResponse.json({ error: 'Missing noteId or fileUrl' }, { status: 400 });
    }

    console.log('Processing document:', fileName, fileType);

    // Fetch the file from Supabase Storage
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch document');
    }

    let extractedContent = '';

    // Handle different file types
    if (fileType === 'application/pdf') {
      // Extract PDF content using pdf2json (serverless-friendly, no canvas dependencies)
      try {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        extractedContent = await new Promise<string>((resolve, reject) => {
          const pdfParser = new (PDFParser as any)(null, 1);

          pdfParser.on('pdfParser_dataError', (errData: any) => {
            reject(new Error(errData.parserError));
          });

          pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
            try {
              // Extract text from all pages
              const textParts: string[] = [];

              if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
                for (const page of pdfData.Pages) {
                  if (page.Texts && Array.isArray(page.Texts)) {
                    const pageText = page.Texts.map((text: any) => {
                      return text.R.map((r: any) => {
                        try {
                          // Try to decode URI component, fallback to raw text if malformed
                          return decodeURIComponent(r.T);
                        } catch (decodeError) {
                          // If URI is malformed, try to clean it up
                          console.warn(
                            'Failed to decode URI component, attempting to clean:',
                            r.T.substring(0, 50)
                          );
                          try {
                            // Replace problematic escape sequences
                            const cleaned = r.T.replace(/\\u[0-9A-Fa-f]{0,3}(?![0-9A-Fa-f])/g, '')
                              .replace(/\\u/g, '')
                              .replace(/%[0-9A-Fa-f]{0,1}(?![0-9A-Fa-f])/g, '');
                            return decodeURIComponent(cleaned);
                          } catch (cleanError) {
                            // Last resort: return empty string to skip this text segment
                            return '';
                          }
                        }
                      })
                        .filter((t: string) => t.length > 0)
                        .join(' ');
                    }).join(' ');
                    textParts.push(pageText);
                  }
                }
              }

              const fullText = textParts.join('\n\n').trim();
              resolve(fullText);
            } catch (error) {
              reject(error);
            }
          });

          pdfParser.parseBuffer(buffer);
        });

        if (!extractedContent || extractedContent.trim().length === 0) {
          throw new Error('PDF appears to be empty or contains only images');
        }

        console.log('PDF extracted successfully, length:', extractedContent.length);
      } catch (pdfError) {
        console.error('PDF extraction error:', pdfError);
        throw new Error(
          `Failed to extract PDF content: ${
            pdfError instanceof Error ? pdfError.message : 'Unknown error'
          }`
        );
      }
    } else if (fileType === 'text/plain') {
      // Plain text file
      extractedContent = await response.text();
      console.log('Text file read successfully, length:', extractedContent.length);
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileType === 'application/msword'
    ) {
      // Extract Word document content
      try {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const result = await mammoth.extractRawText({ buffer });
        extractedContent = result.value;

        if (!extractedContent || extractedContent.trim().length === 0) {
          throw new Error('Word document appears to be empty');
        }

        console.log('Word document extracted successfully, length:', extractedContent.length);
      } catch (docError) {
        console.error('Word document extraction error:', docError);
        throw new Error(
          `Failed to extract Word document content: ${
            docError instanceof Error ? docError.message : 'Unknown error'
          }`
        );
      }
    } else {
      // Unsupported file type
      throw new Error(
        `File type ${fileType} is not supported. Please upload PDF, Word (.docx), or Text (.txt) files.`
      );
    }

    // Validate we have meaningful content
    if (!extractedContent || extractedContent.trim().length < 10) {
      throw new Error('No meaningful content could be extracted from the document');
    }

    const sanitizedContent = sanitizeTextInput(extractedContent);

    if (!sanitizedContent || sanitizedContent.length < 10) {
      throw new Error('Extracted content did not contain enough valid text after cleaning');
    }

    console.log('Content extracted, length:', sanitizedContent.length);

    // Update note with extracted content
    const { data, error: updateError } = await supabaseAdmin
      .from('notes')
      .update({
        transcript: sanitizedContent,
        duration: 0, // Documents don't have duration
      })
      .eq('id', noteId)
      .select();

    if (updateError) {
      console.error('Error updating note:', updateError);
      throw new Error(`Failed to update note: ${updateError.message}`);
    }

    if (!data || data.length === 0) {
      console.error('No rows updated!');
      throw new Error('Failed to update note - no rows affected');
    }

    console.log('Note updated successfully with document content');

    return NextResponse.json({
      success: true,
      content: sanitizedContent,
    });
  } catch (error: any) {
    console.error('Document processing error:', error);

    // Sanitize error message to avoid JSON serialization issues
    const sanitizedErrorMessage = error.message
      ? sanitizeTextInput(error.message) || 'Document processing failed'
      : 'Document processing failed';

    // Try to update note with error information
    if (noteId) {
      try {
        await supabaseAdmin
          .from('notes')
          .update({
            transcript: `Error processing document: ${sanitizedErrorMessage}\n\nPlease try converting the document to PDF or TXT format for better results.`,
            duration: 0,
          })
          .eq('id', noteId);
      } catch (updateError) {
        console.error('Failed to update note with error:', updateError);
      }
    }

    return NextResponse.json(
      { error: sanitizedErrorMessage || 'Document processing failed' },
      { status: 500 }
    );
  }
}
