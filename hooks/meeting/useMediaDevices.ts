// Hook for managing media devices (camera, microphone)
// Based on MEETING_MODULE_RECONSTRUCTION_PLAN.md

import { useState, useEffect, useCallback, useRef } from 'react';
import { AUDIO_CONSTRAINTS, VIDEO_CONSTRAINTS, SCREEN_SHARE_CONSTRAINTS } from '@/lib/webrtc-v2/config';

export interface MediaDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'videoinput' | 'audiooutput';
}

export interface MediaPermissions {
  camera: 'granted' | 'denied' | 'prompt' | 'unknown';
  microphone: 'granted' | 'denied' | 'prompt' | 'unknown';
}

export interface UseMediaDevicesReturn {
  // Devices
  audioInputDevices: MediaDevice[];
  videoInputDevices: MediaDevice[];
  audioOutputDevices: MediaDevice[];
  selectedAudioInput: string | null;
  selectedVideoInput: string | null;
  selectedAudioOutput: string | null;
  
  // Streams
  localAudioStream: MediaStream | null;
  localVideoStream: MediaStream | null;
  localScreenStream: MediaStream | null;
  
  // Permissions
  permissions: MediaPermissions;
  
  // Actions
  requestAudioPermission: () => Promise<boolean>;
  requestVideoPermission: () => Promise<boolean>;
  startAudio: () => Promise<MediaStream>;
  startVideo: () => Promise<MediaStream>;
  startScreenShare: () => Promise<MediaStream>;
  stopAudio: () => void;
  stopVideo: () => void;
  stopScreenShare: () => void;
  switchAudioInput: (deviceId: string) => Promise<void>;
  switchVideoInput: (deviceId: string) => Promise<void>;
  switchAudioOutput: (deviceId: string) => Promise<void>;
  
  // Audio control
  muteAudio: () => void;
  unmuteAudio: () => void;
  setVolume: (volume: number) => void;
  
  // State
  isAudioActive: boolean;
  isVideoActive: boolean;
  isScreenShareActive: boolean;
  isAudioMuted: boolean;
  volume: number;
  
  // Utilities
  refreshDevices: () => Promise<void>;
  hasMediaDevices: boolean;
  isMediaSupported: boolean;
}

