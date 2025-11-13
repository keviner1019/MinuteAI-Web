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
 * Export transcript to PDF format with Unicode support
 */
export async function exportToPDF(
  segments: TranscriptSegment[],
  title: string,
  originalSegments?: TranscriptSegment[],
  language?: string
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const lineHeight = 7;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  const isBilingual = originalSegments && originalSegments.length > 0 && language !== 'Original';

  // Helper function to add text with proper Unicode handling
  const addText = (
    text: string,
    x: number,
    y: number,
    options: { maxWidth?: number; align?: 'left' | 'center' | 'right' } = {}
  ) => {
    const textWidth = options.maxWidth || maxWidth;
    // Split text to handle line breaks properly
    const lines = pdf.splitTextToSize(text, textWidth);

    lines.forEach((line: string, index: number) => {
      if (y + index * lineHeight > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, x, y + index * lineHeight, {
        align: options.align || 'left',
        maxWidth: textWidth,
      });
    });

    return y + lines.length * lineHeight;
  };

  // Title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  yPosition = addText(title, margin, yPosition);
  yPosition += lineHeight;

  // Metadata
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(128, 128, 128);
  const dateText = `Generated on ${new Date().toLocaleDateString()}`;
  yPosition = addText(dateText, margin, yPosition);

  if (isBilingual) {
    yPosition = addText(`Bilingual: ${language} with Original`, margin, yPosition);
  }
  yPosition += lineHeight * 1.5;

  // Reset color for content
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(11);

  // Process segments
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    // Check if we need a new page
    if (yPosition > pageHeight - margin - 40) {
      pdf.addPage();
      yPosition = margin;
    }

    // Timestamp and speaker
    const timestamp = `[${formatTime(segment.start)}]`;
    const speaker = segment.speaker ? ` ${segment.speaker}:` : '';
    const header = timestamp + speaker;

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    yPosition = addText(header, margin, yPosition);
    yPosition += lineHeight * 0.3;

    // Translated text label (if bilingual)
    if (isBilingual) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(37, 99, 235); // Blue
      yPosition = addText(`[${language}]`, margin, yPosition);
      pdf.setFontSize(11);
    }

    // Main text content
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    yPosition = addText(segment.text, margin, yPosition);
    yPosition += lineHeight * 0.5;

    // Original text (if bilingual)
    if (isBilingual && originalSegments[i]) {
      if (yPosition > pageHeight - margin - 30) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100); // Gray
      yPosition = addText('[Original]', margin, yPosition);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      yPosition = addText(originalSegments[i].text, margin, yPosition);

      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
    }

    yPosition += lineHeight;
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
