'use client';

import { Mic, MicOff, PhoneOff, FileText, Copy, Check, Link as LinkIcon, Hash } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ControlsProps {
  isMuted: boolean;
  isTranscribing: boolean;
  onToggleAudio: () => void;
  onEndCall: () => void;
  roomId?: string;
}

export function Controls({
  isMuted,
  isTranscribing,
  onToggleAudio,
  onEndCall,
  roomId,
}: ControlsProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [meetingCode, setMeetingCode] = useState<string | null>(null);
  const [showInviteMenu, setShowInviteMenu] = useState(false);
  const supabase = createClient();

  // Fetch meeting code when component mounts
  useEffect(() => {
    if (roomId) {
      fetchMeetingCode();
    }
  }, [roomId]);

  const fetchMeetingCode = async () => {
    if (!roomId) return;

    try {
      const { data: meeting, error } = await supabase
        .from('meetings')
        .select('meeting_code')
        .eq('room_id', roomId)
        .maybeSingle(); // Use maybeSingle to avoid error when no rows

      if (error) throw error;

      if (meeting) {
        setMeetingCode((meeting as any)?.meeting_code || null);
      } else {
        // Meeting not created yet, retry in 1 second
        setTimeout(fetchMeetingCode, 1000);
      }
    } catch (error) {
      console.error('Error fetching meeting code:', error);
    }
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/meeting/${roomId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyMeetingCode = () => {
    if (meetingCode) {
      navigator.clipboard.writeText(meetingCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center shadow-lg">
      {/* Left: Room Info & Invite Options */}
      <div className="flex items-center gap-3">
        {roomId && (
          <div className="relative">
            <button
              onClick={() => setShowInviteMenu(!showInviteMenu)}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <Copy size={16} />
              Invite Participants
            </button>

            {/* Invite Menu Dropdown */}
            {showInviteMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-50">
                <div className="space-y-4">
                  {/* Meeting Code */}
                  {meetingCode && (
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block flex items-center gap-1 font-medium">
                        <Hash size={14} />
                        Meeting Code
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-900 font-mono text-lg tracking-wider">
                          {meetingCode}
                        </div>
                        <button
                          onClick={copyMeetingCode}
                          className="p-2 rounded bg-gray-100 hover:bg-gray-200 transition text-gray-700"
                          title="Copy code"
                        >
                          {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Share this code with participants
                      </p>
                    </div>
                  )}

                  {/* Meeting Link */}
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block flex items-center gap-1 font-medium">
                      <LinkIcon size={14} />
                      Meeting Link
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-900 text-sm truncate">
                        {`${
                          typeof window !== 'undefined' ? window.location.origin : ''
                        }/meeting/${roomId}`}
                      </div>
                      <button
                        onClick={copyRoomLink}
                        className="p-2 rounded bg-gray-100 hover:bg-gray-200 transition text-gray-700"
                        title="Copy link"
                      >
                        {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Or share the direct link</p>
                  </div>

                  {/* Join Instructions */}
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-600">
                      Participants can join at:{' '}
                      <span className="text-blue-600 font-medium">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/join
                      </span>
                    </p>
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setShowInviteMenu(false)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Center: Main Controls */}
      <div className="flex justify-center items-center gap-4">
        {/* Audio Toggle */}
        <button
          onClick={onToggleAudio}
          className={`p-4 rounded-full transition shadow-md ${
            isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <MicOff size={24} className="text-white" />
          ) : (
            <Mic size={24} className="text-white" />
          )}
        </button>

        {/* End Call */}
        <button
          onClick={onEndCall}
          className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition shadow-md"
          title="End call"
        >
          <PhoneOff size={24} className="text-white" />
        </button>
      </div>

      {/* Right: Status */}
      <div className="flex items-center gap-3">
        {isTranscribing && (
          <div className="flex items-center gap-2 text-green-700 text-sm font-medium bg-green-50 px-3 py-2 rounded-full border border-green-200">
            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
            Live Transcription Active
          </div>
        )}
      </div>
    </div>
  );
}
