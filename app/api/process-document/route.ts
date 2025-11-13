import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
const pdfParse = require('pdf-parse');
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
      // Extract PDF content
      try {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const pdfData = await pdfParse(buffer);
        extractedContent = pdfData.text;

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
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      fileType === 'application/vnd.ms-powerpoint'
    ) {
      // PowerPoint - extract what we can
      try {
        const text = await response.text();
        // Basic extraction - try to get text content
        extractedContent = text
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (!extractedContent || extractedContent.length < 100) {
          extractedContent = `PowerPoint Presentation: ${fileName}\n\nThis PowerPoint file has been uploaded. For best results with presentations, please export to PDF first and upload the PDF version for detailed analysis.`;
        }

        console.log('PowerPoint processed, length:', extractedContent.length);
      } catch (pptError) {
        console.error('PowerPoint extraction error:', pptError);
        extractedContent = `PowerPoint Presentation: ${fileName}\n\nThis PowerPoint file has been uploaded. For best results with presentations, please export to PDF first and upload the PDF version for detailed analysis.`;
      }
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileType === 'application/vnd.ms-excel'
    ) {
      // Excel files
      extractedContent = `Excel Spreadsheet: ${fileName}\n\nThis is an Excel spreadsheet. For best results with spreadsheet data, please export to PDF or convert to plain text (CSV/TXT) format before uploading for detailed analysis.`;
    } else {
      extractedContent = `Document: ${fileName}\n\nThis file type (${fileType}) is not fully supported for automatic content extraction. For best results, please convert to PDF or TXT format.`;
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