export function useMediaDevices(): UseMediaDevicesReturn {
  // Device lists
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDevice[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDevice[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDevice[]>([]);
  
  // Selected devices
  const [selectedAudioInput, setSelectedAudioInput] = useState<string | null>(null);
  const [selectedVideoInput, setSelectedVideoInput] = useState<string | null>(null);
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string | null>(null);
  
  // Streams
  const [localAudioStream, setLocalAudioStream] = useState<MediaStream | null>(null);
  const [localVideoStream, setLocalVideoStream] = useState<MediaStream | null>(null);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  
  // Permissions
  const [permissions, setPermissions] = useState<MediaPermissions>({
    camera: 'unknown',
    microphone: 'unknown',
  });
  
  // Audio state
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [volume, setVolumeState] = useState(1.0);
  
  // Audio context for volume control
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  
  // Computed state
  const isAudioActive = localAudioStream !== null;
  const isVideoActive = localVideoStream !== null;
  const isScreenShareActive = localScreenStream !== null;
  const hasMediaDevices = audioInputDevices.length > 0 || videoInputDevices.length > 0;
  const isMediaSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices;
  
  // ==============================================
  // DEVICE ENUMERATION
  // ==============================================
  
  const refreshDevices = useCallback(async () => {
    if (!isMediaSupported) {
      console.warn('⚠️ Media devices not supported');
      return;
    }
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const audioInputs: MediaDevice[] = [];
      const videoInputs: MediaDevice[] = [];
      const audioOutputs: MediaDevice[] = [];
      
      devices.forEach((device) => {
        const mediaDevice: MediaDevice = {
          deviceId: device.deviceId,
          label: device.label || `${device.kind} (${device.deviceId.slice(0, 8)})`,
          kind: device.kind as 'audioinput' | 'videoinput' | 'audiooutput',
        };
        
        if (device.kind === 'audioinput') {
          audioInputs.push(mediaDevice);
        } else if (device.kind === 'videoinput') {
          videoInputs.push(mediaDevice);
        } else if (device.kind === 'audiooutput') {
          audioOutputs.push(mediaDevice);
        }
      });
      
      setAudioInputDevices(audioInputs);
      setVideoInputDevices(videoInputs);
      setAudioOutputDevices(audioOutputs);
      
      // Select default devices if none selected
      if (!selectedAudioInput && audioInputs.length > 0) {
        setSelectedAudioInput(audioInputs[0].deviceId);
      }
      if (!selectedVideoInput && videoInputs.length > 0) {
        setSelectedVideoInput(videoInputs[0].deviceId);
      }
      if (!selectedAudioOutput && audioOutputs.length > 0) {
        setSelectedAudioOutput(audioOutputs[0].deviceId);
      }
      
      console.log('🎤 Devices refreshed:', {
        audioInputs: audioInputs.length,
        videoInputs: videoInputs.length,
        audioOutputs: audioOutputs.length,
      });
    } catch (error) {
      console.error('❌ Failed to enumerate devices:', error);
    }
  }, [isMediaSupported, selectedAudioInput, selectedVideoInput, selectedAudioOutput]);
  
  // ==============================================
  // PERMISSIONS
  // ==============================================
  
  const requestAudioPermission = useCallback(async (): Promise<boolean> => {
    if (!isMediaSupported) return false;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      
      setPermissions((prev) => ({ ...prev, microphone: 'granted' }));
      await refreshDevices();
      
      return true;
    } catch (error) {
      console.error('❌ Audio permission denied:', error);
      setPermissions((prev) => ({ ...prev, microphone: 'denied' }));
      return false;
    }
  }, [isMediaSupported, refreshDevices]);
  
  const requestVideoPermission = useCallback(async (): Promise<boolean> => {
    if (!isMediaSupported) return false;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      
      setPermissions((prev) => ({ ...prev, camera: 'granted' }));
      await refreshDevices();
      
      return true;
    } catch (error) {
      console.error('❌ Video permission denied:', error);
      setPermissions((prev) => ({ ...prev, camera: 'denied' }));
      return false;
    }
  }, [isMediaSupported, refreshDevices]);
  
  // ==============================================
  // AUDIO STREAM
  // ==============================================
  
  const startAudio = useCallback(async (): Promise<MediaStream> => {
    if (!isMediaSupported) {
      throw new Error('Media devices not supported');
    }
    
    try {
      console.log('🎤 Starting audio...');
      
      const constraints: MediaStreamConstraints = {
        audio: selectedAudioInput
          ? { ...(AUDIO_CONSTRAINTS.audio as MediaTrackConstraints), deviceId: { exact: selectedAudioInput } }
          : AUDIO_CONSTRAINTS.audio,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Set up audio processing
      setupAudioProcessing(stream);
      
      setLocalAudioStream(stream);
      setPermissions((prev) => ({ ...prev, microphone: 'granted' }));
      
      console.log('✅ Audio started');
      return stream;
    } catch (error) {
      console.error('❌ Failed to start audio:', error);
      setPermissions((prev) => ({ ...prev, microphone: 'denied' }));
      throw error;
    }
  }, [isMediaSupported, selectedAudioInput]);
  
  const stopAudio = useCallback(() => {
    if (localAudioStream) {
      localAudioStream.getTracks().forEach((track) => track.stop());
      setLocalAudioStream(null);
      console.log('🎤 Audio stopped');
    }
  }, [localAudioStream]);
  
  // ==============================================
  // VIDEO STREAM
  // ==============================================
  
  const startVideo = useCallback(async (): Promise<MediaStream> => {
    if (!isMediaSupported) {
      throw new Error('Media devices not supported');
    }
    
    try {
      console.log('📹 Starting video...');
      
      const constraints: MediaStreamConstraints = {
        video: selectedVideoInput
          ? { ...(VIDEO_CONSTRAINTS.video as MediaTrackConstraints), deviceId: { exact: selectedVideoInput } }
          : VIDEO_CONSTRAINTS.video,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalVideoStream(stream);
      setPermissions((prev) => ({ ...prev, camera: 'granted' }));
      
      console.log('✅ Video started');
      return stream;
    } catch (error) {
      console.error('❌ Failed to start video:', error);
      setPermissions((prev) => ({ ...prev, camera: 'denied' }));
      throw error;
    }
  }, [isMediaSupported, selectedVideoInput]);
  
  const stopVideo = useCallback(() => {
    if (localVideoStream) {
      localVideoStream.getTracks().forEach((track) => track.stop());
      setLocalVideoStream(null);
      console.log('📹 Video stopped');
    }
  }, [localVideoStream]);
  
  // ==============================================
  // SCREEN SHARE
  // ==============================================
  
  const startScreenShare = useCallback(async (): Promise<MediaStream> => {
    if (!isMediaSupported || !navigator.mediaDevices.getDisplayMedia) {
      throw new Error('Screen sharing not supported');
    }
    
    try {
      console.log('🖥️ Starting screen share...');
      
      const stream = await navigator.mediaDevices.getDisplayMedia(SCREEN_SHARE_CONSTRAINTS);
      
      // Listen for user stopping share via browser UI
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('🖥️ Screen share stopped by user');
        setLocalScreenStream(null);
      });
      
      setLocalScreenStream(stream);
      
      console.log('✅ Screen share started');
      return stream;
    } catch (error) {
      console.error('❌ Failed to start screen share:', error);
      throw error;
    }
  }, [isMediaSupported]);
  
  const stopScreenShare = useCallback(() => {
    if (localScreenStream) {
      localScreenStream.getTracks().forEach((track) => track.stop());
      setLocalScreenStream(null);
      console.log('🖥️ Screen share stopped');
    }
  }, [localScreenStream]);
  
  // ==============================================
  // DEVICE SWITCHING
  // ==============================================
  
  const switchAudioInput = useCallback(
    async (deviceId: string) => {
      console.log('🎤 Switching audio input to:', deviceId);
      
      const wasActive = isAudioActive;
      
      if (wasActive) {
        stopAudio();
      }
      
      setSelectedAudioInput(deviceId);
      
      if (wasActive) {
        await startAudio();
      }
    },
    [isAudioActive, stopAudio, startAudio]
  );
  
  const switchVideoInput = useCallback(
    async (deviceId: string) => {
      console.log('📹 Switching video input to:', deviceId);
      
      const wasActive = isVideoActive;
      
      if (wasActive) {
        stopVideo();
      }
      
      setSelectedVideoInput(deviceId);
      
      if (wasActive) {
        await startVideo();
      }
    },
    [isVideoActive, stopVideo, startVideo]
  );
  
  const switchAudioOutput = useCallback(async (deviceId: string) => {
    console.log('🔊 Switching audio output to:', deviceId);
    setSelectedAudioOutput(deviceId);
    
    // Note: Setting audio output device requires HTMLMediaElement.setSinkId()
    // This would be implemented in the audio player component
  }, []);
  
  // ==============================================
  // AUDIO CONTROL
  // ==============================================
  
  const setupAudioProcessing = useCallback((stream: MediaStream) => {
    try {
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const gainNode = audioContextRef.current.createGain();
      
      gainNode.gain.value = volume;
      source.connect(gainNode);
      
      gainNodeRef.current = gainNode;
    } catch (error) {
      console.error('Failed to set up audio processing:', error);
    }
  }, [volume]);
  
  const muteAudio = useCallback(() => {
    if (localAudioStream) {
      localAudioStream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
      setIsAudioMuted(true);
      console.log('🔇 Audio muted');
    }
  }, [localAudioStream]);
  
  const unmuteAudio = useCallback(() => {
    if (localAudioStream) {
      localAudioStream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      setIsAudioMuted(false);
      console.log('🔊 Audio unmuted');
    }
  }, [localAudioStream]);
  
  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = clampedVolume;
    }
    
    console.log('🔊 Volume set to:', clampedVolume);
  }, []);
  
  // ==============================================
  // LIFECYCLE
  // ==============================================
  
  // Initialize devices on mount
  useEffect(() => {
    if (isMediaSupported) {
      refreshDevices();
      
      // Listen for device changes
      navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
      
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
      };
    }
  }, [isMediaSupported, refreshDevices]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      stopVideo();
      stopScreenShare();
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopAudio, stopVideo, stopScreenShare]);
  
  // ==============================================
  // RETURN
  // ==============================================
  
  return {
    // Devices
    audioInputDevices,
    videoInputDevices,
    audioOutputDevices,
    selectedAudioInput,
    selectedVideoInput,
    selectedAudioOutput,
    
    // Streams
    localAudioStream,
    localVideoStream,
    localScreenStream,
    
    // Permissions
    permissions,
    
    // Actions
    requestAudioPermission,
    requestVideoPermission,
    startAudio,
    startVideo,
    startScreenShare,
    stopAudio,
    stopVideo,
    stopScreenShare,
    switchAudioInput,
    switchVideoInput,
    switchAudioOutput,
    
    // Audio control
    muteAudio,
    unmuteAudio,
    setVolume,
    
    // State
    isAudioActive,
    isVideoActive,
    isScreenShareActive,
    isAudioMuted,
    volume,
    
    // Utilities
    refreshDevices,
    hasMediaDevices,
    isMediaSupported,
  };
}
