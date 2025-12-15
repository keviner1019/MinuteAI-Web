'use client';

import { useState } from 'react';
import { Copy, Check, Hash, Link as LinkIcon, UserPlus, Users } from 'lucide-react';
import Badge from './Badge';

interface MeetingCardProps {
  meeting: any;
  onJoin: (roomId: string) => void;
  onViewSummary?: (roomId: string) => void;
}

export function MeetingCard({ meeting, onJoin, onViewSummary }: MeetingCardProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const copyMeetingCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyMeetingLink = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    const link = `${window.location.origin}/meeting/${roomId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getStatusVariant = (status: string): 'completed' | 'processing' | 'scheduled' => {
    if (status === 'active' || status === 'ended') return 'completed';
    if (status === 'processing') return 'processing';
    return 'scheduled';
  };

  const handleCardClick = () => {
    // If meeting has ended, go to summary; otherwise go to meeting room
    if (meeting.status === 'ended' && onViewSummary) {
      onViewSummary(meeting.room_id);
    } else {
      onJoin(meeting.room_id);
    }
  };

  return (
    <div className="card cursor-pointer" onClick={handleCardClick}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">{meeting.title}</h3>
              {meeting.isInvited && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                  <UserPlus size={10} /> Invited
                </span>
              )}
              {meeting.isParticipant && !meeting.isInvited && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  <Users size={10} /> Participant
                </span>
              )}
            </div>
            <Badge variant={getStatusVariant(meeting.status)}>{meeting.status}</Badge>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
            <span>📅 {new Date(meeting.scheduled_at || meeting.created_at).toLocaleDateString()}</span>
            <span>•</span>
            <span>{new Date(meeting.scheduled_at || meeting.created_at).toLocaleTimeString()}</span>
            {meeting.duration && (
              <>
                <span>•</span>
                <span>⏱️ {Math.floor(meeting.duration / 60)} min</span>
              </>
            )}
          </div>

          {/* Meeting Code and Link */}
          {meeting.status !== 'ended' && (
            <div className="space-y-2 bg-gray-50 rounded-lg p-3">
              {meeting.meeting_code && (
                <div className="flex items-center gap-2">
                  <Hash size={14} className="text-gray-400" />
                  <span className="text-xs font-mono text-gray-900 font-semibold flex-1">
                    {meeting.meeting_code}
                  </span>
                  <button
                    onClick={(e) => copyMeetingCode(e, meeting.meeting_code)}
                    className="p-1.5 rounded hover:bg-gray-200 text-blue-600 transition"
                    title="Copy code"
                  >
                    {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  {copiedCode && <span className="text-xs text-green-600 font-medium">✓</span>}
                </div>
              )}
              <div className="flex items-center gap-2">
                <LinkIcon size={14} className="text-gray-400" />
                <span className="text-xs text-gray-600 truncate flex-1">
                  {typeof window !== 'undefined'
                    ? `${window.location.origin}/meeting/${meeting.room_id}`
                    : `/meeting/${meeting.room_id}`}
                </span>
                <button
                  onClick={(e) => copyMeetingLink(e, meeting.room_id)}
                  className="p-1.5 rounded hover:bg-gray-200 text-blue-600 transition"
                  title="Copy link"
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                </button>
                {copiedLink && <span className="text-xs text-green-600 font-medium">✓</span>}
              </div>
            </div>
          )}

          {meeting.status === 'ended' && onViewSummary && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewSummary(meeting.room_id);
              }}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2"
            >
              View Summary →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
