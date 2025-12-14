// Hook for managing participant state and audio/video streams
// Based on MEETING_MODULE_RECONSTRUCTION_PLAN.md

import { useEffect, useState, useCallback, useRef } from 'react';
import { useMeetingStore } from '@/lib/store/meeting-store';
import type { Participant } from '@/types/meeting';

export interface ParticipantStream {
  participantId: string;
  audioStream: MediaStream | null;
  videoStream: MediaStream | null;
  screenShareStream: MediaStream | null;
}

export interface UseParticipantsReturn {
  // Participant lists
  participants: Participant[];
  activeParticipants: Participant[];
  connectedParticipants: Participant[];
  
  // Streams
  participantStreams: Map<string, ParticipantStream>;
  
  // Getters
  getParticipant: (participantId: string) => Participant | undefined;
  getParticipantStream: (participantId: string) => ParticipantStream | undefined;
  getAudioStream: (participantId: string) => MediaStream | null;
  getVideoStream: (participantId: string) => MediaStream | null;
  getScreenShareStream: (participantId: string) => MediaStream | null;
  
  // Audio analysis
  getAudioLevel: (participantId: string) => number;
  isSpeaking: (participantId: string) => boolean;
  
  // Utilities
  participantCount: number;
  connectedCount: number;
}

export function useParticipants(): UseParticipantsReturn {
  const { participants: participantsMap, peerConnections } = useMeetingStore();
  
  // Convert Map to Array
  const participants = Array.from(participantsMap.values());
  
  // Stream management
  const [participantStreams, setParticipantStreams] = useState<Map<string, ParticipantStream>>(
    new Map()
  );
  
  // Audio analysis
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnalyzersRef = useRef<Map<string, AnalyserNode>>(new Map());
  const audioLevelsRef = useRef<Map<string, number>>(new Map());
  const speakingStateRef = useRef<Map<string, boolean>>(new Map());
  
  // Constants
  const SPEAKING_THRESHOLD = 0.1; // Audio level threshold for "speaking"
  const AUDIO_ANALYSIS_INTERVAL = 100; // ms
  
  // ==============================================
  // COMPUTED VALUES
  // ==============================================
  
  const activeParticipants = participants.filter(
    (p) => p.connectionState !== 'disconnected' && p.connectionState !== 'failed'
  );
  
  const connectedParticipants = participants.filter(
    (p) => p.connectionState === 'connected'
  );
  
  const participantCount = participants.length;
  const connectedCount = connectedParticipants.length;
  
  // ==============================================
  // STREAM TRACKING
  // ==============================================
  
  useEffect(() => {
    // Listen for track events from peer connections
    const handleTrackEvent = (participantId: string, track: MediaStreamTrack, stream: MediaStream) => {
      console.log(`🎵 Track received from ${participantId}:`, track.kind);
      
      setParticipantStreams((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(participantId) || {
          participantId,
          audioStream: null,
          videoStream: null,
          screenShareStream: null,
        };
        
        // Determine stream type
        if (track.kind === 'audio') {
          existing.audioStream = stream;
          
          // Set up audio analysis
          setupAudioAnalyzer(participantId, stream);
        } else if (track.kind === 'video') {
          // Check if it's screen share or regular video
          // Screen share usually has higher resolution or specific label
          const isScreenShare = stream.id.includes('screen') || 
                               track.label.includes('screen');
          
          if (isScreenShare) {
            existing.screenShareStream = stream;
          } else {
            existing.videoStream = stream;
          }
        }
        
        updated.set(participantId, existing);
        return updated;
      });
    };
    
    // Set up listeners for each peer connection
    peerConnections.forEach((peerState, participantId) => {
      // This would connect to PeerConnection events
      // In real implementation, this would be handled by PeerManager events
    });
    
    return () => {
      // Cleanup audio analyzers
      audioAnalyzersRef.current.clear();
      audioLevelsRef.current.clear();
      speakingStateRef.current.clear();
    };
  }, [peerConnections]);
  
  // ==============================================
  // AUDIO ANALYSIS
  // ==============================================
  
  const setupAudioAnalyzer = useCallback((participantId: string, stream: MediaStream) => {
    try {
      // Create audio context if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      const audioContext = audioContextRef.current;
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      
      analyzer.fftSize = 256;
      analyzer.smoothingTimeConstant = 0.8;
      
      source.connect(analyzer);
      audioAnalyzersRef.current.set(participantId, analyzer);
      
      console.log(`🎤 Audio analyzer set up for ${participantId}`);
      
      // Start analyzing
      startAudioAnalysis(participantId);
    } catch (error) {
      console.error(`Failed to set up audio analyzer for ${participantId}:`, error);
    }
  }, []);
  
  const startAudioAnalysis = useCallback((participantId: string) => {
    const analyzer = audioAnalyzersRef.current.get(participantId);
    if (!analyzer) return;
    
    const dataArray = new Uint8Array(analyzer.frequencyBinCount);
    
    const analyze = () => {
      analyzer.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const sum = dataArray.reduce((acc, val) => acc + val, 0);
      const average = sum / dataArray.length;
      const normalizedLevel = average / 255;
      
      audioLevelsRef.current.set(participantId, normalizedLevel);
      
      // Determine speaking state
      const isSpeaking = normalizedLevel > SPEAKING_THRESHOLD;
      const wasSpeaking = speakingStateRef.current.get(participantId) || false;
      
      if (isSpeaking !== wasSpeaking) {
        speakingStateRef.current.set(participantId, isSpeaking);
        console.log(`🗣️ ${participantId} speaking: ${isSpeaking}`);
      }
      
      // Continue analysis
      setTimeout(analyze, AUDIO_ANALYSIS_INTERVAL);
    };
    
    analyze();
  }, []);
  
  // ==============================================
  // GETTERS
  // ==============================================
  
  const getParticipant = useCallback(
    (participantId: string): Participant | undefined => {
      return participants.find((p) => p.id === participantId);
    },
    [participants]
  );
  
  const getParticipantStream = useCallback(
    (participantId: string): ParticipantStream | undefined => {
      return participantStreams.get(participantId);
    },
    [participantStreams]
  );
  
  const getAudioStream = useCallback(
    (participantId: string): MediaStream | null => {
      return participantStreams.get(participantId)?.audioStream || null;
    },
    [participantStreams]
  );
  
  const getVideoStream = useCallback(
    (participantId: string): MediaStream | null => {
      return participantStreams.get(participantId)?.videoStream || null;
    },
    [participantStreams]
  );
  
  const getScreenShareStream = useCallback(
    (participantId: string): MediaStream | null => {
      return participantStreams.get(participantId)?.screenShareStream || null;
    },
    [participantStreams]
  );
  
  const getAudioLevel = useCallback(
    (participantId: string): number => {
      return audioLevelsRef.current.get(participantId) || 0;
    },
    []
  );
  
  const isSpeaking = useCallback(
    (participantId: string): boolean => {
      return speakingStateRef.current.get(participantId) || false;
    },
    []
  );
  
  // ==============================================
  // CLEANUP
  // ==============================================
  
  useEffect(() => {
    // Clean up streams when participants leave
    participantStreams.forEach((stream, participantId) => {
      const participant = participants.find((p) => p.id === participantId);
      
      if (!participant || participant.connectionState === 'disconnected') {
        // Stop all tracks
        stream.audioStream?.getTracks().forEach((track) => track.stop());
        stream.videoStream?.getTracks().forEach((track) => track.stop());
        stream.screenShareStream?.getTracks().forEach((track) => track.stop());
        
        // Remove from map
        setParticipantStreams((prev) => {
          const updated = new Map(prev);
          updated.delete(participantId);
          return updated;
        });
        
        // Remove audio analyzer
        audioAnalyzersRef.current.delete(participantId);
        audioLevelsRef.current.delete(participantId);
        speakingStateRef.current.delete(participantId);
      }
    });
  }, [participants, participantStreams]);
  
  // ==============================================
  // UNMOUNT CLEANUP
  // ==============================================
  
  useEffect(() => {
    return () => {
      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      // Stop all streams
      participantStreams.forEach((stream) => {
        stream.audioStream?.getTracks().forEach((track) => track.stop());
        stream.videoStream?.getTracks().forEach((track) => track.stop());
        stream.screenShareStream?.getTracks().forEach((track) => track.stop());
      });
    };
  }, [participantStreams]);
  
  // ==============================================
  // RETURN
  // ==============================================
  
  return {
    // Participant lists
    participants,
    activeParticipants,
    connectedParticipants,
    
    // Streams
    participantStreams,
    
    // Getters
    getParticipant,
    getParticipantStream,
    getAudioStream,
    getVideoStream,
    getScreenShareStream,
    
    // Audio analysis
    getAudioLevel,
    isSpeaking,
    
    // Utilities
    participantCount,
    connectedCount,
  };
}
