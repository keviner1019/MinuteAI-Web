'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/config';

interface AudioCallProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  remoteStreamVersion: number;
  isConnected: boolean;
  connectionState: RTCPeerConnectionState;
  remoteUserProfile?: { display_name: string | null; avatar_url: string | null } | null;
}

export function AudioCall({
  localStream,
  remoteStream,
  remoteStreamVersion,
  isConnected,
  connectionState,
  remoteUserProfile,
}: AudioCallProps) {
  const { user } = useAuth();
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const [hasRemoteAudio, setHasRemoteAudio] = useState(false);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0);
  const [isLocalMonitorEnabled, setIsLocalMonitorEnabled] = useState(false);
  const [localProfile, setLocalProfile] = useState<{
    display_name: string;
    avatar_url: string;
  } | null>(null);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [isRemoteSpeaking, setIsRemoteSpeaking] = useState(false);

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
    const SPEAKING_THRESHOLD = 0.1; // Adjust this threshold as needed
    setIsLocalSpeaking(localAudioLevel > SPEAKING_THRESHOLD);
  }, [localAudioLevel]);

  useEffect(() => {
    const SPEAKING_THRESHOLD = 0.1;
    setIsRemoteSpeaking(remoteAudioLevel > SPEAKING_THRESHOLD);
  }, [remoteAudioLevel]);

  // Setup local audio monitoring (for testing on same device)
  useEffect(() => {
    if (!localStream || !localAudioRef.current || !isLocalMonitorEnabled) {
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = null;
      }
      return;
    }

    localAudioRef.current.srcObject = localStream;
    localAudioRef.current.volume = 0.5; // Reduce volume to prevent feedback
  }, [localStream, isLocalMonitorEnabled]);

  // Setup remote audio
  useEffect(() => {
    console.log('🔄 AudioCall remoteStream useEffect triggered!', {
      hasRemoteAudioRef: !!remoteAudioRef.current,
      hasRemoteStream: !!remoteStream,
      remoteStreamVersion,
      trackCount: remoteStream?.getTracks().length || 0,
    });

    if (!remoteStream) {
      setHasRemoteAudio(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      if (!remoteAudioRef.current || !remoteStream) {
        console.log('⚠️ Audio ref or stream not available yet');
        setHasRemoteAudio(false);
        return;
      }

      console.log('🎵 Setting remote audio stream:', remoteStream);
      console.log('🎵 Remote stream ID:', remoteStream.id);
      console.log(
        '🎵 All tracks:',
        remoteStream.getTracks().map((t) => ({
          kind: t.kind,
          id: t.id,
          enabled: t.enabled,
          muted: t.muted,
          readyState: t.readyState,
          label: t.label,
        }))
      );

      remoteAudioRef.current.srcObject = remoteStream;
      console.log('✅ Set srcObject on remote audio element');

      const audioTracks = remoteStream.getAudioTracks();
      console.log('🎵 Audio tracks count:', audioTracks.length);

      if (audioTracks.length > 0) {
        const activeAudioTracks = audioTracks.filter((t) => t.enabled && t.readyState === 'live');
        console.log('🎵 Active audio tracks:', activeAudioTracks.length);
        setHasRemoteAudio(activeAudioTracks.length > 0);
      } else {
        console.log('🎵 No audio tracks found');
        setHasRemoteAudio(false);
      }
    }, 0);

    const handleTrackChange = () => {
      if (!remoteStream) return;
      const aTracks = remoteStream.getAudioTracks();
      const activeATracks = aTracks.filter((t) => t.enabled && t.readyState === 'live');
      console.log('🎵 Track change detected - Active audio tracks:', activeATracks.length);
      setHasRemoteAudio(activeATracks.length > 0);
    };

    const handleAddTrack = (event: MediaStreamTrackEvent) => {
      console.log('🎵 New track added:', event.track.kind, event.track.id);
      handleTrackChange();
    };

    remoteStream.addEventListener('addtrack', handleAddTrack);

    remoteStream.getTracks().forEach((track) => {
      track.addEventListener('enabled', handleTrackChange);
      track.addEventListener('mute', handleTrackChange);
      track.addEventListener('unmute', handleTrackChange);
    });

    return () => {
      clearTimeout(timeoutId);
      if (remoteStream) {
        remoteStream.removeEventListener('addtrack', handleAddTrack);
        remoteStream.getTracks().forEach((track) => {
          track.removeEventListener('enabled', handleTrackChange);
          track.removeEventListener('mute', handleTrackChange);
          track.removeEventListener('unmute', handleTrackChange);
        });
      }
    };
  }, [remoteStream, remoteStreamVersion]);

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

  // Audio level visualization for remote stream
  useEffect(() => {
    if (!remoteStream) return;

    const audioTrack = remoteStream.getAudioTracks()[0];
    if (!audioTrack) return;

    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(remoteStream);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      source.connect(analyser);
      analyser.fftSize = 256;

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setRemoteAudioLevel(average / 255);
        requestAnimationFrame(updateLevel);
      };

      updateLevel();

      return () => {
        source.disconnect();
        audioContext.close();
      };
    } catch (error) {
      console.error('Error setting up remote audio visualization:', error);
    }
  }, [remoteStream]);

  return (
    <div className="flex-1 relative bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Main Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isConnected ? (
          // Connected - Show audio visualization with avatars
          <div className="text-center">
            <div className="flex items-center justify-center gap-24 mb-8">
              {/* Local User Audio Indicator */}
              <div className="flex flex-col items-center">
                <div className="mb-6">
                  <Avatar
                    src={localProfile?.avatar_url}
                    alt={localProfile?.display_name || 'You'}
                    size="xl"
                    isSpeaking={isLocalSpeaking && localStream?.getAudioTracks()[0]?.enabled}
                    className="w-40 h-40"
                  />
                </div>
                <p className="text-gray-900 text-lg font-medium mb-1">
                  {localProfile?.display_name || 'You'}
                </p>
                <div className="flex items-center gap-2 text-blue-600">
                  {localStream && localStream.getAudioTracks()[0]?.enabled ? (
                    <>
                      <Volume2 size={20} />
                      <span className="text-sm">{isLocalSpeaking ? 'Speaking' : 'Connected'}</span>
                    </>
                  ) : (
                    <>
                      <VolumeX size={20} />
                      <span className="text-sm">Muted</span>
                    </>
                  )}
                </div>
              </div>

              {/* Remote User Audio Indicator */}
              <div className="flex flex-col items-center">
                <div className="mb-6">
                  <Avatar
                    src={remoteUserProfile?.avatar_url}
                    alt={remoteUserProfile?.display_name || 'Participant'}
                    size="xl"
                    isSpeaking={isRemoteSpeaking && hasRemoteAudio}
                    className="w-40 h-40"
                  />
                </div>
                <p className="text-gray-900 text-lg font-medium mb-1">
                  {remoteUserProfile?.display_name || 'Participant'}
                </p>
                <div className="flex items-center gap-2 text-violet-600">
                  {hasRemoteAudio ? (
                    <>
                      <Volume2 size={20} />
                      <span className="text-sm">{isRemoteSpeaking ? 'Speaking' : 'Connected'}</span>
                    </>
                  ) : (
                    <>
                      <VolumeX size={20} />
                      <span className="text-sm">Muted</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Connection Status */}
            <div className="bg-green-50 border border-green-600 text-green-700 px-6 py-3 rounded-full inline-flex items-center gap-3">
              <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse"></div>
              <span className="font-medium">Audio Connected</span>
            </div>
          </div>
        ) : (
          // Waiting for participant
          <div className="text-center text-gray-900">
            <div className="mb-6">
              <Avatar
                src={localProfile?.avatar_url}
                alt={localProfile?.display_name || 'You'}
                size="xl"
                className="w-32 h-32 mx-auto"
              />
            </div>
            <h3 className="text-2xl font-semibold mb-2">
              {connectionState === 'connecting' ? 'Connecting...' : 'Waiting for participant'}
            </h3>
            <p className="text-gray-600">Share the meeting link to invite someone</p>
          </div>
        )}
      </div>

      {/* Connection Status Badge */}
      {isConnected && (
        <div className="absolute top-6 left-6 bg-green-600 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 shadow-lg">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          Connected
        </div>
      )}

      {/* Connection State Info */}
      {connectionState !== 'connected' && connectionState !== 'new' && (
        <div className="absolute top-6 left-6 bg-yellow-600 text-white px-4 py-2 rounded-full text-sm shadow-lg">
          {connectionState}
        </div>
      )}

      {/* Audio elements */}
      <audio ref={remoteAudioRef} autoPlay playsInline />
      <audio ref={localAudioRef} autoPlay playsInline />
    </div>
  );
}
