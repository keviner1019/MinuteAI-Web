import { useState, useRef, useCallback, useEffect } from 'react';
import { createClient, type AppSupabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';

interface UserProfile {
  display_name?: string;
  avatar_url?: string;
}

export function useCompositeRecorder(meetingId: string | null) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const mediaChunks = useRef<Blob[]>([]);
  const startTime = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>(0);
  const compositeStream = useRef<MediaStream | null>(null);
  const stopPromiseRef = useRef<Promise<void> | null>(null);
  const stopPromiseResolveRef = useRef<(() => void) | null>(null);

  const supabase: AppSupabaseClient = createClient();
  type MeetingAudioInsert = Database['public']['Tables']['meeting_audio']['Insert'];
  type MeetingAudioUpdate = Database['public']['Tables']['meeting_audio']['Update'];

  const createCompositeStream = useCallback(
    async (
      localVideoStream: MediaStream | null,
      remoteVideoStream: MediaStream | null,
      audioStream: MediaStream | null,
      localProfile: UserProfile | null,
      remoteProfile: UserProfile | null
    ): Promise<MediaStream | null> => {
      // Create canvas for composite video
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      canvasRef.current = canvas;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Create video elements for local and remote streams
      const localVideo = document.createElement('video');
      const remoteVideo = document.createElement('video');

      if (localVideoStream) {
        localVideo.srcObject = localVideoStream;
        localVideo.play();
      }

      if (remoteVideoStream) {
        remoteVideo.srcObject = remoteVideoStream;
        remoteVideo.play();
      }

      // Load avatar images
      const localAvatar = new Image();
      const remoteAvatar = new Image();
      localAvatar.crossOrigin = 'anonymous';
      remoteAvatar.crossOrigin = 'anonymous';

      if (localProfile?.avatar_url) {
        localAvatar.src = localProfile.avatar_url;
      }
      if (remoteProfile?.avatar_url) {
        remoteAvatar.src = remoteProfile.avatar_url;
      }

      // Drawing function
      const draw = () => {
        // Clear canvas with background
        ctx.fillStyle = '#1f2937'; // Gray background
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const halfWidth = canvas.width / 2;
        const videoHeight = canvas.height - 80;
        const videoY = 40;

        // Draw local participant (left side)
        if (localVideoStream && localVideo.readyState >= 2) {
          // Video is available
          ctx.drawImage(localVideo, 0, videoY, halfWidth - 10, videoHeight);
        } else {
          // Show avatar or placeholder
          ctx.fillStyle = '#374151';
          ctx.fillRect(0, videoY, halfWidth - 10, videoHeight);

          if (localAvatar.complete && localAvatar.naturalWidth > 0) {
            const size = Math.min(halfWidth - 10, videoHeight) * 0.4;
            const x = (halfWidth - 10) / 2 - size / 2;
            const y = videoY + videoHeight / 2 - size / 2;

            // Draw circular avatar
            ctx.save();
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(localAvatar, x, y, size, size);
            ctx.restore();
          } else {
            // Draw placeholder initials
            ctx.fillStyle = '#6366f1';
            ctx.beginPath();
            ctx.arc((halfWidth - 10) / 2, videoY + videoHeight / 2, 80, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 64px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const initial = (localProfile?.display_name || 'Y')[0].toUpperCase();
            ctx.fillText(initial, (halfWidth - 10) / 2, videoY + videoHeight / 2);
          }
        }

        // Draw remote participant (right side)
        if (remoteVideoStream && remoteVideo.readyState >= 2) {
          // Video is available
          ctx.drawImage(remoteVideo, halfWidth + 10, videoY, halfWidth - 10, videoHeight);
        } else {
          // Show avatar or placeholder
          ctx.fillStyle = '#374151';
          ctx.fillRect(halfWidth + 10, videoY, halfWidth - 10, videoHeight);

          if (remoteAvatar.complete && remoteAvatar.naturalWidth > 0) {
            const size = Math.min(halfWidth - 10, videoHeight) * 0.4;
            const x = halfWidth + 10 + (halfWidth - 10) / 2 - size / 2;
            const y = videoY + videoHeight / 2 - size / 2;

            // Draw circular avatar
            ctx.save();
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(remoteAvatar, x, y, size, size);
            ctx.restore();
          } else {
            // Draw placeholder initials
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(
              halfWidth + 10 + (halfWidth - 10) / 2,
              videoY + videoHeight / 2,
              80,
              0,
              Math.PI * 2
            );
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 64px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const initial = (remoteProfile?.display_name || 'G')[0].toUpperCase();
            ctx.fillText(initial, halfWidth + 10 + (halfWidth - 10) / 2, videoY + videoHeight / 2);
          }
        }

        // Draw name labels at bottom
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, canvas.height - 40, halfWidth - 10, 40);
        ctx.fillRect(halfWidth + 10, canvas.height - 40, halfWidth - 10, 40);

        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(localProfile?.display_name || 'You', (halfWidth - 10) / 2, canvas.height - 20);
        ctx.fillText(
          remoteProfile?.display_name || 'Guest',
          halfWidth + 10 + (halfWidth - 10) / 2,
          canvas.height - 20
        );

        animationFrameRef.current = requestAnimationFrame(draw);
      };

      // Start drawing
      draw();

      // Get video stream from canvas
      const videoStream = canvas.captureStream(30); // 30 FPS

      // Combine with audio
      if (audioStream) {
        audioStream.getAudioTracks().forEach((track) => {
          videoStream.addTrack(track);
        });
      }

      compositeStream.current = videoStream;
      return videoStream;
    },
    []
  );

  const startRecording = useCallback(
    async (
      localVideoStream: MediaStream | null,
      remoteVideoStream: MediaStream | null,
      audioStream: MediaStream | null,
      localProfile: UserProfile | null,
      remoteProfile: UserProfile | null
    ) => {
      if (!meetingId) {
        console.error('No meeting ID provided');
        return;
      }

      try {
        // Create composite stream
        const stream = await createCompositeStream(
          localVideoStream,
          remoteVideoStream,
          audioStream,
          localProfile,
          remoteProfile
        );

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

        mediaRecorder.current = new MediaRecorder(stream, { mimeType });
        stopPromiseRef.current = null;
        stopPromiseResolveRef.current = null;

        mediaRecorder.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            mediaChunks.current.push(event.data);
          }
        };

        mediaRecorder.current.onstop = async () => {
          setIsSaving(true);
          try {
            await saveRecording();
          } catch (error) {
            console.error('Failed to persist composite recording:', error);
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
        mediaRecorder.current.start(1000);
        setIsRecording(true);

        console.log('🎥 Started composite recording');
      } catch (error) {
        console.error('Failed to start recording:', error);
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
    canvasRef.current = null;
    stopPromiseRef.current = null;
    stopPromiseResolveRef.current = null;
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

      console.log('✅ Composite recording saved successfully:', fileName);
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
    startRecording,
    stopRecording,
  };
}
