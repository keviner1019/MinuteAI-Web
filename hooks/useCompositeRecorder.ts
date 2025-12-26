import { useState, useRef, useCallback, useEffect } from 'react';
import { createClient, type AppSupabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';
import type { Participant } from '@/types';

interface UserProfile {
  display_name?: string;
  avatar_url?: string;
}

interface ParticipantForRecording {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  videoStream: MediaStream | null;
  audioStream: MediaStream | null;
  isLocal: boolean;
  connectionState?: RTCPeerConnectionState | 'connected' | 'new';
}

interface RecordingConfig {
  resolution?: { width: number; height: number };
  frameRate?: number;
  videoBitrate?: number;
  maxParticipantsPerRow?: number;
}

const DEFAULT_CONFIG: RecordingConfig = {
  resolution: { width: 1920, height: 1080 },
  frameRate: 30,
  videoBitrate: 2500000,
  maxParticipantsPerRow: 3,
};

type LayoutMode = 'grid' | 'spotlight' | 'speaker';

export function useCompositeRecorder(meetingId: string | null) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const mediaChunks = useRef<Blob[]>([]);
  const startTime = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>(0);
  const compositeStream = useRef<MediaStream | null>(null);
  const stopPromiseRef = useRef<Promise<void> | null>(null);
  const stopPromiseResolveRef = useRef<(() => void) | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Store participants for multi-user recording
  const participantsRef = useRef<Map<string, ParticipantForRecording>>(new Map());
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const avatarImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const configRef = useRef<RecordingConfig>(DEFAULT_CONFIG);
  const layoutModeRef = useRef<LayoutMode>('grid');
  const pinnedUserIdRef = useRef<string | null>(null);
  const speakingUserIdRef = useRef<string | null>(null);

  // Audio context for mixing multiple audio streams
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const audioSourcesRef = useRef<Map<string, MediaStreamAudioSourceNode>>(new Map());

  // Reconnection handling
  const disconnectedParticipantsRef = useRef<Set<string>>(new Set());
  const reconnectionAttemptsRef = useRef<Map<string, number>>(new Map());
  const MAX_RECONNECTION_ATTEMPTS = 3;

  const supabase: AppSupabaseClient = createClient();
  type MeetingAudioInsert = Database['public']['Tables']['meeting_audio']['Insert'];
  type MeetingAudioUpdate = Database['public']['Tables']['meeting_audio']['Update'];

  // Calculate optimal grid layout for participants
  const calculateGridLayout = useCallback(
    (participantCount: number, canvasWidth: number, canvasHeight: number) => {
      const maxPerRow = configRef.current.maxParticipantsPerRow || 3;

      if (participantCount === 1) {
        return { cols: 1, rows: 1, tileWidth: canvasWidth, tileHeight: canvasHeight };
      }

      if (participantCount === 2) {
        return {
          cols: 2,
          rows: 1,
          tileWidth: canvasWidth / 2 - 5,
          tileHeight: canvasHeight - 80,
        };
      }

      const cols = Math.min(maxPerRow, Math.ceil(Math.sqrt(participantCount)));
      const rows = Math.ceil(participantCount / cols);

      const tileWidth = (canvasWidth - (cols + 1) * 10) / cols;
      const tileHeight = (canvasHeight - 80 - (rows + 1) * 10) / rows;

      return { cols, rows, tileWidth, tileHeight };
    },
    []
  );

  // Draw a single participant tile on the canvas
  const drawParticipantTile = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      participant: ParticipantForRecording,
      x: number,
      y: number,
      width: number,
      height: number
    ) => {
      const video = videoElementsRef.current.get(participant.userId);
      const avatar = avatarImagesRef.current.get(participant.userId);
      const hasVideo = video && video.readyState >= 2 && participant.videoStream;
      const isDisconnected =
        participant.connectionState === 'disconnected' ||
        participant.connectionState === 'failed' ||
        disconnectedParticipantsRef.current.has(participant.userId);

      // Draw background
      ctx.fillStyle = isDisconnected ? '#4b5563' : '#374151';
      ctx.fillRect(x, y, width, height);

      if (hasVideo && !isDisconnected) {
        // Draw video with proper aspect ratio
        const videoWidth = video.videoWidth || 640;
        const videoHeight = video.videoHeight || 480;
        const videoAspect = videoWidth / videoHeight;
        const tileAspect = width / height;

        let drawWidth = width;
        let drawHeight = height;
        let drawX = x;
        let drawY = y;

        if (videoAspect > tileAspect) {
          drawHeight = width / videoAspect;
          drawY = y + (height - drawHeight) / 2;
        } else {
          drawWidth = height * videoAspect;
          drawX = x + (width - drawWidth) / 2;
        }

        // Mirror local video
        if (participant.isLocal) {
          ctx.save();
          ctx.translate(x + width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, width - drawX - drawWidth + x, drawY, drawWidth, drawHeight);
          ctx.restore();
        } else {
          ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
        }
      } else {
        // Draw avatar or initials
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const avatarSize = Math.min(width, height) * 0.4;

        if (avatar?.complete && avatar.naturalWidth > 0) {
          // Draw circular avatar
          ctx.save();
          ctx.beginPath();
          ctx.arc(centerX, centerY, avatarSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(
            avatar,
            centerX - avatarSize / 2,
            centerY - avatarSize / 2,
            avatarSize,
            avatarSize
          );
          ctx.restore();
        } else {
          // Draw initials circle
          const color = participant.isLocal ? '#6366f1' : '#10b981';
          ctx.fillStyle = isDisconnected ? '#6b7280' : color;
          ctx.beginPath();
          ctx.arc(centerX, centerY, avatarSize / 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${avatarSize * 0.5}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const initial = (participant.displayName || (participant.isLocal ? 'Y' : 'G'))[0].toUpperCase();
          ctx.fillText(initial, centerX, centerY);
        }

        // Show disconnected overlay
        if (isDisconnected) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(x, y, width, height);

          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Reconnecting...', centerX, centerY + avatarSize / 2 + 20);
        }
      }

      // Draw name label
      const labelHeight = 30;
      const labelY = y + height - labelHeight;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(x, labelY, width, labelHeight);

      ctx.fillStyle = '#ffffff';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const displayName = participant.isLocal
        ? 'You'
        : participant.displayName || 'Guest';
      ctx.fillText(displayName, x + width / 2, labelY + labelHeight / 2);

      // Draw thin border
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
    },
    []
  );

  // Create and update the composite stream
  const createCompositeStream = useCallback(
    async (
      participants: ParticipantForRecording[],
      config: RecordingConfig = DEFAULT_CONFIG
    ): Promise<MediaStream | null> => {
      configRef.current = config;

      const { width, height } = config.resolution || { width: 1920, height: 1080 };

      // Create canvas for composite video
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvasRef.current = canvas;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Store participants
      participantsRef.current.clear();
      videoElementsRef.current.clear();
      avatarImagesRef.current.clear();

      for (const participant of participants) {
        participantsRef.current.set(participant.userId, participant);

        // Create video element
        if (participant.videoStream) {
          const video = document.createElement('video');
          video.srcObject = participant.videoStream;
          video.muted = true;
          video.playsInline = true;
          video.play().catch(console.error);
          videoElementsRef.current.set(participant.userId, video);
        }

        // Load avatar image
        if (participant.avatarUrl) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = participant.avatarUrl;
          avatarImagesRef.current.set(participant.userId, img);
        }
      }

      // Setup audio mixing
      try {
        audioContextRef.current = new AudioContext();
        audioDestinationRef.current = audioContextRef.current.createMediaStreamDestination();
        audioSourcesRef.current.clear();

        for (const participant of participants) {
          if (participant.audioStream) {
            const source = audioContextRef.current.createMediaStreamSource(
              participant.audioStream
            );
            source.connect(audioDestinationRef.current);
            audioSourcesRef.current.set(participant.userId, source);
          }
        }
      } catch (err) {
        console.error('Failed to setup audio mixing:', err);
      }

      // Drawing function
      const draw = () => {
        const currentParticipants = Array.from(participantsRef.current.values());
        const participantCount = currentParticipants.length;

        // Clear canvas with background
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add recording indicator
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(30, 30, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('REC', 45, 30);

        // Draw duration
        const duration = Math.floor((Date.now() - startTime.current) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        ctx.fillText(
          `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
          85,
          30
        );

        if (participantCount === 0) {
          // No participants - show message
          ctx.fillStyle = '#9ca3af';
          ctx.font = '24px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Waiting for participants...', canvas.width / 2, canvas.height / 2);
        } else if (layoutModeRef.current === 'spotlight' && pinnedUserIdRef.current) {
          // Spotlight mode - one large, others in sidebar
          const pinnedParticipant = currentParticipants.find(
            (p) => p.userId === pinnedUserIdRef.current
          );
          const otherParticipants = currentParticipants.filter(
            (p) => p.userId !== pinnedUserIdRef.current
          );

          if (pinnedParticipant) {
            // Draw main spotlight (80% of width)
            const mainWidth = canvas.width * 0.8 - 20;
            const mainHeight = canvas.height - 80;
            drawParticipantTile(ctx, pinnedParticipant, 10, 50, mainWidth, mainHeight);

            // Draw sidebar (20% of width)
            const sidebarWidth = canvas.width * 0.2 - 20;
            const tileHeight = Math.min(120, (mainHeight - 10 * otherParticipants.length) / Math.max(1, otherParticipants.length));
            const sidebarX = mainWidth + 20;

            otherParticipants.forEach((participant, index) => {
              const y = 50 + index * (tileHeight + 10);
              drawParticipantTile(ctx, participant, sidebarX, y, sidebarWidth, tileHeight);
            });
          }
        } else if (layoutModeRef.current === 'speaker' && speakingUserIdRef.current) {
          // Speaker mode - active speaker large
          const speakerParticipant = currentParticipants.find(
            (p) => p.userId === speakingUserIdRef.current
          ) || currentParticipants[0];
          const otherParticipants = currentParticipants.filter(
            (p) => p.userId !== speakerParticipant.userId
          );

          // Draw speaker large
          const mainWidth = canvas.width * 0.75 - 20;
          const mainHeight = canvas.height - 80;
          drawParticipantTile(ctx, speakerParticipant, 10, 50, mainWidth, mainHeight);

          // Draw others in sidebar
          const sidebarWidth = canvas.width * 0.25 - 20;
          const maxVisibleOthers = Math.min(4, otherParticipants.length);
          const tileHeight = Math.min(150, (mainHeight - 10 * maxVisibleOthers) / Math.max(1, maxVisibleOthers));
          const sidebarX = mainWidth + 20;

          otherParticipants.slice(0, maxVisibleOthers).forEach((participant, index) => {
            const y = 50 + index * (tileHeight + 10);
            drawParticipantTile(ctx, participant, sidebarX, y, sidebarWidth, tileHeight);
          });

          // Show "+N more" if there are more participants
          if (otherParticipants.length > maxVisibleOthers) {
            const remaining = otherParticipants.length - maxVisibleOthers;
            ctx.fillStyle = '#6b7280';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
              `+${remaining} more`,
              sidebarX + sidebarWidth / 2,
              50 + maxVisibleOthers * (tileHeight + 10) + 20
            );
          }
        } else {
          // Grid mode
          const { cols, rows, tileWidth, tileHeight } = calculateGridLayout(
            participantCount,
            canvas.width,
            canvas.height
          );

          currentParticipants.forEach((participant, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = 10 + col * (tileWidth + 10);
            const y = 50 + row * (tileHeight + 10);

            drawParticipantTile(ctx, participant, x, y, tileWidth, tileHeight);
          });
        }

        animationFrameRef.current = requestAnimationFrame(draw);
      };

      // Start drawing
      draw();

      // Get video stream from canvas
      const frameRate = config.frameRate || 30;
      const videoStream = canvas.captureStream(frameRate);

      // Combine with mixed audio
      if (audioDestinationRef.current) {
        audioDestinationRef.current.stream.getAudioTracks().forEach((track) => {
          videoStream.addTrack(track);
        });
      }

      compositeStream.current = videoStream;
      return videoStream;
    },
    [calculateGridLayout, drawParticipantTile]
  );

  // Update participant in recording (for connection state changes)
  const updateParticipant = useCallback((userId: string, updates: Partial<ParticipantForRecording>) => {
    const participant = participantsRef.current.get(userId);
    if (participant) {
      Object.assign(participant, updates);

      // Handle reconnection
      if (updates.connectionState === 'connected') {
        disconnectedParticipantsRef.current.delete(userId);
        reconnectionAttemptsRef.current.delete(userId);
      } else if (
        updates.connectionState === 'disconnected' ||
        updates.connectionState === 'failed'
      ) {
        disconnectedParticipantsRef.current.add(userId);
      }

      // Update video element if stream changed
      if (updates.videoStream !== undefined) {
        const existingVideo = videoElementsRef.current.get(userId);
        if (existingVideo) {
          existingVideo.srcObject = updates.videoStream;
          if (updates.videoStream) {
            existingVideo.play().catch(console.error);
          }
        } else if (updates.videoStream) {
          const video = document.createElement('video');
          video.srcObject = updates.videoStream;
          video.muted = true;
          video.playsInline = true;
          video.play().catch(console.error);
          videoElementsRef.current.set(userId, video);
        }
      }

      // Update audio source if stream changed
      if (updates.audioStream !== undefined && audioContextRef.current && audioDestinationRef.current) {
        // Remove old source
        const oldSource = audioSourcesRef.current.get(userId);
        if (oldSource) {
          oldSource.disconnect();
          audioSourcesRef.current.delete(userId);
        }

        // Add new source
        if (updates.audioStream) {
          const source = audioContextRef.current.createMediaStreamSource(updates.audioStream);
          source.connect(audioDestinationRef.current);
          audioSourcesRef.current.set(userId, source);
        }
      }
    }
  }, []);

  // Add participant to recording
  const addParticipant = useCallback((participant: ParticipantForRecording) => {
    // Check if participant already exists - if so, skip to avoid duplicates
    if (participantsRef.current.has(participant.userId)) {
      console.log('Participant already in recording, skipping:', participant.userId);
      return;
    }

    participantsRef.current.set(participant.userId, participant);

    // Create video element
    if (participant.videoStream) {
      const video = document.createElement('video');
      video.srcObject = participant.videoStream;
      video.muted = true;
      video.playsInline = true;
      video.play().catch(console.error);
      videoElementsRef.current.set(participant.userId, video);
    }

    // Load avatar
    if (participant.avatarUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = participant.avatarUrl;
      avatarImagesRef.current.set(participant.userId, img);
    }

    // Add audio source - disconnect any existing source first
    if (participant.audioStream && audioContextRef.current && audioDestinationRef.current) {
      // Disconnect existing source if any
      const existingSource = audioSourcesRef.current.get(participant.userId);
      if (existingSource) {
        existingSource.disconnect();
      }

      const source = audioContextRef.current.createMediaStreamSource(participant.audioStream);
      source.connect(audioDestinationRef.current);
      audioSourcesRef.current.set(participant.userId, source);
    }
  }, []);

  // Remove participant from recording
  const removeParticipant = useCallback((userId: string) => {
    participantsRef.current.delete(userId);
    videoElementsRef.current.delete(userId);
    avatarImagesRef.current.delete(userId);
    disconnectedParticipantsRef.current.delete(userId);
    reconnectionAttemptsRef.current.delete(userId);

    // Disconnect audio source
    const source = audioSourcesRef.current.get(userId);
    if (source) {
      source.disconnect();
      audioSourcesRef.current.delete(userId);
    }
  }, []);

  // Set layout mode
  const setLayoutMode = useCallback((mode: LayoutMode) => {
    layoutModeRef.current = mode;
  }, []);

  // Set pinned user for spotlight mode
  const setPinnedUser = useCallback((userId: string | null) => {
    pinnedUserIdRef.current = userId;
  }, []);

  // Set speaking user for speaker mode
  const setSpeakingUser = useCallback((userId: string | null) => {
    speakingUserIdRef.current = userId;
  }, []);

  // Start recording with multiple participants
  const startRecording = useCallback(
    async (
      localVideoStream: MediaStream | null,
      remoteVideoStream: MediaStream | null,
      audioStream: MediaStream | null,
      localProfile: UserProfile | null,
      remoteProfile: UserProfile | null,
      additionalParticipants?: Map<string, Participant>
    ) => {
      if (!meetingId) {
        console.error('No meeting ID provided');
        setError('No meeting ID provided');
        return;
      }

      try {
        setError(null);

        // Build participants list
        const participants: ParticipantForRecording[] = [];

        // Check if we have additional participants from the Map
        const hasAdditionalParticipants = additionalParticipants && additionalParticipants.size > 0;

        // Add local participant - use local audio stream only
        participants.push({
          userId: 'local',
          displayName: localProfile?.display_name || 'You',
          avatarUrl: localProfile?.avatar_url || null,
          videoStream: localVideoStream,
          audioStream: audioStream, // This should be the local audio
          isLocal: true,
          connectionState: 'connected',
        });

        // Add participants from the Map (new multi-user approach)
        // This properly handles all remote participants without duplicates
        if (hasAdditionalParticipants) {
          additionalParticipants.forEach((p, key) => {
            // Skip local participant keys
            if (key === 'local') return;

            participants.push({
              userId: p.userId,
              displayName: p.displayName,
              avatarUrl: p.avatarUrl,
              videoStream: p.videoStream,
              audioStream: p.stream, // Use their individual audio stream
              isLocal: false,
              connectionState: p.connectionState,
            });
          });
        } else if (remoteVideoStream) {
          // Legacy fallback: only add remote participant if no additionalParticipants Map
          // This maintains backward compatibility for older code paths
          participants.push({
            userId: 'remote',
            displayName: remoteProfile?.display_name || 'Guest',
            avatarUrl: remoteProfile?.avatar_url || null,
            videoStream: remoteVideoStream,
            audioStream: null,
            isLocal: false,
            connectionState: 'connected',
          });
        }

        // Create composite stream
        const stream = await createCompositeStream(participants, configRef.current);

        if (!stream) {
          throw new Error('Failed to create composite stream');
        }

        // Check for supported MIME types
        const supportedTypes = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
          'video/mp4',
        ];

        let mimeType = 'video/webm';
        for (const type of supportedTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            mimeType = type;
            console.log('Using MIME type:', type);
            break;
          }
        }

        const options: MediaRecorderOptions = {
          mimeType,
          videoBitsPerSecond: configRef.current.videoBitrate || 2500000,
        };

        mediaRecorder.current = new MediaRecorder(stream, options);
        stopPromiseRef.current = null;
        stopPromiseResolveRef.current = null;

        mediaRecorder.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            mediaChunks.current.push(event.data);
          }
        };

        mediaRecorder.current.onerror = (event) => {
          console.error('MediaRecorder error:', event);
          setError('Recording error occurred');
        };

        mediaRecorder.current.onstop = async () => {
          setIsSaving(true);
          try {
            await saveRecording();
          } catch (error) {
            console.error('Failed to persist composite recording:', error);
            setError('Failed to save recording');
          } finally {
            setIsSaving(false);
            cleanup();
            stopPromiseResolveRef.current?.();
            stopPromiseResolveRef.current = null;
            stopPromiseRef.current = null;
          }
        };

        mediaChunks.current = [];
        startTime.current = Date.now();
        mediaRecorder.current.start(1000); // Capture in 1-second chunks
        setIsRecording(true);
        setRecordingDuration(0);

        // Start duration timer
        durationIntervalRef.current = setInterval(() => {
          setRecordingDuration(Math.floor((Date.now() - startTime.current) / 1000));
        }, 1000);

        console.log('Started composite recording with', participants.length, 'participants');
      } catch (error) {
        console.error('Failed to start recording:', error);
        setError(error instanceof Error ? error.message : 'Failed to start recording');
        setIsRecording(false);
        setIsSaving(false);
        stopPromiseRef.current = null;
        stopPromiseResolveRef.current = null;
        cleanup();
      }
    },
    [meetingId, createCompositeStream]
  );

  const stopRecording = useCallback((): Promise<void> => {
    if (!mediaRecorder.current || (!isRecording && !isSaving)) {
      return Promise.resolve();
    }

    if (!stopPromiseRef.current) {
      stopPromiseRef.current = new Promise<void>((resolve) => {
        stopPromiseResolveRef.current = resolve;
      });
    }

    if (isRecording) {
      // Clear duration timer
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      mediaRecorder.current.stop();
      setIsRecording(false);
    }

    return stopPromiseRef.current;
  }, [isRecording, isSaving]);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (compositeStream.current) {
      compositeStream.current.getTracks().forEach((track) => track.stop());
      compositeStream.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    canvasRef.current = null;
    stopPromiseRef.current = null;
    stopPromiseResolveRef.current = null;
    audioDestinationRef.current = null;
    audioSourcesRef.current.clear();
    participantsRef.current.clear();
    videoElementsRef.current.clear();
    avatarImagesRef.current.clear();
    disconnectedParticipantsRef.current.clear();
    reconnectionAttemptsRef.current.clear();
  }, []);

  async function saveRecording() {
    if (!meetingId) return;
    let recordingId: string | null = null;
    const meetingAudioTable = supabase.from('meeting_audio') as any;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user');
        setError('Not authenticated');
        return;
      }

      const mediaBlob = new Blob(mediaChunks.current, {
        type: mediaChunks.current[0]?.type || 'video/webm',
      });

      if (mediaBlob.size === 0) {
        console.warn('Recording is empty, skipping save');
        mediaChunks.current = [];
        return;
      }

      const timestamp = Date.now();
      const fileName = `${meetingId}/${user.id}_${timestamp}.webm`;

      // Create pending record
      const pendingPayload: MeetingAudioInsert = {
        meeting_id: meetingId,
        audio_url: null,
        duration: null,
        file_size: mediaBlob.size,
        format: mediaBlob.type || 'video/webm',
        recorded_by: user.id,
        status: 'uploading',
      };

      const { data: pendingRecord, error: insertError } = await meetingAudioTable
        .insert(pendingPayload)
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      recordingId = pendingRecord?.id || null;
      if (!recordingId) {
        throw new Error('Failed to create recording placeholder row');
      }

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('meeting-audio')
        .upload(fileName, mediaBlob, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL and update record
      const { data: urlData } = supabase.storage.from('meeting-audio').getPublicUrl(fileName);
      const duration = Math.floor((Date.now() - startTime.current) / 1000);

      const completedPayload: MeetingAudioUpdate = {
        audio_url: urlData.publicUrl,
        duration,
        file_size: mediaBlob.size,
        format: mediaBlob.type || 'video/webm',
        status: 'completed',
        updated_at: new Date().toISOString(),
      };

      await meetingAudioTable.update(completedPayload).eq('id', recordingId);

      console.log('Composite recording saved successfully:', fileName);
    } catch (error) {
      if (recordingId) {
        try {
          const failedPayload: MeetingAudioUpdate = {
            status: 'failed',
            updated_at: new Date().toISOString(),
          };
          await meetingAudioTable.update(failedPayload).eq('id', recordingId);
        } catch (statusError) {
          console.error('Failed to mark recording as failed:', statusError);
        }
      }
      throw error;
    } finally {
      mediaChunks.current = [];
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    isRecording,
    isSaving,
    recordingDuration,
    error,
    startRecording,
    stopRecording,
    updateParticipant,
    addParticipant,
    removeParticipant,
    setLayoutMode,
    setPinnedUser,
    setSpeakingUser,
  };
}
