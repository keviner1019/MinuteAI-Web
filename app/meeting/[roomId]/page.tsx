'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AudioCall } from '@/components/meeting/AudioCall';
import { TranscriptPanel } from '@/components/meeting/TranscriptPanel';
import { Controls } from '@/components/meeting/Controls';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useTranscription } from '@/hooks/useTranscription';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

export default function MeetingRoom() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [participantJoinedName, setParticipantJoinedName] = useState<string | null>(null);
  const [participantLeftName, setParticipantLeftName] = useState<string | null>(null);

  const {
    localStream,
    remoteStream,
    remoteStreamVersion,
    isConnected,
    isMuted,
    toggleAudio,
    endCall,
    connectionState,
    error,
    meetingId,
    peerLeft,
    remoteUserProfile,
  } = useWebRTC(roomId);

  // Create a mixed audio stream for transcription (local + remote)
  const [mixedStream, setMixedStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!localStream) {
      setMixedStream(null);
      return;
    }

    // If no remote stream yet, just use local stream
    if (!remoteStream) {
      setMixedStream(localStream);
      return;
    }

    // Mix local and remote audio streams
    try {
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();

      // Add local audio
      const localSource = audioContext.createMediaStreamSource(localStream);
      localSource.connect(destination);

      // Add remote audio
      const remoteSource = audioContext.createMediaStreamSource(remoteStream);
      remoteSource.connect(destination);

      setMixedStream(destination.stream);
    } catch (error) {
      console.error('Failed to mix audio streams:', error);
      setMixedStream(localStream);
    }
  }, [localStream, remoteStream]);

  const { transcripts, isTranscribing, startTranscription, stopTranscription } = useTranscription(
    mixedStream,
    meetingId
  );

  const { isRecording, startRecording, stopRecording } = useAudioRecorder(meetingId);

  // Auto-start transcription when mixed stream is ready
  useEffect(() => {
    if (mixedStream && meetingId && !isTranscribing) {
      console.log('🎙️ Auto-starting transcription...');
      startTranscription();
    }
  }, [mixedStream, meetingId]);

  // Show notification when participant joins with their name
  useEffect(() => {
    if (isConnected && remoteUserProfile && !participantJoinedName) {
      const userName = remoteUserProfile.display_name || 'Participant';
      setParticipantJoinedName(userName);
      // Hide notification after 3 seconds
      setTimeout(() => setParticipantJoinedName(null), 3000);
    }
  }, [isConnected, remoteUserProfile]);

  // Show notification when participant leaves with their name
  useEffect(() => {
    if (peerLeft && remoteUserProfile) {
      const userName = remoteUserProfile.display_name || 'Participant';
      setParticipantLeftName(userName);
      // Hide notification after 3 seconds
      setTimeout(() => setParticipantLeftName(null), 3000);
    }
  }, [peerLeft, remoteUserProfile]);

  // Start recording when local stream is available
  useEffect(() => {
    if (localStream && meetingId && !isRecording) {
      startRecording(localStream);
    }

    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, [localStream, meetingId]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Participant Joined Notification */}
      {participantJoinedName && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-2">
            <span className="text-xl">👋</span>
            <span className="font-medium">{participantJoinedName} joined the meeting!</span>
          </div>
        </div>
      )}

      {/* Participant Left Notification */}
      {participantLeftName && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top">
          <div className="bg-red-600 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-2">
            <span className="text-xl">👋</span>
            <span className="font-medium">{participantLeftName} left the meeting</span>
          </div>
        </div>
      )}

      {/* Warning banner for media permission issues */}
      {error && error.includes('Microphone') && (
        <div className="bg-yellow-50 border-b border-yellow-200 text-yellow-800 px-4 py-3 text-sm flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span>⚠️</span>
                <span className="font-medium">{error}</span>
              </div>
              <p className="text-xs opacity-90 ml-6">
                Click the microphone icon in your browser&apos;s address bar to grant permissions,
                then reload.
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 whitespace-nowrap text-sm font-medium"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}

      {/* Connection state info */}
      {connectionState === 'connecting' && (
        <div className="bg-blue-50 border-b border-blue-200 text-blue-800 px-4 py-3 text-sm flex items-center gap-2 flex-shrink-0">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Establishing peer-to-peer connection...</span>
        </div>
      )}

      {connectionState === 'failed' && (
        <div className="bg-red-50 border-b border-red-200 text-red-800 px-4 py-3 text-sm flex items-center justify-between flex-shrink-0">
          <span>❌ Connection failed. This might be due to firewall or network restrictions.</span>
          <button
            onClick={() => window.location.reload()}
            className="underline hover:no-underline ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Audio Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <AudioCall
          localStream={localStream}
          remoteStream={remoteStream}
          remoteStreamVersion={remoteStreamVersion}
          isConnected={isConnected}
          connectionState={connectionState}
          remoteUserProfile={remoteUserProfile}
        />

        {/* Transcript Sidebar */}
        <TranscriptPanel transcripts={transcripts} isTranscribing={isTranscribing} />
      </div>

      {/* Controls - Fixed at bottom */}
      <div className="flex-shrink-0">
        <Controls
          isMuted={isMuted}
          isTranscribing={isTranscribing}
          onToggleAudio={toggleAudio}
          onEndCall={endCall}
          roomId={roomId}
        />
      </div>
    </div>
  );
}
