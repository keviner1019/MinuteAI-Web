'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, FileAudio, AlertCircle } from 'lucide-react';
import Button from './Button';
import { isValidAudioFile, formatFileSize } from '@/utils/helpers';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, title: string) => Promise<void>;
}

export default function UploadModal({ isOpen, onClose, onUpload }: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];

      if (file) {
        if (!isValidAudioFile(file)) {
          setError('Please upload a valid audio file (MP3, WAV, M4A, FLAC, OGG, WEBM)');
          return;
        }

        if (file.size > 100 * 1024 * 1024) {
          // 100MB limit
          setError('File size must be less than 100MB');
          return;
        }

        setSelectedFile(file);
        setError('');

        // Auto-generate title from filename
        if (!title) {
          const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
          setTitle(fileName);
        }
      }
    },
    [title]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.webm', '.mp4'],
    },
    multiple: false,
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    setError('');
    setUploading(true);

    try {
      await onUpload(selectedFile, title || selectedFile.name);

      // Reset form
      setSelectedFile(null);
      setTitle('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setSelectedFile(null);
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
          <h2 className="text-2xl font-bold text-gray-900">Upload Audio File</h2>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
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

            {selectedFile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <FileAudio className="h-16 w-16 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-600">{formatFileSize(selectedFile.size)}</p>
                </div>
                <p className="text-sm text-gray-600">Click or drag to replace</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <Upload className="h-16 w-16 text-gray-400" />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    {isDragActive
                      ? 'Drop your audio file here'
                      : 'Drag & drop your audio file here'}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">or click to browse</p>
                </div>
                <p className="text-xs text-gray-500">
                  Supports: MP3, WAV, M4A, FLAC, OGG, WEBM (max 100MB)
                </p>
              </div>
            )}
          </div>

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
            disabled={!selectedFile || uploading}
            isLoading={uploading}
          >
            <Upload className="h-5 w-5" />
            {uploading ? 'Uploading...' : 'Upload & Process'}
          </Button>
        </div>
      </div>
    </div>
  );
}
