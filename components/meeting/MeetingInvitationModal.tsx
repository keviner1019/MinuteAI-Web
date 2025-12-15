'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Video, Calendar, Clock, User, Check, XCircle } from 'lucide-react';

interface MeetingInvitation {
  id: string;
  meetingId: string;
  roomId: string;
  meetingTitle: string;
  scheduledAt: string | null;
  invitedBy: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  isInstant: boolean;
  timestamp: string;
}

interface MeetingInvitationModalProps {
  invitation: MeetingInvitation;
  onAccept: (invitation: MeetingInvitation) => void;
  onDecline: (invitation: MeetingInvitation) => void;
  onClose: () => void;
}

export default function MeetingInvitationModal({
  invitation,
  onAccept,
  onDecline,
  onClose,
}: MeetingInvitationModalProps) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // For instant meetings, auto-decline after 60 seconds if no response
  useEffect(() => {
    if (invitation.isInstant) {
      const expiryTime = new Date(invitation.timestamp).getTime() + 60000; // 60 seconds

      const updateTimer = () => {
        const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
        setTimeLeft(remaining);

        if (remaining <= 0) {
          onDecline(invitation);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);

      return () => clearInterval(interval);
    }
  }, [invitation, onDecline]);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      onAccept(invitation);
      // Navigate to meeting room for instant meetings
      if (invitation.isInstant) {
        router.push(`/meeting/${invitation.roomId}`);
      }
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      onDecline(invitation);
    } finally {
      setIsDeclining(false);
    }
  };

  const formatScheduledTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-2xl px-6 py-5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {invitation.isInstant ? 'Incoming Call' : 'Meeting Invitation'}
              </h2>
              <p className="text-white/80 text-sm">
                {invitation.isInstant ? 'Someone wants to meet now' : 'You\'ve been invited'}
              </p>
            </div>
          </div>

          {/* Timer for instant meetings */}
          {invitation.isInstant && timeLeft !== null && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
              <div
                className="h-full bg-white transition-all duration-1000 ease-linear"
                style={{ width: `${(timeLeft / 60) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Inviter info */}
          <div className="flex items-center gap-4 mb-6">
            {invitation.invitedBy.avatarUrl ? (
              <img
                src={invitation.invitedBy.avatarUrl}
                alt={invitation.invitedBy.displayName}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-purple-100"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-lg font-semibold ring-2 ring-purple-100">
                {getInitials(invitation.invitedBy.displayName)}
              </div>
            )}
            <div className="flex-1">
              <p className="font-semibold text-slate-900">
                {invitation.invitedBy.displayName}
              </p>
              <p className="text-sm text-slate-500">
                {invitation.isInstant ? 'is calling you...' : 'invited you to a meeting'}
              </p>
            </div>
          </div>

          {/* Meeting details */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3">
            <h3 className="font-medium text-slate-900 text-lg">
              {invitation.meetingTitle}
            </h3>

            {invitation.scheduledAt && (
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">{formatScheduledTime(invitation.scheduledAt)}</span>
              </div>
            )}

            {invitation.isInstant && timeLeft !== null && (
              <div className="flex items-center gap-2 text-amber-600">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Expires in {timeLeft} seconds
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleDecline}
              disabled={isDeclining || isAccepting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              <XCircle className="w-5 h-5" />
              {isDeclining ? 'Declining...' : 'Decline'}
            </button>

            <button
              onClick={handleAccept}
              disabled={isDeclining || isAccepting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-purple-500/25"
            >
              <Check className="w-5 h-5" />
              {isAccepting ? 'Joining...' : invitation.isInstant ? 'Join Now' : 'Accept'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
