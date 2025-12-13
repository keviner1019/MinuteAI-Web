'use client';

import {
  Mic,
  MicOff,
  PhoneOff,
  FileText,
  UserPlus,
  Radio,
  StopCircle,
  Video,
  VideoOff,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { InviteModal } from './InviteModal';

interface ControlsProps {
  isMuted: boolean;
  isTranscribing: boolean;
  showTranscriptPanel: boolean;
  isRecording: boolean;
  isSavingRecording?: boolean;
  isVideoEnabled?: boolean;
  isRemoteRecording?: boolean;
  canRecord?: boolean;
  isHost?: boolean;
  onToggleAudio: () => void;
  onToggleTranscription: () => void;
  onToggleRecording: () => void;
  onToggleVideo?: () => void;
  onEndCall: () => void;
  roomId?: string;
}

export function Controls({
  isMuted,
  isTranscribing,
  showTranscriptPanel,
  isRecording,
  isSavingRecording = false,
  isVideoEnabled,
  isRemoteRecording,
  canRecord = true,
  isHost = false,
  onToggleAudio,
  onToggleTranscription,
  onToggleRecording,
  onToggleVideo,
  onEndCall,
  roomId,
}: ControlsProps) {
  const [meetingCode, setMeetingCode] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const supabase = createClient();

  const handleEndCall = () => {
    if (isHost) {
      const confirmed = window.confirm(
        'Are you sure you want to end this meeting? This will end the meeting for all participants.'
      );
      if (confirmed) {
        onEndCall();
      }
    } else {
      onEndCall();
    }
  };

  // Fetch meeting code when component mounts
  useEffect(() => {
    if (roomId) {
      fetchMeetingCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
    <div className="bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center shadow-lg">
      {/* Left: Room Info & Invite Options */}
      <div className="flex items-center gap-3">
        {roomId && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <UserPlus size={16} />
            Invite
          </button>
        )}
      </div>

      {/* Invite Modal */}
      {roomId && (
        <InviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          roomId={roomId}
          meetingCode={meetingCode}
        />
      )}

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

        {/* Video Toggle */}
        {onToggleVideo && (
          <button
            onClick={onToggleVideo}
            className={`p-4 rounded-full transition shadow-md ${
              isVideoEnabled ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isVideoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {isVideoEnabled ? (
              <Video size={24} className="text-white" />
            ) : (
              <VideoOff size={24} className="text-white" />
            )}
          </button>
        )}

        {/* Recording Toggle */}
        <button
          onClick={onToggleRecording}
          disabled={!canRecord || (!isRecording && isRemoteRecording) || isSavingRecording}
          className={`p-4 rounded-full transition shadow-md ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600'
              : !canRecord
              ? 'bg-gray-400 cursor-not-allowed opacity-50'
              : isSavingRecording
              ? 'bg-gray-400 cursor-wait opacity-50'
              : isRemoteRecording
              ? 'bg-gray-400 cursor-not-allowed opacity-50'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title={
            !canRecord
              ? 'Only the meeting owner can record'
              : isSavingRecording
              ? 'Finishing previous recording upload'
              : isRemoteRecording && !isRecording
              ? 'Another participant is recording'
              : isRecording
              ? 'Stop Recording'
              : 'Start Recording'
          }
        >
          {isRecording ? (
            <StopCircle size={24} className="text-white" />
          ) : (
            <Radio size={24} className="text-white" />
          )}
        </button>

        {/* Transcription Panel Toggle */}
        <button
          onClick={onToggleTranscription}
          className={`p-4 rounded-full transition shadow-md ${
            showTranscriptPanel
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title={showTranscriptPanel ? 'Hide Transcript Panel' : 'Show Transcript Panel'}
        >
          <FileText size={24} className="text-white" />
        </button>

        {/* End Call */}
        <button
          onClick={handleEndCall}
          className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition shadow-md"
          title={isHost ? 'End meeting for all' : 'Leave meeting'}
        >
          <PhoneOff size={24} className="text-white" />
        </button>
      </div>

      {/* Right: Status */}
      <div className="flex items-center gap-3">
          {isSavingRecording && (
            <div className="flex items-center gap-2 text-amber-700 text-sm font-medium bg-amber-50 px-3 py-2 rounded-full border border-amber-200">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></div>
              Saving recording...
            </div>
          )}
        {(isRecording || isRemoteRecording) && (
          <div className="flex items-center gap-2 text-red-700 text-sm font-medium bg-red-50 px-3 py-2 rounded-full border border-red-200">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
            {isRecording && isRemoteRecording ? 'Both Recording' : 'Recording'}
          </div>
        )}
        {isTranscribing && (
          <div className="flex items-center gap-2 text-green-700 text-sm font-medium bg-green-50 px-3 py-2 rounded-full border border-green-200">
            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
            Live Transcription
          </div>
        )}
      </div>
    </div>
  );
}
