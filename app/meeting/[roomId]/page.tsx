'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { AudioCall } from '@/components/meeting/AudioCall';
import { TranscriptPanel } from '@/components/meeting/TranscriptPanel';
import { Controls } from '@/components/meeting/Controls';
import { RecordingCountdown } from '@/components/meeting/RecordingCountdown';
import { VideoGrid } from '@/components/meeting/VideoGrid';
import { RecordingNotificationBanner } from '@/components/meeting/RecordingNotificationBanner';
import { useTwilioVideo } from '@/hooks/useTwilioVideo';
import { useTranscription } from '@/hooks/useTranscription';
import { useCompositeRecorder } from '@/hooks/useCompositeRecorder';
import { useRecordingNotification } from '@/hooks/useRecordingNotification';
import { createClient } from '@/lib/supabase/client';

export default function MeetingRoom() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [participantJoinedName, setParticipantJoinedName] = useState<string | null>(null);
  const [participantLeftName, setParticipantLeftName] = useState<string | null>(null);
  const [recordingEnabled, setRecordingEnabled] = useState(false);
  const [recordingNotificationState, setRecordingNotificationState] = useState<{
    show: boolean;
    message: string;
    tone: 'danger' | 'info' | 'warning';
  }>({ show: false, message: '', tone: 'danger' });
  const recordingToastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('You');
  const [localUserProfile, setLocalUserProfile] = useState<{
    display_name?: string;
    avatar_url?: string;
  } | null>(null);

  const showRecordingToast = useCallback(
    (message: string, tone: 'danger' | 'info' | 'warning' = 'danger') => {
      if (recordingToastTimeout.current) {
        clearTimeout(recordingToastTimeout.current);
      }
      setRecordingNotificationState({ show: true, message, tone });
      recordingToastTimeout.current = setTimeout(() => {
        setRecordingNotificationState({ show: false, message: '', tone });
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

  // Fetch current user info
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);

        const { data: profile } = await (supabase as any)
          .from('user_profiles')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .single() as { data: { display_name: string | null; avatar_url: string | null } | null };

        if (profile) {
          setCurrentUserName(profile.display_name || user.email || 'You');
          setLocalUserProfile({
            display_name: profile.display_name || user.email || 'You',
            avatar_url: profile.avatar_url || undefined,
          });
        }
      }
    };
    fetchUser();
  }, []);

  // Recording notification system
  const {
    recordingUsers,
    isAnyoneRecording: isAnyRemoteRecording,
    recordingCount,
    notifications: recordingNotifications,
    broadcastRecordingStarted,
    broadcastRecordingStopped,
  } = useRecordingNotification({
    meetingId,
    userId: currentUserId,
    userName: currentUserName,
  });

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
    recordingDuration,
    error: recordingError,
    startRecording,
    stopRecording,
    updateParticipant,
    addParticipant,
    removeParticipant,
  } = useCompositeRecorder(meetingId);

  const hasActiveVideo = Boolean(localVideoStream || remoteVideoStream);
  const canRecord = isHost;

  // Broadcast recording state to other participants
  useEffect(() => {
    sendRecordingState(isRecording);

    if (isRecording) {
      broadcastRecordingStarted();
    } else if (prevRecordingState.current && !isRecording) {
      broadcastRecordingStopped();
    }

    prevRecordingState.current = isRecording;
  }, [isRecording, sendRecordingState, broadcastRecordingStarted, broadcastRecordingStopped]);

  // Update composite recorder when participants change
  useEffect(() => {
    if (!isRecording) return;

    participants.forEach((participant, key) => {
      updateParticipant(participant.userId, {
        videoStream: participant.videoStream,
        audioStream: participant.stream,
        connectionState: participant.connectionState,
        displayName: participant.displayName,
        avatarUrl: participant.avatarUrl,
      });
    });
  }, [participants, isRecording, updateParticipant]);

  // Handle participant joining during recording
  useEffect(() => {
    if (!isRecording) return;

    const participantArray = Array.from(participants.values());
    participantArray.forEach((participant) => {
      addParticipant({
        userId: participant.userId,
        displayName: participant.displayName,
        avatarUrl: participant.avatarUrl,
        videoStream: participant.videoStream,
        audioStream: participant.stream,
        isLocal: false,
        connectionState: participant.connectionState,
      });
    });
  }, [participants.size, isRecording, addParticipant, participants]);

  // Track previous participants to detect who leaves
  const prevParticipantsRef = useRef<Set<string>>(new Set());

  // Handle participant leaving during recording
  useEffect(() => {
    if (!isRecording) return;

    const currentParticipantIds = new Set(Array.from(participants.keys()));

    // Find participants who were in previous state but not in current state
    prevParticipantsRef.current.forEach((prevId) => {
      if (!currentParticipantIds.has(prevId)) {
        // This participant left, remove them from recording
        console.log('Removing participant from recording:', prevId);
        // Extract userId from the key (format: "userId:displayName")
        const [userId] = prevId.split(':');
        removeParticipant(userId);
      }
    });

    // Update previous participants for next comparison
    prevParticipantsRef.current = currentParticipantIds;
  }, [participants, isRecording, removeParticipant]);

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

    if (meetingId && localStream) {
      // Pass localStream only (not mixedStream) - the recorder will mix all audio sources
      // Each participant contributes their own audio stream through the participants Map
      startRecording(
        localVideoStream,
        remoteVideoStream,
        localStream, // Use local stream only, remote audio comes from participants Map
        localUserProfile || { display_name: currentUserName },
        remoteUserProfile
          ? {
              display_name: remoteUserProfile.display_name || undefined,
              avatar_url: remoteUserProfile.avatar_url || undefined,
            }
          : { display_name: 'Guest' },
        participants
      );
      setRecordingEnabled(true);
    } else {
      console.warn('No media stream available for recording');
      showRecordingToast('No media available to record right now.', 'warning');
    }
  };

  const handleEndCall = useCallback(async (action?: 'leave' | 'end-for-all') => {
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
      await endCall(action);
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
  const shownJoinedNotifications = useRef<Map<string, string>>(new Map());
  const isInitialConnectionRef = useRef(true);

  // Show notification when participant joins with their name
  useEffect(() => {
    if (!isConnected || !remoteUserProfile?.id) return;

    if (!isHost) {
      isInitialConnectionRef.current = false;
      return;
    }

    const currentParticipant = Array.from(participants.values()).find(
      p => p.userId === remoteUserProfile.id
    );

    if (!currentParticipant) return;

    const previousSessionId = shownJoinedNotifications.current.get(remoteUserProfile.id);
    const currentSessionId = currentParticipant.sessionId;

    if (previousSessionId === undefined || (previousSessionId !== currentSessionId && !isInitialConnectionRef.current)) {
      shownJoinedNotifications.current.set(remoteUserProfile.id, currentSessionId);

      if (isInitialConnectionRef.current) {
        isInitialConnectionRef.current = false;
        const userName = remoteUserProfile.display_name || 'Participant';
        setParticipantJoinedName(userName);
        setTimeout(() => setParticipantJoinedName(null), 3000);
      } else if (previousSessionId !== currentSessionId) {
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
      setTimeout(() => setParticipantLeftName(null), 3000);
    }
  }, [peerLeft, remoteUserProfile]);

  // Note: Legacy recording toast removed - RecordingNotificationBanner handles this now

  // Calculate participant count
  const participantCount = useMemo(() => {
    return participants.size + 1; // +1 for local user
  }, [participants]);

  // Determine if any remote user is recording (from notification system or legacy)
  const isAnyRemoteUserRecording = isAnyRemoteRecording || isRemoteRecording;

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Recording Notification Banner */}
      <RecordingNotificationBanner
        recordingUsers={recordingUsers}
        isLocalRecording={isRecording}
      />


      {/* Participant Joined Notification */}
      {participantJoinedName && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
          <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3.5 rounded-2xl shadow-2xl shadow-emerald-500/25 flex items-center gap-3 border border-emerald-400/30">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
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

      {/* Recording Toast Notification (legacy) */}
      {recordingNotificationState.show && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top">
          <div
            className={`flex items-center gap-4 rounded-2xl px-6 py-3 shadow-2xl ${
              recordingNotificationState.tone === 'warning'
                ? 'bg-amber-500/95 text-white'
                : recordingNotificationState.tone === 'info'
                ? 'bg-sky-600/95 text-white'
                : 'bg-red-600/95 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3">
                <span className="h-3 w-3 rounded-full bg-white animate-pulse" />
              </span>
              <p className="text-xs uppercase tracking-[0.3em] opacity-80">Recording</p>
            </div>
            <p className="text-sm font-semibold">{recordingNotificationState.message}</p>
          </div>
        </div>
      )}

      {/* Warning banner for media permission issues */}
      {error && error.includes('Microphone') && (
        <div className="bg-yellow-50 border-b border-yellow-200 text-yellow-800 px-4 py-3 text-sm flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span>Warning</span>
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
          <span>Connection failed. This might be due to firewall or network restrictions.</span>
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
        <div className="flex-1 flex flex-col p-2 gap-2 min-h-0 overflow-hidden">
          {/* Video Section - Show when either local or remote video is enabled */}
          {hasActiveVideo ? (
            <div className="flex-1 min-h-0 overflow-hidden">
              <VideoGrid
                localParticipant={{
                  stream: localStream,
                  videoStream: localVideoStream,
                  isMuted: isMuted,
                  displayName: currentUserName,
                  avatarUrl: localUserProfile?.avatar_url || null,
                  isSpeaking: false,
                  isRecording: isRecording,
                }}
                remoteParticipants={Array.from(participants.values())}
                speakingUserId={null}
                isRecording={isRecording}
                isRemoteRecording={isAnyRemoteUserRecording}
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
          participantCount={participantCount}
          isVideoEnabled={isVideoEnabled}
          isRemoteRecording={isAnyRemoteUserRecording}
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
