'use client';

import React, { useState } from 'react';
import { Download, FileText, FileType, FileImage, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { TranscriptSegment } from '@/types';
import { exportToTXT, exportToSRT, exportToPDF, exportToDOCX } from '@/utils/transcriptExporter';

interface TranscriptExportProps {
  segments: TranscriptSegment[];
  title: string;
  language?: string;
}

type ExportFormat = 'txt' | 'srt' | 'pdf' | 'docx';

interface ExportOption {
  format: ExportFormat;
  label: string;
  description: string;
  icon: React.ElementType;
}

const exportOptions: ExportOption[] = [
  {
    format: 'txt',
    label: 'Plain Text',
    description: 'Simple text file with timestamps',
    icon: FileText,
  },
  {
    format: 'srt',
    label: 'SRT Subtitles',
    description: 'Subtitle format for video players',
    icon: FileType,
  },
  {
    format: 'pdf',
    label: 'PDF Document',
    description: 'Formatted PDF with styling',
    icon: FileImage,
  },
  {
    format: 'docx',
    label: 'Word Document',
    description: 'Editable Microsoft Word file',
    icon: FileText,
  },
];

export default function TranscriptExport({ segments, title, language = 'Original' }: TranscriptExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  // Add language info to title if translated
  const exportTitle = language !== 'Original' ? `${title} (${language})` : title;

  const handleExport = async (format: ExportFormat) => {
    if (segments.length === 0) {
      alert('No transcript segments available to export');
      return;
    }

    setExporting(format);

    try {
      switch (format) {
        case 'txt':
          await exportToTXT(segments, exportTitle);
          break;
        case 'srt':
          await exportToSRT(segments, exportTitle);
          break;
        case 'pdf':
          await exportToPDF(segments, exportTitle);
          break;
        case 'docx':
          await exportToDOCX(segments, exportTitle);
          break;
      }

      // Close dropdown after successful export
      setTimeout(() => setIsOpen(false), 500);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export transcript. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="relative">
      {/* Export Button */}
      <Button
        variant="secondary"
        onClick={() => setIsOpen(!isOpen)}
        disabled={segments.length === 0}
      >
        <Download className="h-4 w-4" />
        Export Transcript
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Menu */}
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
            <div className="p-2 border-b border-gray-200 bg-gray-50">
              <p className="text-xs font-medium text-gray-700">Export Format</p>
            </div>

            <div className="p-1">
              {exportOptions.map((option) => {
                const Icon = option.icon;
                const isExporting = exporting === option.format;

                return (
                  <button
                    key={option.format}
                    onClick={() => handleExport(option.format)}
                    disabled={isExporting}
                    className="w-full flex items-start gap-3 p-3 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {isExporting ? (
                        <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                      ) : (
                        <Icon className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{option.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-2 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500">
                💡 All exports are generated locally in your browser
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
