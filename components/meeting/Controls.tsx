'use client';

import {
  Mic,
  MicOff,
  PhoneOff,
  LogOut,
  FileText,
  UserPlus,
  Radio,
  StopCircle,
  Video,
  VideoOff,
  ScreenShare,
  ScreenShareOff,
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
  isScreenSharing?: boolean;
  isRemoteRecording?: boolean;
  canRecord?: boolean;
  isHost?: boolean;
  participantCount?: number;
  onToggleAudio: () => void;
  onToggleTranscription: () => void;
  onToggleRecording: () => void;
  onToggleVideo?: () => void;
  onToggleScreenShare?: () => void;
  onEndCall: (action?: 'leave' | 'end-for-all') => void;
  roomId?: string;
}

export function Controls({
  isMuted,
  isTranscribing,
  showTranscriptPanel,
  isRecording,
  isSavingRecording = false,
  isVideoEnabled,
  isScreenSharing = false,
  isRemoteRecording,
  canRecord = true,
  isHost = false,
  participantCount = 1,
  onToggleAudio,
  onToggleTranscription,
  onToggleRecording,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall,
  roomId,
}: ControlsProps) {
  const [meetingCode, setMeetingCode] = useState<string | null>(null);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEndOptions, setShowEndOptions] = useState(false);
  const supabase = createClient();

  // Host: End meeting for all participants
  const handleEndForAll = () => {
    const confirmed = window.confirm(
      'End meeting for ALL participants? Everyone will be disconnected.'
    );
    if (confirmed) {
      setShowEndOptions(false);
      onEndCall('end-for-all');
    }
  };

  // Host: Leave but transfer ownership to another participant
  const handleLeaveAndTransfer = () => {
    if (participantCount <= 1) {
      // No other participants, just end the meeting
      const confirmed = window.confirm(
        'You are the only participant. Leaving will end the meeting. Continue?'
      );
      if (confirmed) {
        setShowEndOptions(false);
        onEndCall('end-for-all');
      }
    } else {
      const confirmed = window.confirm(
        'Leave the meeting? Another participant will become the host.'
      );
      if (confirmed) {
        setShowEndOptions(false);
        onEndCall('leave');
      }
    }
  };

  // Participant: Just leave
  const handleParticipantLeave = () => {
    onEndCall('leave');
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
        .select('id, meeting_code')
        .eq('room_id', roomId)
        .maybeSingle(); // Use maybeSingle to avoid error when no rows

      if (error) throw error;

      if (meeting) {
        setMeetingCode((meeting as any)?.meeting_code || null);
        setMeetingId((meeting as any)?.id || null);
      } else {
        // Meeting not created yet, retry in 1 second
        setTimeout(fetchMeetingCode, 1000);
      }
    } catch (error) {
      console.error('Error fetching meeting code:', JSON.stringify(error, null, 2));
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
          meetingId={meetingId || undefined}
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

        {/* Screen Share Toggle (Broadcast) */}
        {onToggleScreenShare && (
          <button
            onClick={onToggleScreenShare}
            className={`p-4 rounded-full transition shadow-md ${
              isScreenSharing ? 'bg-purple-500 hover:bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
          >
            {isScreenSharing ? (
              <ScreenShareOff size={24} className="text-white" />
            ) : (
              <ScreenShare size={24} className="text-white" />
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

        {/* End Call - Different behavior for host vs participant */}
        {isHost ? (
          <div className="relative">
            <button
              onClick={() => setShowEndOptions(!showEndOptions)}
              className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition shadow-md"
              title="End or leave meeting"
            >
              <PhoneOff size={24} className="text-white" />
            </button>

            {/* Host End Options Dropdown */}
            {showEndOptions && (
              <div className="absolute bottom-full mb-2 right-0 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden min-w-[200px] z-50">
                <button
                  onClick={handleEndForAll}
                  className="w-full px-4 py-3 text-left hover:bg-red-50 flex items-center gap-3 text-red-600 border-b border-gray-100"
                >
                  <PhoneOff size={18} />
                  <div>
                    <div className="font-medium">End for All</div>
                    <div className="text-xs text-gray-500">End meeting for everyone</div>
                  </div>
                </button>
                <button
                  onClick={handleLeaveAndTransfer}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700"
                >
                  <LogOut size={18} />
                  <div>
                    <div className="font-medium">Leave Meeting</div>
                    <div className="text-xs text-gray-500">
                      {participantCount > 1 ? 'Transfer host & leave' : 'End meeting'}
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={handleParticipantLeave}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition shadow-md"
            title="Leave meeting"
          >
            <LogOut size={24} className="text-white" />
          </button>
        )}
      </div>

      {/* Right: Status */}
      <div className="flex items-center gap-3">
        {isSavingRecording && (
          <div className="flex items-center gap-2 text-amber-700 text-sm font-medium bg-amber-50 px-3 py-2 rounded-full border border-amber-200">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></div>
            Saving recording...
          </div>
        )}
        {isScreenSharing && (
          <div className="flex items-center gap-2 text-purple-700 text-sm font-medium bg-purple-50 px-3 py-2 rounded-full border border-purple-200">
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
            Screen Sharing
          </div>
        )}
        {(isRecording || isRemoteRecording) && (
          <div className="flex items-center gap-2 text-red-700 text-sm font-medium bg-red-50 px-3 py-2 rounded-full border border-red-200">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
            {isRecording && isRemoteRecording ? 'Both Recording' : 'Recording'}
          </div>
        )}
      </div>
    </div>
  );
}
