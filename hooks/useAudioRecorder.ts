import { useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useAudioRecorder(meetingId: string | null) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const mediaChunks = useRef<Blob[]>([]);
  const startTime = useRef<number>(0);

  const supabase = createClient();

  const startRecording = useCallback(
    async (stream: MediaStream) => {
      if (!meetingId) {
        console.error('No meeting ID provided');
        return;
      }

      try {
        const audioTracks = stream.getAudioTracks();
        const videoTracks = stream.getVideoTracks();

        if (audioTracks.length === 0) {
          throw new Error('No audio tracks available in the stream');
        }

        // Prefer video codecs when a video track is present
        const hasVideo = videoTracks.length > 0;
        let mimeType = hasVideo ? 'video/webm;codecs=vp9,opus' : 'audio/webm;codecs=opus';
        const supportedTypes = hasVideo
          ? [
              'video/webm;codecs=vp9,opus',
              'video/webm;codecs=vp8,opus',
              'video/webm',
              'video/mp4',
              '',
            ]
          : ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4', ''];

        for (const type of supportedTypes) {
          if (type === '' || MediaRecorder.isTypeSupported(type)) {
            mimeType = type;
            console.log('Using MIME type:', type || 'default');
            break;
          }
        }

        const options: MediaRecorderOptions = {};
        if (mimeType) {
          options.mimeType = mimeType;
        }

        mediaRecorder.current = new MediaRecorder(stream, options);

        mediaRecorder.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            mediaChunks.current.push(event.data);
          }
        };

        mediaRecorder.current.onstop = async () => {
          await saveRecording();
        };

        mediaChunks.current = [];
        startTime.current = Date.now();
        mediaRecorder.current.start(1000);
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    },
    [meetingId]
  );

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  async function saveRecording() {
    if (!meetingId) return;

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user');
        return;
      }

      // Create blob from chunks
      const mediaBlob = new Blob(mediaChunks.current, {
        type: mediaChunks.current[0]?.type || 'video/webm',
      });

      if (mediaBlob.size === 0) {
        console.warn('Recording is empty, skipping save');
        return;
      }

      // Upload to Supabase Storage using meeting_id as base name
      const timestamp = Date.now();
      const fileName = `${meetingId}/${user.id}_${timestamp}.webm`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('meeting-audio')
        .upload(fileName, mediaBlob, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from('meeting-audio').getPublicUrl(fileName);

      // Calculate duration
      const duration = Math.floor((Date.now() - startTime.current) / 1000);

      // Check if a recording entry already exists for this meeting
      const { data: existingRecording } = (await supabase
        .from('meeting_audio')
        .select('id, audio_url')
        .eq('meeting_id', meetingId)
        .maybeSingle()) as any;

      if (existingRecording) {
        // Update existing recording (append or replace)
        const updateQuery: any = supabase.from('meeting_audio');
        const { error: dbError } = await updateQuery
          .update({
            audio_url: urlData.publicUrl,
            duration: duration,
            file_size: mediaBlob.size,
            format: mediaBlob.type || 'webm',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingRecording.id);

        if (dbError) {
          console.error('DB update error:', dbError);
          throw dbError;
        }
      } else {
        // Create new recording entry
        const insertQuery: any = supabase.from('meeting_audio');
        const { error: dbError } = await insertQuery.insert({
          meeting_id: meetingId,
          audio_url: urlData.publicUrl,
          duration,
          file_size: mediaBlob.size,
          format: mediaBlob.type || 'webm',
          recorded_by: user.id,
        });

        if (dbError) {
          console.error('DB insert error:', dbError);
          throw dbError;
        }
      }

      // Clear chunks
      mediaChunks.current = [];

      console.log('✅ Recording saved successfully:', fileName);
    } catch (error) {
      console.error('Failed to save recording:', error);
    }
  }

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
}
