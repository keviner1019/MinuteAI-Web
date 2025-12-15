'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Video, Clock, Calendar, Users, ArrowRight } from 'lucide-react';

interface UpcomingMeeting {
  id: string;
  roomId: string;
  title: string;
  scheduledAt: string;
  host: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  participantCount?: number;
}

interface MeetingCountdownModalProps {
  meeting: UpcomingMeeting;
  onJoin: (meeting: UpcomingMeeting) => void;
  onDismiss: (meeting: UpcomingMeeting) => void;
  onDismissPermanently?: (meeting: UpcomingMeeting) => void;
  onClose: () => void;
  isInvitation?: boolean;
  isInstantMeeting?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calculateTimeLeft(targetDate: string): TimeLeft {
  const difference = new Date(targetDate).getTime() - Date.now();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    total: difference,
  };
}

export default function MeetingCountdownModal({
  meeting,
  onJoin,
  onDismiss,
  onDismissPermanently,
  onClose,
  isInvitation = false,
  isInstantMeeting = false,
}: MeetingCountdownModalProps) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(meeting.scheduledAt));
  const [isJoining, setIsJoining] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(meeting.scheduledAt);
      setTimeLeft(newTimeLeft);

      // Auto-show join button when meeting starts
      if (newTimeLeft.total <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [meeting.scheduledAt]);

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      onJoin(meeting);
      router.push(`/meeting/${meeting.roomId}`);
    } finally {
      setIsJoining(false);
    }
  };

  const handleDismiss = async () => {
    if (isInvitation) {
      setIsDeclining(true);
    }
    try {
      onDismiss(meeting);
    } finally {
      setIsDeclining(false);
    }
  };

  const formatScheduledTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      weekday: 'long',
      month: 'long',
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

  const isStartingSoon = timeLeft.total <= 5 * 60 * 1000; // 5 minutes
  const hasStarted = timeLeft.total <= 0 || isInstantMeeting;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 overflow-hidden">
        {/* Header */}
        <div className={`relative px-6 py-5 ${
          hasStarted
            ? 'bg-gradient-to-r from-green-500 to-emerald-600'
            : isStartingSoon
              ? 'bg-gradient-to-r from-amber-500 to-orange-500'
              : 'bg-gradient-to-r from-blue-500 to-indigo-600'
        }`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              {hasStarted ? (
                <Video className="w-6 h-6 text-white animate-pulse" />
              ) : (
                <Clock className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isInvitation
                  ? isInstantMeeting
                    ? 'Incoming Call'
                    : 'Meeting Invitation'
                  : hasStarted
                    ? 'Meeting Started!'
                    : 'Upcoming Meeting'
                }
              </h2>
              <p className="text-white/80 text-sm">
                {isInvitation
                  ? isInstantMeeting
                    ? `${meeting.host.displayName} is calling you`
                    : `${meeting.host.displayName} invited you`
                  : hasStarted
                    ? 'The meeting is happening now'
                    : isStartingSoon
                      ? 'Starting very soon!'
                      : 'Get ready for your meeting'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Countdown Timer */}
        {!hasStarted && (
          <div className={`py-6 px-6 ${isStartingSoon ? 'bg-amber-50' : 'bg-blue-50'}`}>
            <p className="text-center text-sm text-slate-600 mb-3">Starting in</p>
            <div className="flex justify-center gap-3">
              {timeLeft.days > 0 && (
                <div className="text-center">
                  <div className={`text-3xl font-bold ${isStartingSoon ? 'text-amber-600' : 'text-blue-600'}`}>
                    {timeLeft.days}
                  </div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Days</div>
                </div>
              )}
              <div className="text-center">
                <div className={`text-3xl font-bold ${isStartingSoon ? 'text-amber-600' : 'text-blue-600'}`}>
                  {String(timeLeft.hours).padStart(2, '0')}
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Hours</div>
              </div>
              <div className="text-center text-2xl font-bold text-slate-400">:</div>
              <div className="text-center">
                <div className={`text-3xl font-bold ${isStartingSoon ? 'text-amber-600' : 'text-blue-600'}`}>
                  {String(timeLeft.minutes).padStart(2, '0')}
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Min</div>
              </div>
              <div className="text-center text-2xl font-bold text-slate-400">:</div>
              <div className="text-center">
                <div className={`text-3xl font-bold tabular-nums ${isStartingSoon ? 'text-amber-600' : 'text-blue-600'}`}>
                  {String(timeLeft.seconds).padStart(2, '0')}
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Sec</div>
              </div>
            </div>
          </div>
        )}

        {/* Meeting Started Animation */}
        {hasStarted && (
          <div className="py-6 px-6 bg-green-50">
            <div className="flex items-center justify-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-green-700 font-medium">Meeting is live</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {/* Meeting details */}
          <div className="mb-6">
            <h3 className="font-semibold text-slate-900 text-xl mb-2">
              {meeting.title}
            </h3>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">{formatScheduledTime(meeting.scheduledAt)}</span>
              </div>

              {/* Host info */}
              <div className="flex items-center gap-2 text-slate-600">
                <Users className="w-4 h-4" />
                <span className="text-sm">Hosted by</span>
                <div className="flex items-center gap-2">
                  {meeting.host.avatarUrl ? (
                    <img
                      src={meeting.host.avatarUrl}
                      alt={meeting.host.displayName}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-semibold">
                      {getInitials(meeting.host.displayName)}
                    </div>
                  )}
                  <span className="text-sm font-medium text-slate-700">
                    {meeting.host.displayName}
                  </span>
                </div>
              </div>

              {meeting.participantCount !== undefined && meeting.participantCount > 0 && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">
                    {meeting.participantCount} participant{meeting.participantCount !== 1 ? 's' : ''} joined
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <button
                onClick={handleDismiss}
                disabled={isDeclining}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {isDeclining ? 'Declining...' : isInvitation ? 'Decline' : 'Remind Later'}
              </button>

              <button
                onClick={handleJoin}
                disabled={isJoining || isDeclining}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-xl transition-all disabled:opacity-50 shadow-lg ${
                  hasStarted
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-green-500/25'
                    : isStartingSoon
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/25'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-blue-500/25'
                }`}
              >
                {isJoining ? (
                  'Joining...'
                ) : isInvitation ? (
                  <>
                    {isInstantMeeting ? 'Answer' : 'Accept & Join'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : hasStarted ? (
                  <>
                    Join Now
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Join Early
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Don't remind option - hide for invitations */}
            {onDismissPermanently && !isInvitation && (
              <button
                onClick={() => onDismissPermanently(meeting)}
                className="w-full px-4 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Don&apos;t remind me about this meeting
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
