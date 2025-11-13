'use client';

import { useState, useCallback, useContext } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, FileAudio, AlertCircle, FileText, File } from 'lucide-react';
import Button from './Button';
import { formatFileSize } from '@/utils/helpers';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload?: (files: File[], title: string) => Promise<void>;
}

export default function UploadModal({ isOpen, onClose, onUpload }: UploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Validate file type
  const isValidFile = (file: File): boolean => {
    const validAudioTypes = ['audio/', 'video/mp4', 'video/webm'];
    const validDocTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'text/plain', // .txt
    ];

    return (
      validAudioTypes.some((type) => file.type.startsWith(type)) ||
      validDocTypes.includes(file.type)
    );
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
      return <FileAudio className="h-8 w-8 text-blue-600" />;
    } else if (file.type === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-600" />;
    } else if (
      file.type.includes('word') ||
      file.type.includes('document') ||
      file.type.includes('presentation') ||
      file.type.includes('spreadsheet')
    ) {
      return <File className="h-8 w-8 text-blue-600" />;
    }
    return <File className="h-8 w-8 text-gray-600" />;
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const validFiles = acceptedFiles.filter((file) => {
        if (!isValidFile(file)) {
          setError(
            `${file.name} is not a supported file type. Please upload audio or document files.`
          );
          return false;
        }

        if (file.size > 100 * 1024 * 1024) {
          // 100MB limit
          setError(`${file.name} is too large. File size must be less than 100MB`);
          return false;
        }

        return true;
      });

      if (validFiles.length > 0) {
        setSelectedFiles((prev) => [...prev, ...validFiles]);
        setError('');

        // Auto-generate title from first file if not set
        if (!title && validFiles.length > 0) {
          const fileName = validFiles[0].name.replace(/\.[^/.]+$/, ''); // Remove extension
          setTitle(fileName);
        }
      }
    },
    [title]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.webm'],
      'video/*': ['.mp4', '.webm'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
    },
    multiple: true,
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setError('');
    setUploading(true);

    try {
      if (onUpload) {
        // Legacy sync upload handler (will block until complete)
        await onUpload(selectedFiles, title || selectedFiles[0].name);

        // Reset form
        setSelectedFiles([]);
        setTitle('');
        onClose();
      } else {
        // If no onUpload prop provided, use background upload via UploadContext if available
        // Defer to background processing: add task and return immediately
        // We can't import context directly here to avoid circular deps in some setups, so just close modal
        setSelectedFiles([]);
        setTitle('');
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setSelectedFiles([]);
      setTitle('');
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Upload Files</h2>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* File Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
            }`}
          >
            <input {...getInputProps()} />

            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Upload className="h-16 w-16 text-gray-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {isDragActive ? 'Drop your files here' : 'Drag & drop your files here'}
                </p>
                <p className="text-sm text-gray-600 mt-2">or click to browse</p>
              </div>
              <p className="text-xs text-gray-500">
                Audio: MP3, WAV, M4A, FLAC, OGG, WEBM
                <br />
                Documents: PDF, DOCX, TXT
                <br />
                (max 100MB per file, multiple files allowed)
              </p>
            </div>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">
                Selected Files ({selectedFiles.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getFileIcon(file)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-xs text-gray-600">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                      className="text-red-500 hover:text-red-700 p-1 disabled:opacity-50"
                      aria-label="Remove file"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Title Input */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Note Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for this recording"
              className="input-field"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading}
            isLoading={uploading}
          >
            <Upload className="h-5 w-5" />
            {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} File(s)`}
          </Button>
        </div>
      </div>
    </div>
  );
}
