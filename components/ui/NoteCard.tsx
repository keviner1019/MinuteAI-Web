import { Note } from '@/types';
import { Clock, FileAudio, CheckCircle, Sparkles, TrendingUp, Zap, Users, UserPlus } from 'lucide-react';
import { formatFileSize, formatDuration, formatTimestamp } from '@/utils/helpers';

interface NoteCardProps {
  note: Note & {
    isSharedWithMe?: boolean;
    ownerName?: string;
    collaboratorRole?: 'editor' | 'viewer';
  };
  onClick?: () => void;
}

export default function NoteCard({ note, onClick }: NoteCardProps) {
  const hasTranscript = !!note.transcript;
  const hasActionItems = note.actionItems && note.actionItems.length > 0;
  const completedActions = note.actionItems?.filter(item => item.completed).length || 0;
  const totalActions = note.actionItems?.length || 0;

  return (
    <div
      onClick={onClick}
      className="group relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:border-purple-300"
    >
      {/* Animated Gradient Overlay on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Status Badge - Only show if Processing */}
      {!hasTranscript && (
        <div className="absolute top-4 right-4 z-10">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-400 to-amber-500 text-white text-xs font-bold rounded-full shadow-lg">
            <Clock className="h-3 w-3 animate-spin" />
            Processing
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 p-3 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl group-hover:from-blue-200 group-hover:to-purple-200 transition-colors">
            <FileAudio className="h-6 w-6 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-purple-600 transition-colors">
                {note.title}
              </h3>
              {note.isSharedWithMe ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                  <UserPlus className="h-3 w-3" />
                  Shared with you
                </span>
              ) : note.isShared && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                  <Users className="h-3 w-3" />
                  Shared
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
              <Clock className="h-3 w-3" />
              <span>{formatTimestamp(note.createdAt)}</span>
              {note.isSharedWithMe && note.ownerName && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">by {note.ownerName}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Metadata Bar */}
        <div className="flex items-center gap-3 mb-4 text-xs font-semibold text-gray-600">
          {note.duration && (
            <div className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <Clock className="h-3 w-3" />
              {formatDuration(note.duration)}
            </div>
          )}
          <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg">
            {formatFileSize(note.fileSize)}
          </div>
        </div>

        {/* Summary Preview */}
        {note.summary && (
          <p className="text-sm text-gray-700 mb-4 line-clamp-3 leading-relaxed">
            {note.summary}
          </p>
        )}

        {/* Key Topics */}
        {note.keyTopics && note.keyTopics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {note.keyTopics.slice(0, 3).map((topic, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 text-xs rounded-full font-bold hover:from-violet-200 hover:to-purple-200 transition-colors"
              >
                <Sparkles className="h-3 w-3" />
                {topic}
              </span>
            ))}
            {note.keyTopics.length > 3 && (
              <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-bold">
                +{note.keyTopics.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Action Items Progress */}
        {hasActionItems && (
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <Zap className="h-3 w-3 text-purple-600" />
                Action Items
              </span>
              <span className="text-xs font-bold text-gray-900">
                {completedActions}/{totalActions}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${totalActions > 0 ? (completedActions / totalActions) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Hover Indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
      </div>
    </div>
  );
}
