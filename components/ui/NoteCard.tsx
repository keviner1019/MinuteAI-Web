import { Note } from '@/types';
import { Clock, FileAudio, CheckCircle } from 'lucide-react';
import { formatFileSize, formatDuration, formatTimestamp } from '@/utils/helpers';

interface NoteCardProps {
  note: Note;
  onClick?: () => void;
}

export default function NoteCard({ note, onClick }: NoteCardProps) {
  return (
    <div onClick={onClick} className="card cursor-pointer">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileAudio className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <h3 className="text-base font-semibold text-gray-900 truncate">{note.title}</h3>
        </div>
        {/* Show completed indicator if transcript exists */}
        {note.transcript && (
          <div className="flex items-center gap-1 text-green-600 text-xs">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">Complete</span>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="text-xs text-gray-600 mb-3 flex items-center gap-2">
        <span>{formatTimestamp(note.createdAt)}</span>
        <span>•</span>
        {note.duration && (
          <>
            <span>{formatDuration(note.duration)}</span>
            <span>•</span>
          </>
        )}
        <span>{formatFileSize(note.fileSize)}</span>
      </div>

      {/* Summary Preview */}
      {note.summary && <p className="text-sm text-gray-700 mb-3 line-clamp-2">{note.summary}</p>}

      {/* Key Topics */}
      {note.keyTopics && note.keyTopics.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {note.keyTopics.slice(0, 3).map((topic, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-violet-50 text-violet-700 text-xs rounded-full font-medium"
            >
              #{topic}
            </span>
          ))}
          {note.keyTopics.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              +{note.keyTopics.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Action Items */}
      {note.actionItems && note.actionItems.length > 0 && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">✓ Completed</span>
          <span className="mx-2">·</span>
          <span>
            📋 {note.actionItems.length} action{note.actionItems.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
