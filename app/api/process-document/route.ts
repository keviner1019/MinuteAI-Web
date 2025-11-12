import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

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
      // For PDF, we'll extract text (you may need pdf-parse or similar library)
      // For now, we'll create a placeholder
      extractedContent = `PDF Document: ${fileName}\n\nThis is a PDF document. Content extraction requires additional processing.`;
    } else if (fileType.includes('text/plain')) {
      // Plain text file
      extractedContent = await response.text();
    } else if (
      fileType.includes('word') ||
      fileType.includes('document') ||
      fileType.includes('presentation') ||
      fileType.includes('spreadsheet')
    ) {
      // For Office documents, we'll create a placeholder
      // In production, you'd use libraries like mammoth, officegen, etc.
      extractedContent = `Office Document: ${fileName}\n\nThis is a ${fileType.includes('word') ? 'Word' : fileType.includes('presentation') ? 'PowerPoint' : 'Excel'} document. Content extraction requires additional processing.`;
    } else {
      extractedContent = `Document: ${fileName}\n\nUnsupported file type for automatic content extraction.`;
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
    return NextResponse.json(
      { error: error.message || 'Document processing failed' },
      { status: 500 }
    );
  }
}
