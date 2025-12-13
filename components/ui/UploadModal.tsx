'use client';

import { useState, useCallback, useContext } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, FileAudio, AlertCircle, FileText, File } from 'lucide-react';
import Button from './Button';
import { formatFileSize } from '@/utils/helpers';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload?: (files: File[], title: string, generateTodos?: boolean) => Promise<void>;
}

export default function UploadModal({ isOpen, onClose, onUpload }: UploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [generateTodos, setGenerateTodos] = useState(true); // Default to true
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
        // Check if user is trying to add multiple audio files
        const newAudioFiles = validFiles.filter(f => f.type.startsWith('audio/') || f.type.startsWith('video/'));
        const existingAudioFiles = selectedFiles.filter(f => f.type.startsWith('audio/') || f.type.startsWith('video/'));
        
        if (existingAudioFiles.length > 0 && newAudioFiles.length > 0) {
          setError('Only one audio/video file is allowed per note. Please remove the existing audio file first.');
          return;
        }
        
        if (newAudioFiles.length > 1) {
          setError('Only one audio/video file is allowed per note. Please select only one audio file.');
          return;
        }

        setSelectedFiles((prev) => [...prev, ...validFiles]);
        setError('');

        // Auto-generate title from first file if not set
        if (!title && validFiles.length > 0) {
          const fileName = validFiles[0].name.replace(/\.[^/.]+$/, ''); // Remove extension
          setTitle(fileName);
        }
      }
    },
    [title, selectedFiles]
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
        // Pass generateTodos option to upload handler
        await onUpload(selectedFiles, title || selectedFiles[0].name, generateTodos);

        // Reset form
        setSelectedFiles([]);
        setTitle('');
        setGenerateTodos(true); // Reset to default
        onClose();
      } else {
        setSelectedFiles([]);
        setTitle('');
        setGenerateTodos(true);
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
      setGenerateTodos(true);
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Upload Files
          </h2>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 hover:rotate-90 transition-transform duration-200"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium animate-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* File Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
              isDragActive 
                ? 'border-blue-500 bg-blue-50 scale-105' 
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />

            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Upload className={`h-16 w-16 transition-colors ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {isDragActive ? 'Drop your files here' : 'Drag & drop your files here'}
                </p>
                <p className="text-sm text-gray-600 mt-2 font-medium">or click to browse</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-700 font-medium">
                  📁 Audio: MP3, WAV, M4A, FLAC, OGG, WEBM
                  <br />
                  📄 Documents: PDF, DOCX, TXT
                  <br />
                  <span className="text-blue-600">✨ Multi-file upload supported</span>
                  <br />
                  <span className="text-orange-600 font-bold">⚠️ Only ONE audio/video file allowed per note</span>
                  <br />
                  (max 100MB per file)
                </p>
              </div>
            </div>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3 animate-in slide-in-from-bottom-2">
              <h3 className="text-sm font-bold text-gray-900">
                Selected Files ({selectedFiles.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getFileIcon(file)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{file.name}</p>
                        <p className="text-xs text-gray-600 font-medium">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all disabled:opacity-50"
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
            <label htmlFor="title" className="block text-sm font-bold text-gray-900 mb-2">
              Note Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={selectedFiles.length > 1 ? "Combined Analysis" : "Enter a title for this note"}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-gray-900"
            />
          </div>

          {/* Generate Todos Checkbox */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={generateTodos}
                onChange={(e) => setGenerateTodos(e.target.checked)}
                className="mt-1 h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">
                    Generate Action Items (Todos)
                  </span>
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                    AI
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1 font-medium">
                  AI will analyze your files and extract actionable tasks with priorities, assignees, and deadlines
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
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
