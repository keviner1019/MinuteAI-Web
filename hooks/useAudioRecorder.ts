import { useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useAudioRecorder(meetingId: string | null) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const startTime = useRef<number>(0);

  const supabase = createClient();

  const startRecording = useCallback(
    async (stream: MediaStream) => {
      if (!meetingId) {
        console.error('No meeting ID provided');
        return;
      }

      try {
        // Create MediaRecorder with audio stream
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';

        mediaRecorder.current = new MediaRecorder(stream, {
          mimeType,
        });

        // Collect audio chunks
        mediaRecorder.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.current.push(event.data);
          }
        };

        // Handle recording stop
        mediaRecorder.current.onstop = async () => {
          await saveRecording();
        };

        // Start recording
        audioChunks.current = [];
        startTime.current = Date.now();
        mediaRecorder.current.start(1000); // Collect data every second
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
      // Create blob from chunks
      const audioBlob = new Blob(audioChunks.current, {
        type: audioChunks.current[0]?.type || 'audio/webm',
      });

      // Upload to Supabase Storage
      const fileName = `${meetingId}_${Date.now()}.webm`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('meeting-audio')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from('meeting-audio').getPublicUrl(fileName);

      // Calculate duration
      const duration = Math.floor((Date.now() - startTime.current) / 1000);

      // Save metadata to database
      const { error: dbError } = await supabase.from('meeting_audio').insert({
        meeting_id: meetingId,
        audio_url: urlData.publicUrl,
        duration,
        file_size: audioBlob.size,
        format: 'webm',
      } as any);

      if (dbError) throw dbError;

      // Clear chunks
      audioChunks.current = [];

      console.log('Recording saved successfully');
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
