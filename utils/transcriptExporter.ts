import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import { Document, Paragraph, TextRun, AlignmentType, Packer } from 'docx';
import { TranscriptSegment } from '@/types';
import { formatTime, formatSRTTime } from './timeFormatter';

/**
 * Export transcript to plain text format
 */
export async function exportToTXT(segments: TranscriptSegment[], title: string): Promise<void> {
  const content = segments
    .map((segment) => {
      const timestamp = `[${formatTime(segment.start)}]`;
      const speaker = segment.speaker ? `${segment.speaker}: ` : '';
      return `${timestamp} ${speaker}${segment.text}`;
    })
    .join('\n\n');

  const header = `${title}\n${'='.repeat(title.length)}\n\n`;
  const fullContent = header + content;

  const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${sanitizeFilename(title)}.txt`);
}

/**
 * Export transcript to SRT subtitle format
 */
export async function exportToSRT(segments: TranscriptSegment[], title: string): Promise<void> {
  const content = segments
    .map((segment, index) => {
      const startTime = formatSRTTime(segment.start);
      const endTime = formatSRTTime(segment.end);
      const speaker = segment.speaker ? `[${segment.speaker}] ` : '';

      return `${index + 1}\n${startTime} --> ${endTime}\n${speaker}${segment.text}\n`;
    })
    .join('\n');

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${sanitizeFilename(title)}.srt`);
}

/**
 * Export transcript to PDF format
 */
export async function exportToPDF(segments: TranscriptSegment[], title: string): Promise<void> {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const lineHeight = 7;
  let yPosition = margin;

  // Title
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, margin, yPosition);
  yPosition += lineHeight * 2;

  // Timestamp
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(128, 128, 128);
  pdf.text(`Generated on ${new Date().toLocaleDateString()}`, margin, yPosition);
  yPosition += lineHeight * 2;

  // Reset text color
  pdf.setTextColor(0, 0, 0);

  // Transcript content
  pdf.setFontSize(11);

  for (const segment of segments) {
    // Check if we need a new page
    if (yPosition > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }

    // Timestamp and speaker (bold)
    const timestamp = `[${formatTime(segment.start)}]`;
    const speaker = segment.speaker ? ` ${segment.speaker}:` : '';
    const header = timestamp + speaker;

    pdf.setFont('helvetica', 'bold');
    pdf.text(header, margin, yPosition);
    yPosition += lineHeight;

    // Text content (split into multiple lines if needed)
    pdf.setFont('helvetica', 'normal');
    const textLines = pdf.splitTextToSize(segment.text, pageWidth - 2 * margin);

    for (const line of textLines) {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.text(line, margin, yPosition);
      yPosition += lineHeight;
    }

    yPosition += lineHeight * 0.5; // Add spacing between segments
  }

  pdf.save(`${sanitizeFilename(title)}.pdf`);
}

/**
 * Export transcript to DOCX format
 */
export async function exportToDOCX(segments: TranscriptSegment[], title: string): Promise<void> {
  const paragraphs: Paragraph[] = [];

  // Title
  paragraphs.push(
    new Paragraph({
      text: title,
      heading: 'Heading1',
      spacing: { after: 200 },
    })
  );

  // Timestamp
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated on ${new Date().toLocaleDateString()}`,
          color: '808080',
          size: 20,
        }),
      ],
      spacing: { after: 400 },
    })
  );

  // Transcript segments
  for (const segment of segments) {
    const timestamp = `[${formatTime(segment.start)}]`;
    const speaker = segment.speaker ? ` ${segment.speaker}:` : '';

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: timestamp + speaker,
            bold: true,
            color: '2563EB', // Blue color
          }),
        ],
        spacing: { before: 120, after: 80 },
      })
    );

    paragraphs.push(
      new Paragraph({
        text: segment.text,
        spacing: { after: 200 },
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${sanitizeFilename(title)}.docx`);
}

/**
 * Sanitize filename by removing invalid characters
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

/**
 * Get export format label
 */
export function getExportFormatLabel(format: string): string {
  const labels: { [key: string]: string } = {
    txt: 'Plain Text',
    srt: 'SRT Subtitles',
    pdf: 'PDF Document',
    docx: 'Word Document',
  };
  return labels[format] || format.toUpperCase();
}
