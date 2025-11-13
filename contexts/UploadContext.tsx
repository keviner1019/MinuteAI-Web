'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { uploadAudioFile } from '@/lib/supabase/storage';
import { createNote } from '@/lib/supabase/database';

export interface UploadTask {
  id: string;
  fileName: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: string;
  noteId?: string;
  error?: string;
  showNotification?: boolean;
}

interface UploadContextType {
  tasks: UploadTask[];
  startUpload: (
    files: File[],
    title: string,
    userId: string,
    onComplete?: () => void
  ) => Promise<void>;
  clearTask: (taskId: string) => void;
  clearAllCompleted: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);

  const updateTask = useCallback((taskId: string, updates: Partial<UploadTask>) => {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task)));
  }, []);

  const addTask = useCallback((task: UploadTask) => {
    setTasks((prev) => [...prev, task]);
  }, []);

  const clearTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  }, []);

  const clearAllCompleted = useCallback(() => {
    setTasks((prev) => prev.filter((task) => task.status !== 'completed'));
  }, []);

  const processFile = async (
    file: File,
    fileTitle: string,
    taskId: string,
    userId: string,
    onComplete?: () => void
  ): Promise<void> => {
    try {
      // Step 1: Upload file to storage
      updateTask(taskId, { status: 'uploading', progress: 'Uploading file...' });
      const storageUrl = await uploadAudioFile(file, userId);

      // Step 2: Create note in database
      updateTask(taskId, { status: 'processing', progress: 'Creating note...' });
      const newNote = await createNote({
        userId,
        title: fileTitle,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        storageUrl,
      });

      updateTask(taskId, { noteId: newNote.id });

      // Step 3: Process based on file type
      const isAudio = file.type.startsWith('audio/') || file.type.startsWith('video/');
      const isDocument =
        file.type.includes('pdf') ||
        file.type.includes('document') ||
        file.type.includes('word') ||
        file.type.includes('presentation') ||
        file.type.includes('powerpoint') ||
        file.type.includes('spreadsheet') ||
        file.type.includes('excel') ||
        file.type.includes('text/plain');

      let transcript = '';

      if (isAudio) {
        // Transcribe audio
        updateTask(taskId, { progress: 'Transcribing audio...' });
        const transcribeResponse = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ noteId: newNote.id, audioUrl: storageUrl }),
        });

        if (!transcribeResponse.ok) {
          throw new Error('Transcription failed');
        }

        const transcriptData = await transcribeResponse.json();
        transcript = transcriptData.transcript;
      } else if (isDocument) {
        // Process document
        updateTask(taskId, { progress: 'Extracting content...' });
        const processDocResponse = await fetch('/api/process-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            noteId: newNote.id,
            fileUrl: storageUrl,
            fileType: file.type,
            fileName: file.name,
          }),
        });

        if (!processDocResponse.ok) {
          throw new Error('Document processing failed');
        }

        const docData = await processDocResponse.json();
        transcript = docData.content;
      }

      // Step 4: Generate AI analysis
      if (transcript) {
        updateTask(taskId, { progress: 'Generating AI analysis...' });
        const analyzeResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            noteId: newNote.id,
            transcript,
            fileType: file.type,
          }),
        });

        if (!analyzeResponse.ok) {
          throw new Error('AI analysis failed');
        }
      }

      // Mark as completed with notification flag
      updateTask(taskId, {
        status: 'completed',
        progress: '✓ Processing complete!',
        showNotification: true,
      });

      // Call the onComplete callback to refresh notes
      if (onComplete) {
        setTimeout(() => {
          onComplete();
        }, 500);
      }

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        clearTask(taskId);
      }, 5000);
    } catch (error: any) {
      console.error(`Error processing file ${file.name}:`, error);
      updateTask(taskId, {
        status: 'error',
        progress: '✗ Processing failed',
        error: error.message || 'Unknown error',
      });
    }
  };

  const startUpload = useCallback(
    async (files: File[], title: string, userId: string, onComplete?: () => void) => {
      // Create tasks for all files
      const newTasks = files.map((file, index) => ({
        id: `${Date.now()}-${index}`,
        fileName: files.length > 1 ? `${title} (${index + 1})` : title,
        status: 'uploading' as const,
        progress: 'Initializing...',
      }));

      // Add all tasks at once
      newTasks.forEach((task) => addTask(task));

      // Start processing files in background without awaiting completion
      newTasks.forEach((task, index) => {
        const fileTitle = files.length > 1 ? `${title} (${index + 1})` : title;
        // fire-and-forget
        void processFile(files[index], fileTitle, task.id, userId, onComplete);
      });
    },
    [addTask, updateTask]
  );

  return (
    <UploadContext.Provider value={{ tasks, startUpload, clearTask, clearAllCompleted }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}
