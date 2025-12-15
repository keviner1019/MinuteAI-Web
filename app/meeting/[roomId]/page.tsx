'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { AudioCall } from '@/components/meeting/AudioCall';
import { TranscriptPanel } from '@/components/meeting/TranscriptPanel';
import { Controls } from '@/components/meeting/Controls';
import { RecordingCountdown } from '@/components/meeting/RecordingCountdown';
import { VideoGrid } from '@/components/meeting/VideoGrid';
import { ParticipantCount } from '@/components/meeting/ParticipantCount';
import { useTwilioVideo } from '@/hooks/useTwilioVideo';
import { useTranscription } from '@/hooks/useTranscription';
import { useCompositeRecorder } from '@/hooks/useCompositeRecorder';
import { createClient } from '@/lib/supabase/client';

export default function MeetingRoom() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [participantJoinedName, setParticipantJoinedName] = useState<string | null>(null);
  const [participantLeftName, setParticipantLeftName] = useState<string | null>(null);
  const [recordingEnabled, setRecordingEnabled] = useState(false);
  const [recordingNotification, setRecordingNotification] = useState<{
    show: boolean;
    message: string;
    tone: 'danger' | 'info' | 'warning';
  }>({ show: false, message: '', tone: 'danger' });
  const recordingToastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showRecordingToast = useCallback(
    (message: string, tone: 'danger' | 'info' | 'warning' = 'danger') => {
      if (recordingToastTimeout.current) {
        clearTimeout(recordingToastTimeout.current);
      }
      setRecordingNotification({ show: true, message, tone });
      recordingToastTimeout.current = setTimeout(() => {
        setRecordingNotification({ show: false, message: '', tone });
      }, 3200);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (recordingToastTimeout.current) {
        clearTimeout(recordingToastTimeout.current);
      }
    };
  }, []);
  const prevRecordingState = useRef<boolean>(false);
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(false);
  const [showTranscriptPanel, setShowTranscriptPanel] = useState(true);
  const [showRecordingCountdown, setShowRecordingCountdown] = useState(false);

  const {
    localStream,
    remoteStream,
    remoteStreamVersion,
    localVideoStream,
    remoteVideoStream,
    isVideoEnabled,
    isConnected,
    isMuted,
    isRemoteMuted,
    isRemoteRecording,
    toggleAudio,
    toggleVideo,
    sendRecordingState,
    endCall,
    connectionState,
    error,
    meetingId,
    peerLeft,
    remoteUserProfile,
    isHost,
    getPeerConnection,
    participants,
  } = useTwilioVideo(roomId);


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

    // Mix local and remote audio streams using Web Audio API
    let audioContext: AudioContext | null = null;

    try {
      audioContext = new AudioContext();
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

    // Cleanup function to close audio context
    return () => {
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch((err) => console.error('Error closing audio context:', err));
      }
    };
  }, [localStream, remoteStream]);

  const { transcripts, isTranscribing, startTranscription, stopTranscription } = useTranscription(
    localStream,
    meetingId
  ); // Use localStream only, not mixedStream

  const {
    isRecording,
    isSaving: isSavingRecording,
    startRecording,
    stopRecording,
  } = useCompositeRecorder(meetingId);
  const hasActiveVideo = Boolean(localVideoStream || remoteVideoStream);
  const canRecord = isHost;

  useEffect(() => {
    sendRecordingState(isRecording);
  }, [isRecording, sendRecordingState]);

  useEffect(() => {
    if (!isRecording && recordingEnabled) {
      setRecordingEnabled(false);
    }
  }, [isRecording, recordingEnabled]);

  const recordingStream = useMemo(() => {
    const tracks: MediaStreamTrack[] = [];

    if (mixedStream) {
      mixedStream.getAudioTracks().forEach((track: MediaStreamTrack) => tracks.push(track));
    } else if (localStream) {
      localStream.getAudioTracks().forEach((track: MediaStreamTrack) => tracks.push(track));
    } else if (remoteStream) {
      (remoteStream as MediaStream).getAudioTracks().forEach((track: MediaStreamTrack) => tracks.push(track));
    }

    const preferredVideoStream =
      localVideoStream && localVideoStream.getVideoTracks().length > 0
        ? localVideoStream
        : remoteVideoStream && remoteVideoStream.getVideoTracks().length > 0
        ? remoteVideoStream
        : null;

    if (preferredVideoStream) {
      (preferredVideoStream as MediaStream).getVideoTracks().forEach((track: MediaStreamTrack) => tracks.push(track));
    }

    if (tracks.length === 0) {
      return null;
    }

    const combined = new MediaStream();
    tracks.forEach((track: MediaStreamTrack) => combined.addTrack(track));
    return combined;
  }, [localStream, mixedStream, remoteStream, localVideoStream, remoteVideoStream]);

  // Auto-start transcription when local stream is available
  useEffect(() => {
    if (localStream && meetingId && !transcriptionEnabled) {
      console.log('Auto-starting transcription with local stream...');
      startTranscription();
      setTranscriptionEnabled(true);
    }
  }, [localStream, meetingId, transcriptionEnabled, startTranscription]);

  // Handle transcription visibility toggle (transcription always runs, this just shows/hides panel)
  const handleToggleTranscription = () => {
    setShowTranscriptPanel(!showTranscriptPanel);
  };

  // Handle recording toggle with countdown
  const handleToggleRecording = useCallback(async () => {
    if (!canRecord) {
      showRecordingToast('Only the meeting owner can start recordings.', 'warning');
      return;
    }

    if (isSavingRecording) {
      showRecordingToast('Finishing previous recording upload. Please wait...', 'info');
      return;
    }

    if (recordingEnabled || isRecording) {
      await stopRecording();
      setRecordingEnabled(false);
      return;
    }

    if (localStream && meetingId) {
      // Show countdown before starting
      setShowRecordingCountdown(true);
    } else {
      console.warn('No media stream available for recording');
      showRecordingToast('No media available to record right now.', 'warning');
    }
  }, [
    canRecord,
    isSavingRecording,
    isRecording,
    localStream,
    meetingId,
    recordingEnabled,
    showRecordingToast,
    stopRecording,
  ]);

  // Start recording after countdown
  const handleCountdownComplete = () => {
    setShowRecordingCountdown(false);
    if (!canRecord) return;
    if (isSavingRecording) {
      showRecordingToast('Please wait for the current recording to finish uploading.', 'info');
      return;
    }

    if (meetingId && (localStream || mixedStream)) {
      const supabase = createClient();

      // Get local user profile
      const getLocalProfile = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          return profile || { display_name: user.email || 'You', avatar_url: null };
        }
        return { display_name: 'You', avatar_url: null };
      };

      getLocalProfile().then((localProfile) => {
        startRecording(
          localVideoStream,
          remoteVideoStream,
          mixedStream || localStream,
          {
            display_name: localProfile?.display_name || undefined,
            avatar_url: localProfile?.avatar_url || undefined,
          },
          remoteUserProfile
            ? {
                display_name: remoteUserProfile.display_name || undefined,
                avatar_url: remoteUserProfile.avatar_url || undefined,
              }
            : { display_name: 'Guest', avatar_url: undefined }
        );
        setRecordingEnabled(true);
      });
    } else {
      console.warn('No media stream available for recording');
      showRecordingToast('No media available to record right now.', 'warning');
    }
  };

  const handleEndCall = useCallback(async () => {
    try {
      if (isRecording || isSavingRecording) {
        showRecordingToast(
          isSavingRecording
            ? 'Finalizing recording upload before ending the meeting...'
            : 'Stopping recording before ending the meeting...',
          'info'
        );
        await stopRecording();
        setRecordingEnabled(false);
      }
    } catch (error) {
      console.error('Failed to finalize recording before ending meeting:', error);
    } finally {
      await endCall();
    }
  }, [endCall, isRecording, isSavingRecording, showRecordingToast, stopRecording]);

  useEffect(() => {
    return () => {
      if (isRecording || isSavingRecording) {
        stopRecording();
      }
    };
  }, [isRecording, isSavingRecording, stopRecording]);

  // Track which users have been shown the "joined" notification (by their user ID + session)
  // We use a Map to track both the user ID and their session ID to handle reconnections properly
  const shownJoinedNotifications = useRef<Map<string, string>>(new Map());
  const isInitialConnectionRef = useRef(true);

  // Show notification when participant joins with their name
  // Only show for new participants joining AFTER we connected (not for participants already in the room)
  // Only the host sees join notifications - non-hosts don't see "joined" notifications
  useEffect(() => {
    if (!isConnected || !remoteUserProfile?.id) return;

    // Don't show "joined" notifications if we're not the host
    // (when you join someone else's room, you don't need to see "X joined the meeting")
    if (!isHost) {
      isInitialConnectionRef.current = false;
      return;
    }

    // Get the current participant from the participants map
    const currentParticipant = Array.from(participants.values()).find(
      p => p.userId === remoteUserProfile.id
    );

    if (!currentParticipant) return;

    const previousSessionId = shownJoinedNotifications.current.get(remoteUserProfile.id);
    const currentSessionId = currentParticipant.sessionId;

    // Only show notification if:
    // 1. This is a completely new user (not in our map), OR
    // 2. This is the same user with a DIFFERENT session (they left and rejoined, not just reconnected)
    // Don't show notification for reconnections (same session ID)
    if (previousSessionId === undefined || (previousSessionId !== currentSessionId && !isInitialConnectionRef.current)) {
      // For reconnections with same session, Twilio handles it internally and doesn't create new participant
      // If the session ID changed, it means the user left and rejoined (new session)
      shownJoinedNotifications.current.set(remoteUserProfile.id, currentSessionId);

      // Skip the very first connection notification if we want (optional)
      if (isInitialConnectionRef.current) {
        isInitialConnectionRef.current = false;
        const userName = remoteUserProfile.display_name || 'Participant';
        setParticipantJoinedName(userName);
        setTimeout(() => setParticipantJoinedName(null), 3000);
      } else if (previousSessionId !== currentSessionId) {
        // User rejoined with new session
        const userName = remoteUserProfile.display_name || 'Participant';
        setParticipantJoinedName(userName);
        setTimeout(() => setParticipantJoinedName(null), 3000);
      }
    }
  }, [isConnected, remoteUserProfile, participants, isHost]);

  // Show notification when participant leaves with their name
  useEffect(() => {
    if (peerLeft && remoteUserProfile) {
      const userName = remoteUserProfile.display_name || 'Participant';
      setParticipantLeftName(userName);
      // Hide notification after 3 seconds
      setTimeout(() => setParticipantLeftName(null), 3000);
    }
  }, [peerLeft, remoteUserProfile]);

  // Show notification when remote user starts/stops recording
  useEffect(() => {
    if (remoteUserProfile && isConnected) {
      const userName = remoteUserProfile.display_name || 'Participant';

      if (isRemoteRecording !== prevRecordingState.current) {
        if (isRemoteRecording) {
          showRecordingToast(`${userName} started recording`, 'danger');
        } else if (prevRecordingState.current) {
          showRecordingToast(`${userName} stopped recording`, 'info');
        }
        prevRecordingState.current = isRemoteRecording;
      }
    }
  }, [isRemoteRecording, remoteUserProfile, isConnected, showRecordingToast]);

  // Calculate participant count
  const participantCount = useMemo(() => {
    return participants.size + 1; // +1 for local user
  }, [participants]);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-50 overflow-hidden">
      {/* Participant Counter */}
      <ParticipantCount count={participantCount} />

      {/* Participant Joined Notification */}
      {participantJoinedName && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
          <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3.5 rounded-2xl shadow-2xl shadow-emerald-500/25 flex items-center gap-3 border border-emerald-400/30">
            {/* Animated background shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />

            {/* Pulse ring effect */}
            <div className="relative">
              <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" style={{ animationDuration: '1.5s' }} />
              <div className="relative w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="font-semibold text-base leading-tight">{participantJoinedName}</span>
              <span className="text-emerald-100 text-sm">joined the meeting</span>
            </div>
          </div>
        </div>
      )}

      {/* Participant Left Notification */}
      {participantLeftName && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
          <div className="relative overflow-hidden bg-gradient-to-r from-slate-600 to-slate-700 text-white px-6 py-3.5 rounded-2xl shadow-2xl shadow-slate-500/25 flex items-center gap-3 border border-slate-500/30">
            {/* Icon */}
            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>

            <div className="flex flex-col">
              <span className="font-semibold text-base leading-tight">{participantLeftName}</span>
              <span className="text-slate-300 text-sm">left the meeting</span>
            </div>
          </div>
        </div>
      )}

      {/* Recording Notification */}
      {recordingNotification.show && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top">
          <div
            className={`flex items-center gap-4 rounded-2xl px-6 py-3 shadow-2xl ${
              recordingNotification.tone === 'warning'
                ? 'bg-amber-500/95 text-white'
                : recordingNotification.tone === 'info'
                ? 'bg-sky-600/95 text-white'
                : 'bg-red-600/95 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3">
                <span
                  className={`h-3 w-3 rounded-full ${
                    recordingNotification.tone === 'warning'
                      ? 'bg-white'
                      : recordingNotification.tone === 'info'
                      ? 'bg-white'
                      : 'bg-white'
                  } animate-pulse`}
                />
              </span>
              <p className="text-xs uppercase tracking-[0.3em] opacity-80">Recording</p>
            </div>
            <p className="text-sm font-semibold">{recordingNotification.message}</p>
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

      {/* Audio and Video Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Audio visualization and Video */}
        <div className="flex-1 flex flex-col p-2 gap-2">
          {/* Video Section - Show when either local or remote video is enabled */}
          {hasActiveVideo ? (
            <div className="flex-1">
              <VideoGrid
                localParticipant={{
                  stream: localStream,
                  videoStream: localVideoStream,
                  isMuted: isMuted,
                  displayName: 'You',
                  avatarUrl: null,
                  isSpeaking: false,
                }}
                remoteParticipants={Array.from(participants.values())}
                speakingUserId={null}
              />
            </div>
          ) : (
            /* Audio Visualization - Only show when no video */
            <div className="flex-1 flex">
              <AudioCall
                localStream={localStream}
                participants={participants}
                isConnected={isConnected}
                connectionState={connectionState}
              />
            </div>
          )}
        </div>

        {/* Transcript Sidebar - Only show when toggled on */}
        {showTranscriptPanel && (
          <TranscriptPanel
            transcripts={transcripts}
            isTranscribing={isTranscribing}
            onToggleLive={handleToggleTranscription}
          />
        )}
      </div>

      {/* Controls - Fixed at bottom */}
      <div className="flex-shrink-0">
        <Controls
          isMuted={isMuted}
          isTranscribing={isTranscribing}
          showTranscriptPanel={showTranscriptPanel}
          isRecording={isRecording}
          isSavingRecording={isSavingRecording}
          canRecord={canRecord}
          isHost={isHost}
          isVideoEnabled={isVideoEnabled}
          isRemoteRecording={isRemoteRecording}
          onToggleAudio={toggleAudio}
          onToggleTranscription={handleToggleTranscription}
          onToggleRecording={handleToggleRecording}
          onToggleVideo={toggleVideo}
          onEndCall={handleEndCall}
          roomId={roomId}
        />
      </div>

      {/* Recording Countdown */}
      {showRecordingCountdown && <RecordingCountdown onComplete={handleCountdownComplete} />}
    </div>
  );
}
