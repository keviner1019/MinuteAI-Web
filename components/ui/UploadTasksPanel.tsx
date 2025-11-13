'use client';

import React from 'react';
import { useUpload } from '@/contexts/UploadContext';
import { X, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import Button from './Button';

export default function UploadTasksPanel() {
  const { tasks, clearTask, clearAllCompleted } = useUpload();

  if (!tasks || tasks.length === 0) return null;

  const activeTasks = tasks.filter((t) => t.status === 'uploading' || t.status === 'processing');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const errorTasks = tasks.filter((t) => t.status === 'error');

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">Upload Tasks</h3>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {tasks.length}
            </span>
          </div>
          {completedTasks.length > 0 && (
            <Button
              variant="ghost"
              onClick={clearAllCompleted}
              className="text-xs py-1 px-2 h-auto"
            >
              Clear Completed
            </Button>
          )}
        </div>

        {/* Tasks List */}
        <div className="max-h-[400px] overflow-y-auto">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
            >
              {/* Status Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {task.status === 'completed' ? (
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                ) : task.status === 'error' ? (
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  </div>
                )}
              </div>

              {/* Task Details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{task.fileName}</p>
                <p
                  className={`text-xs mt-1 ${
                    task.status === 'completed'
                      ? 'text-green-600'
                      : task.status === 'error'
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`}
                >
                  {task.progress}
                </p>
                {task.error && (
                  <p className="text-xs text-red-600 mt-1 line-clamp-2">{task.error}</p>
                )}
              </div>

              {/* Dismiss Button */}
              <button
                onClick={() => clearTask(task.id)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1"
                aria-label="Dismiss task"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Summary Footer */}
        {tasks.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
            {activeTasks.length > 0 && (
              <span className="mr-3">⏳ {activeTasks.length} in progress</span>
            )}
            {completedTasks.length > 0 && (
              <span className="mr-3 text-green-600">✓ {completedTasks.length} completed</span>
            )}
            {errorTasks.length > 0 && (
              <span className="text-red-600">✗ {errorTasks.length} failed</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
