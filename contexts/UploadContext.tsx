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
  retryCount?: number;
}

interface UploadContextType {
  tasks: UploadTask[];
  startUpload: (
    files: File[],
    title: string,
    userId: string,
    onComplete?: () => void,
    generateTodos?: boolean
  ) => Promise<void>;
  retryUpload: (taskId: string) => Promise<void>;
  clearTask: (taskId: string) => void;
  clearAllCompleted: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [pendingRetries, setPendingRetries] = useState<
    Map<string, { files: File[]; title: string; userId: string; onComplete?: () => void; generateTodos?: boolean }>
  >(new Map());

  const updateTask = useCallback((taskId: string, updates: Partial<UploadTask>) => {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task)));
  }, []);

  const addTask = useCallback((task: UploadTask) => {
    setTasks((prev) => [...prev, task]);
  }, []);

  const clearTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    setPendingRetries((prev) => {
      const newMap = new Map(prev);
      newMap.delete(taskId);
      return newMap;
    });
  }, []);

  const clearAllCompleted = useCallback(() => {
    setTasks((prev) => prev.filter((task) => task.status !== 'completed'));
  }, []);

  const processFiles = async (
    files: File[],
    title: string,
    taskId: string,
    userId: string,
    onComplete?: () => void,
    generateTodos: boolean = true
  ): Promise<void> => {
    let noteId: string | null = null;

    try {
      // Step 1: Upload all files to storage
      updateTask(taskId, { status: 'uploading', progress: `Uploading ${files.length} file(s)...` });
      
      const uploadResults = await Promise.all(
        files.map((file) => uploadAudioFile(file, userId))
      );

      // Step 2: Create a single note with all file metadata
      updateTask(taskId, { status: 'processing', progress: 'Creating note...' });
      
      // Combine file metadata
      const fileNames = files.map(f => f.name).join(', ');
      const totalSize = files.reduce((acc, f) => acc + f.size, 0);
      const fileTypes = [...new Set(files.map(f => f.type))].join(', ');
      
      const newNote = await createNote({
        userId,
        title,
        fileName: fileNames,
        fileSize: totalSize,
        fileType: fileTypes,
        storageUrl: uploadResults[0], // Primary file URL
      });

      noteId = newNote.id;
      updateTask(taskId, { noteId: newNote.id });

      // Step 3: Process all files and combine their content
      updateTask(taskId, { progress: 'Processing files...' });
      
      const transcripts: string[] = [];
      const contents: string[] = [];
      let allFilesType = 'unknown';

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageUrl = uploadResults[i];
        
        updateTask(taskId, { progress: `Processing file ${i + 1} of ${files.length}...` });

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

        if (isAudio) {
          allFilesType = 'audio';
          // Transcribe audio - DO NOT trigger AI analysis yet
          const transcribeResponse = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              noteId: newNote.id, 
              audioUrl: storageUrl,
              skipAIAnalysis: true // Skip individual AI analysis
            }),
          });

          if (!transcribeResponse.ok) {
            const errorData = await transcribeResponse.json();
            throw new Error(errorData.error || 'Transcription failed');
          }

          const transcriptData = await transcribeResponse.json();
          transcripts.push(`\n\n=== File: ${file.name} ===\n${transcriptData.transcript}`);
        } else if (isDocument) {
          allFilesType = 'document';
          // Process document - extract content only, no AI analysis
          const processDocResponse = await fetch('/api/process-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              noteId: newNote.id,
              fileUrl: storageUrl,
              fileType: file.type,
              fileName: file.name,
              skipAIAnalysis: true // Skip individual AI analysis
            }),
          });

          if (!processDocResponse.ok) {
            const errorData = await processDocResponse.json();
            throw new Error(errorData.error || 'Document processing failed');
          }

          const docData = await processDocResponse.json();
          contents.push(`\n\n=== File: ${file.name} ===\n${docData.content}`);
        }
      }

      // Step 4: Combine ALL content and run ONE AI analysis
      const combinedContent = [...transcripts, ...contents].join('\n\n');
      
      if (combinedContent) {
        updateTask(taskId, { progress: 'Generating AI analysis from all files...' });
        
        // BATCHED AI ANALYSIS - Only ONE call for all files combined
        const analyzeResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            noteId: newNote.id,
            transcript: combinedContent,
            fileType: allFilesType,
            fileCount: files.length,
            generateTodos, // Pass the option to API
          }),
        });

        if (!analyzeResponse.ok) {
          const errorData = await analyzeResponse.json();
          throw new Error(errorData.error || 'AI analysis failed');
        }
      }

      // Mark as completed with notification flag
      updateTask(taskId, {
        status: 'completed',
        progress: `✓ ${files.length} file(s) processed successfully!`,
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
      console.error(`Error processing files:`, error);

      // If a note was created but processing failed, delete it to avoid showing incomplete notes
      if (noteId) {
        try {
          const { deleteNote } = await import('@/lib/supabase/database');
          await deleteNote(noteId);
          console.log(`Deleted incomplete note ${noteId}`);
        } catch (deleteError) {
          console.error('Failed to delete incomplete note:', deleteError);
        }
      }

      // Create user-friendly error messages
      let userFriendlyError = 'Processing failed';
      let canRetry = true;

      if (
        error.message?.includes('429') ||
        error.message?.includes('Too Many Requests') ||
        error.message?.includes('Resource exhausted') ||
        error.message?.includes('rate limit')
      ) {
        userFriendlyError = 'AI service rate limit reached. Retrying automatically...';
        canRetry = true;
      } else if (
        error.message?.includes('503') ||
        error.message?.includes('overloaded') ||
        error.message?.includes('Service Unavailable')
      ) {
        userFriendlyError = 'AI service is currently busy. Please retry in a moment.';
        canRetry = true;
      } else if (error.message?.includes('Transcription failed')) {
        userFriendlyError = 'Audio transcription failed. Please check the audio quality.';
        canRetry = true;
      } else if (error.message?.includes('Document processing failed')) {
        userFriendlyError = 'Could not process document. Please check the file format.';
        canRetry = true;
      } else if (error.message?.includes('AI analysis failed')) {
        userFriendlyError = 'AI analysis failed. Please try again.';
        canRetry = true;
      } else {
        userFriendlyError = error.message || 'An unexpected error occurred';
      }

      const retryCount = tasks.find((t) => t.id === taskId)?.retryCount || 0;
      updateTask(taskId, {
        status: 'error',
        progress: '✗ ' + userFriendlyError,
        error: canRetry ? 'Click retry to try again' : userFriendlyError,
        retryCount,
      });

      // Auto-remove failed upload after 10 seconds (user can still retry before then)
      setTimeout(() => {
        clearTask(taskId);
      }, 10000);
    }
  };

  const retryUpload = useCallback(
    async (taskId: string) => {
      const retryInfo = pendingRetries.get(taskId);
      if (!retryInfo) {
        console.error('No retry info found for task:', taskId);
        return;
      }

      const { files, title, userId, onComplete, generateTodos = true } = retryInfo;
      const currentTask = tasks.find((t) => t.id === taskId);
      const retryCount = (currentTask?.retryCount || 0) + 1;

      // Update task to show retrying
      updateTask(taskId, {
        status: 'uploading',
        progress: `Retrying (${retryCount})...`,
        error: undefined,
        retryCount,
      });

      // Process the files again
      await processFiles(files, title, taskId, userId, onComplete, generateTodos);
    },
    [pendingRetries, tasks, updateTask]
  );

  const startUpload = useCallback(
    async (files: File[], title: string, userId: string, onComplete?: () => void, generateTodos: boolean = true) => {
      // Create a single task for all files
      const taskId = `${Date.now()}`;
      const taskFileName = files.length > 1 
        ? `${title} (${files.length} files)` 
        : title;
      
      const newTask: UploadTask = {
        id: taskId,
        fileName: taskFileName,
        status: 'uploading',
        progress: 'Initializing...',
        retryCount: 0,
      };

      // Add task
      addTask(newTask);

      // Store retry info
      setPendingRetries((prev) => {
        const newMap = new Map(prev);
        newMap.set(taskId, { files, title, userId, onComplete, generateTodos });
        return newMap;
      });

      // Start processing files in background
      void processFiles(files, title, taskId, userId, onComplete, generateTodos);
    },
    [addTask]
  );

  return (
    <UploadContext.Provider
      value={{ tasks, startUpload, retryUpload, clearTask, clearAllCompleted }}
    >
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
