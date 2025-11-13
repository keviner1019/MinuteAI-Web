'use client';

import React from 'react';
import { useUpload } from '@/contexts/UploadContext';
import { X, CheckCircle, Loader2 } from 'lucide-react';
import Button from './Button';

export default function UploadTasksPanel() {
  const { tasks, clearTask, clearAllCompleted } = useUpload();

  if (!tasks || tasks.length === 0) return null;

  return (
    <div className="mt-2 bg-gray-50 border border-gray-200 rounded-md p-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-gray-700">Upload Tasks</div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => clearAllCompleted()}>
            Clear Completed
          </Button>
        </div>
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center justify-between gap-3 p-2 bg-white rounded-md border">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {task.status === 'completed' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : task.status === 'error' ? (
                  <X className="h-4 w-4 text-red-600" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                )}
                <p className="text-sm font-medium text-gray-800 truncate">{task.fileName}</p>
              </div>
              <p className="text-xs text-gray-600 mt-1">{task.progress}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => clearTask(task.id)}>
                Dismiss
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
