import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import { Document, Paragraph, TextRun, AlignmentType, Packer } from 'docx';
import { TranscriptSegment } from '@/types';
import { formatTime, formatSRTTime } from './timeFormatter';

/**
 * Export transcript to plain text format
 */
export async function exportToTXT(
  segments: TranscriptSegment[],
  title: string,
  originalSegments?: TranscriptSegment[],
  language?: string
): Promise<void> {
  const isBilingual = originalSegments && originalSegments.length > 0 && language !== 'Original';

  let content = '';

  if (isBilingual) {
    // Bilingual format: Translated followed by original
    content = segments
      .map((segment, index) => {
        const timestamp = `[${formatTime(segment.start)}]`;
        const speaker = segment.speaker ? `${segment.speaker}: ` : '';
        const translated = `${timestamp} ${speaker}${segment.text}`;
        const original = originalSegments[index]
          ? `   [Original] ${originalSegments[index].text}`
          : '';
        return `${translated}\n${original}`;
      })
      .join('\n\n');
  } else {
    // Single language format
    content = segments
      .map((segment) => {
        const timestamp = `[${formatTime(segment.start)}]`;
        const speaker = segment.speaker ? `${segment.speaker}: ` : '';
        return `${timestamp} ${speaker}${segment.text}`;
      })
      .join('\n\n');
  }

  const header = `${title}\n${'='.repeat(title.length)}\n\n`;
  const fullContent = header + content;

  const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${sanitizeFilename(title)}.txt`);
}

/**
 * Export transcript to SRT subtitle format
 */
export async function exportToSRT(
  segments: TranscriptSegment[],
  title: string,
  originalSegments?: TranscriptSegment[],
  language?: string
): Promise<void> {
  const isBilingual = originalSegments && originalSegments.length > 0 && language !== 'Original';

  let content = '';

  if (isBilingual) {
    // Bilingual SRT: Show translated and original on separate lines
    content = segments
      .map((segment, index) => {
        const startTime = formatSRTTime(segment.start);
        const endTime = formatSRTTime(segment.end);
        const speaker = segment.speaker ? `[${segment.speaker}] ` : '';
        const original = originalSegments[index]?.text || '';

        return `${index + 1}\n${startTime} --> ${endTime}\n${speaker}${
          segment.text
        }\n[Original] ${original}\n`;
      })
      .join('\n');
  } else {
    // Single language SRT
    content = segments
      .map((segment, index) => {
        const startTime = formatSRTTime(segment.start);
        const endTime = formatSRTTime(segment.end);
        const speaker = segment.speaker ? `[${segment.speaker}] ` : '';

        return `${index + 1}\n${startTime} --> ${endTime}\n${speaker}${segment.text}\n`;
      })
      .join('\n');
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${sanitizeFilename(title)}.srt`);
}

/**
 * Export transcript to PDF format
 */
export async function exportToPDF(
  segments: TranscriptSegment[],
  title: string,
  originalSegments?: TranscriptSegment[],
  language?: string
): Promise<void> {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const lineHeight = 7;
  let yPosition = margin;

  const isBilingual = originalSegments && originalSegments.length > 0 && language !== 'Original';

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
  yPosition += lineHeight;

  if (isBilingual) {
    pdf.text(`Bilingual: ${language} with Original`, margin, yPosition);
    yPosition += lineHeight * 2;
  } else {
    yPosition += lineHeight;
  }

  // Reset text color
  pdf.setTextColor(0, 0, 0);

  // Transcript content
  pdf.setFontSize(11);

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    // Check if we need a new page
    if (yPosition > pageHeight - margin - 30) {
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

    // Translated text (blue for bilingual)
    if (isBilingual) {
      pdf.setTextColor(37, 99, 235); // Blue
      pdf.setFont('helvetica', 'bold');
      const translatedLabel = pdf.splitTextToSize(`[${language}]`, pageWidth - 2 * margin);
      pdf.text(translatedLabel, margin, yPosition);
      yPosition += lineHeight;
    }

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    const textLines = pdf.splitTextToSize(segment.text, pageWidth - 2 * margin);

    for (const line of textLines) {
      if (yPosition > pageHeight - margin - 20) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.text(line, margin, yPosition);
      yPosition += lineHeight;
    }

    // Original text if bilingual
    if (isBilingual && originalSegments[i]) {
      yPosition += lineHeight * 0.3;

      if (yPosition > pageHeight - margin - 20) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.setTextColor(100, 100, 100); // Gray
      pdf.setFont('helvetica', 'italic');
      pdf.text('[Original]', margin, yPosition);
      yPosition += lineHeight;

      pdf.setFont('helvetica', 'normal');
      const originalLines = pdf.splitTextToSize(originalSegments[i].text, pageWidth - 2 * margin);

      for (const line of originalLines) {
        if (yPosition > pageHeight - margin - 20) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(line, margin, yPosition);
        yPosition += lineHeight;
      }

      pdf.setTextColor(0, 0, 0); // Reset color
    }

    yPosition += lineHeight * 0.8; // Add spacing between segments
  }

  pdf.save(`${sanitizeFilename(title)}.pdf`);
}

/**
 * Export transcript to DOCX format
 */
export async function exportToDOCX(
  segments: TranscriptSegment[],
  title: string,
  originalSegments?: TranscriptSegment[],
  language?: string
): Promise<void> {
  const paragraphs: Paragraph[] = [];

  const isBilingual = originalSegments && originalSegments.length > 0 && language !== 'Original';

  // Title
  paragraphs.push(
    new Paragraph({
      text: title,
      heading: 'Heading1',
      spacing: { after: 200 },
    })
  );

  // Timestamp
  const dateText = `Generated on ${new Date().toLocaleDateString()}`;
  const metaText = isBilingual ? `${dateText} • Bilingual: ${language} with Original` : dateText;

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: metaText,
          color: '808080',
          size: 20,
        }),
      ],
      spacing: { after: 400 },
    })
  );

  // Transcript segments
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const timestamp = `[${formatTime(segment.start)}]`;
    const speaker = segment.speaker ? ` ${segment.speaker}:` : '';

    // Timestamp and speaker
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

    // Translated text
    if (isBilingual) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[${language}] `,
              bold: true,
              color: '2563EB',
              size: 20,
            }),
          ],
          spacing: { after: 40 },
        })
      );
    }

    paragraphs.push(
      new Paragraph({
        text: segment.text,
        spacing: { after: isBilingual ? 120 : 200 },
      })
    );

    // Original text if bilingual
    if (isBilingual && originalSegments[i]) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '[Original] ',
              bold: true,
              color: '6B7280',
              italics: true,
              size: 20,
            }),
          ],
          spacing: { after: 40 },
        })
      );

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: originalSegments[i].text,
              color: '6B7280',
            }),
          ],
          spacing: { after: 240 },
        })
      );
    }
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
