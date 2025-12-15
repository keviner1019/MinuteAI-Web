'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/config';
import { Participant } from '@/types';

interface AudioCallProps {
  localStream: MediaStream | null;
  participants: Map<string, Participant>;
  isConnected: boolean;
  connectionState: RTCPeerConnectionState;
}

export function AudioCall({
  localStream,
  participants,
  isConnected,
  connectionState,
}: AudioCallProps) {
  const { user } = useAuth();
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [remoteAudioLevels, setRemoteAudioLevels] = useState<Map<string, number>>(new Map());
  const [localProfile, setLocalProfile] = useState<{
    display_name: string;
    avatar_url: string;
  } | null>(null);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);

  const localAudioEnabled = !!localStream?.getAudioTracks()[0]?.enabled;
  const participantList = useMemo(() => Array.from(participants.values()), [participants]);
  const hasParticipants = participantList.length > 0;

  // Load user profile
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (data) {
        setLocalProfile(data);
      }
    };

    loadProfile();
  }, [user]);

  // Detect speaking based on audio level threshold
  useEffect(() => {
    const SPEAKING_THRESHOLD = 0.1;
    setIsLocalSpeaking(localAudioLevel > SPEAKING_THRESHOLD);
  }, [localAudioLevel]);

  // Track stream IDs to detect when streams are recreated
  const streamIds = useRef<Map<string, string>>(new Map());

  // Track pending audio elements that need user interaction to play
  const pendingAudioPlay = useRef<Set<string>>(new Set());

  // Setup audio playback for each remote participant
  useEffect(() => {
    participantList.forEach((participant) => {
      if (!participant.stream) {
        // Remove audio element if stream is gone
        const existingAudioEl = audioRefs.current.get(participant.userId);
        if (existingAudioEl) {
          console.log(`🔇 Removing audio for ${participant.displayName || participant.userId} (no stream)`);
          existingAudioEl.srcObject = null;
        }
        streamIds.current.delete(participant.userId);
        pendingAudioPlay.current.delete(participant.userId);
        return;
      }

      const currentStreamId = participant.stream.id;
      const previousStreamId = streamIds.current.get(participant.userId);

      let audioEl = audioRefs.current.get(participant.userId);
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        // @ts-ignore - setAttribute for playsInline (mobile support)
        audioEl.setAttribute('playsinline', 'true');
        audioRefs.current.set(participant.userId, audioEl);
        console.log(`🔊 Created audio element for ${participant.displayName || participant.userId}`);
      }

      // Update if stream changed or is new
      if (currentStreamId !== previousStreamId || audioEl.srcObject !== participant.stream) {
        console.log(`🔊 Attaching audio stream for ${participant.displayName || participant.userId}:`, {
          streamId: currentStreamId,
          tracks: participant.stream.getAudioTracks().length,
          trackStates: participant.stream.getAudioTracks().map(t => ({ enabled: t.enabled, muted: t.muted, readyState: t.readyState })),
        });

        audioEl.srcObject = participant.stream;
        streamIds.current.set(participant.userId, currentStreamId);

        // Use a small delay to allow stream to stabilize
        setTimeout(() => {
          if (!audioEl) return;
          audioEl.play().catch((err) => {
            console.warn('Audio autoplay blocked:', err);
            pendingAudioPlay.current.add(participant.userId);
          });
        }, 100);
      }
    });

    // Cleanup removed participants
    audioRefs.current.forEach((audioEl, oderId) => {
      // Find by oderId which is based on how participants map uses keys
      const stillExists = participantList.some(p => p.userId === oderId);
      if (!stillExists) {
        console.log(`🧹 Cleaning up audio for removed participant: ${oderId}`);
        audioEl.srcObject = null;
        audioRefs.current.delete(oderId);
        streamIds.current.delete(oderId);
        pendingAudioPlay.current.delete(oderId);
      }
    });
  }, [participantList, participants]);

  // Global click handler to resume any blocked audio
  useEffect(() => {
    const handleUserInteraction = () => {
      if (pendingAudioPlay.current.size === 0) return;

      pendingAudioPlay.current.forEach((userId) => {
        const audioEl = audioRefs.current.get(userId);
        if (audioEl && audioEl.srcObject) {
          audioEl.play().then(() => {
            console.log(`🔊 Audio resumed for ${userId} after user interaction`);
            pendingAudioPlay.current.delete(userId);
          }).catch(() => {});
        }
      });
    };

    // Listen for any user interaction to resume audio
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  // Audio level visualization for local stream
  useEffect(() => {
    if (!localStream) return;

    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack) return;

    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(localStream);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      microphone.connect(analyser);
      analyser.fftSize = 256;

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setLocalAudioLevel(average / 255);
        requestAnimationFrame(updateLevel);
      };

      updateLevel();

      return () => {
        microphone.disconnect();
        audioContext.close();
      };
    } catch (error) {
      console.error('Error setting up audio visualization:', error);
    }
  }, [localStream]);

  // Audio level visualization for remote streams
  useEffect(() => {
    const contexts: AudioContext[] = [];

    participantList.forEach((participant) => {
      if (!participant.stream) return;

      const audioTrack = participant.stream.getAudioTracks()[0];
      if (!audioTrack) return;

      try {
        const audioContext = new AudioContext();
        contexts.push(audioContext);
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(participant.stream);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        source.connect(analyser);
        analyser.fftSize = 256;

        const updateLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setRemoteAudioLevels((prev) => {
            const newMap = new Map(prev);
            newMap.set(participant.userId, average / 255);
            return newMap;
          });
          requestAnimationFrame(updateLevel);
        };

        updateLevel();
      } catch (error) {
        console.error('Error setting up remote audio visualization:', error);
      }
    });

    return () => {
      contexts.forEach((ctx) => ctx.close());
    };
  }, [participantList]);

  const isParticipantSpeaking = (userId: string) => {
    return (remoteAudioLevels.get(userId) || 0) > 0.1;
  };

  const getGridLayout = () => {
    const total = participantList.length + 1; // +1 for local user
    if (total <= 2) return 'flex flex-row justify-center';
    if (total <= 4) return 'grid grid-cols-2';
    return 'grid grid-cols-3';
  };

  return (
    <div className="flex-1 relative bg-transparent">
      <div className="flex h-full w-full items-center justify-center px-4 py-8">
        {hasParticipants || isConnected ? (
          // Connected - Show all participants
          <div className="text-center w-full max-w-5xl">
            <div className={`${getGridLayout()} gap-8 md:gap-12 justify-items-center`}>
              {/* Local User */}
              <div className="flex flex-col items-center group">
                <div className="relative mb-6">
                  {isLocalSpeaking && localAudioEnabled && (
                    <div className="absolute inset-0 rounded-full bg-indigo-300/50 blur-2xl scale-150 animate-pulse" />
                  )}
                  <div
                    className={`absolute -inset-2 rounded-full border-2 transition-all duration-300 ${
                      isLocalSpeaking && localAudioEnabled
                        ? 'border-indigo-500 scale-110'
                        : 'border-slate-200 scale-100'
                    }`}
                  />
                  <Avatar
                    src={localProfile?.avatar_url}
                    alt={localProfile?.display_name || 'You'}
                    size="xl"
                    isSpeaking={isLocalSpeaking && localAudioEnabled}
                    className="w-24 h-24 md:w-32 md:h-32 relative z-10"
                  />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <p className="text-slate-800 text-lg font-semibold">
                    {localProfile?.display_name || 'You'}
                  </p>
                  <div
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      !localAudioEnabled
                        ? 'bg-red-50 text-red-600 border border-red-200'
                        : isLocalSpeaking
                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {localAudioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    <span>
                      {!localAudioEnabled ? 'Muted' : isLocalSpeaking ? 'Speaking' : 'Connected'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Remote Participants */}
              {participantList.map((participant) => {
                const isSpeaking = isParticipantSpeaking(participant.userId);
                const hasAudio = participant.stream !== null && !participant.isMuted;

                return (
                  <div key={participant.userId} className="flex flex-col items-center group">
                    <div className="relative mb-6">
                      {isSpeaking && hasAudio && (
                        <div className="absolute inset-0 rounded-full bg-purple-300/50 blur-2xl scale-150 animate-pulse" />
                      )}
                      <div
                        className={`absolute -inset-2 rounded-full border-2 transition-all duration-300 ${
                          isSpeaking && hasAudio
                            ? 'border-purple-500 scale-110'
                            : 'border-slate-200 scale-100'
                        }`}
                      />
                      <Avatar
                        src={participant.avatarUrl}
                        alt={participant.displayName || 'Participant'}
                        size="xl"
                        isSpeaking={isSpeaking && hasAudio}
                        className="w-24 h-24 md:w-32 md:h-32 relative z-10"
                      />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-slate-800 text-lg font-semibold">
                        {participant.displayName || 'Participant'}
                      </p>
                      <div
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-all ${
                          participant.isMuted
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : isSpeaking
                            ? 'bg-purple-50 text-purple-600 border border-purple-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {hasAudio ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        <span>
                          {participant.isMuted ? 'Muted' : isSpeaking ? 'Speaking' : 'Connected'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Connection indicator for multiple participants */}
            {participantList.length > 0 && (
              <div className="flex justify-center mt-8">
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium bg-emerald-50 px-4 py-2 rounded-full border border-emerald-200">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{participantList.length + 1} participants connected</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Waiting for participant
          <div className="text-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 rounded-full border-2 border-slate-200 animate-pulse scale-110" />
              <Avatar
                src={localProfile?.avatar_url}
                alt={localProfile?.display_name || 'You'}
                size="xl"
                className="w-32 h-32 mx-auto relative z-10"
              />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">
              {connectionState === 'connecting' ? 'Connecting...' : 'Waiting for participants'}
            </h3>
            <p className="text-slate-500 text-lg">Share the meeting link to invite others</p>
            {connectionState === 'connecting' && (
              <div className="flex justify-center gap-1 mt-6">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Connection State Info */}
      {connectionState !== 'connected' && connectionState !== 'new' && !hasParticipants && (
        <div className="absolute top-6 left-6 bg-amber-50 backdrop-blur-md text-amber-700 px-4 py-2 rounded-xl text-sm font-medium border border-amber-200">
          {connectionState}
        </div>
      )}
    </div>
  );
}
