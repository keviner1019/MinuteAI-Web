import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import PDFParser from 'pdf2json';
import mammoth from 'mammoth';

export async function POST(request: NextRequest) {
  let noteId: string = '';

  try {
    const body = await request.json();
    noteId = body.noteId;
    const fileUrl = body.fileUrl;
    const fileType = body.fileType;
    const fileName = body.fileName;

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
                      return text.R.map((r: any) => decodeURIComponent(r.T)).join(' ');
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
      throw new Error(`File type ${fileType} is not supported. Please upload PDF, Word (.docx), or Text (.txt) files.`);
    }

    // Validate we have meaningful content
    if (!extractedContent || extractedContent.trim().length < 10) {
      throw new Error('No meaningful content could be extracted from the document');
    }

    console.log('Content extracted, length:', extractedContent.length);

    // Update note with extracted content
    const { data, error: updateError } = await supabaseAdmin
      .from('notes')
      .update({
        transcript: extractedContent,
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
      content: extractedContent,
    });
  } catch (error: any) {
    console.error('Document processing error:', error);

    // Try to update note with error information
    if (noteId) {
      try {
        await supabaseAdmin
          .from('notes')
          .update({
            transcript: `Error processing document: ${error.message}\n\nPlease try converting the document to PDF or TXT format for better results.`,
            duration: 0,
          })
          .eq('id', noteId);
      } catch (updateError) {
        console.error('Failed to update note with error:', updateError);
      }
    }

    return NextResponse.json(
      { error: error.message || 'Document processing failed' },
      { status: 500 }
    );
  }
}
