import { useState, useEffect, useRef, useCallback } from 'react';
import { AssemblyAI } from 'assemblyai';
import { createClient } from '@/lib/supabase/client';

interface Transcript {
  id: string;
  text: string;
  speaker: 'local' | 'remote';
  timestamp: number;
  confidence: number;
}

export function useTranscription(audioStream: MediaStream | null, meetingId: string | null) {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const transcriber = useRef<any>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const processor = useRef<ScriptProcessorNode | null>(null);
  const source = useRef<MediaStreamAudioSourceNode | null>(null);
  const userIdRef = useRef<string>(`user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const supabase = createClient();

  // Subscribe to real-time transcript updates via Pusher
  useEffect(() => {
    if (!meetingId || typeof window === 'undefined') return;

    console.log('🔌 Setting up Pusher subscription for meeting:', meetingId);
    console.log('👤 Current user ID:', userIdRef.current);

    // Import Pusher dynamically to avoid SSR issues
    let pusherInstance: any = null;
    let channel: any = null;

    import('pusher-js')
      .then(({ default: Pusher }) => {
        pusherInstance = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
          authEndpoint: '/api/pusher/auth',
        });

        channel = pusherInstance.subscribe(`private-meeting-${meetingId}`);

        channel.bind('pusher:subscription_succeeded', () => {
          console.log('✅ Pusher subscription successful');
        });

        channel.bind('pusher:subscription_error', (error: any) => {
          console.error('❌ Pusher subscription error:', error);
        });

        channel.bind('new-transcript', (data: { transcript: any }) => {
          console.log('📨 Received new transcript via Pusher:', data.transcript);

          // Determine if this transcript is from local or remote user
          const isLocalTranscript = data.transcript.speaker === userIdRef.current;

          const newTranscript: Transcript = {
            id: data.transcript.id,
            text: data.transcript.text,
            speaker: isLocalTranscript ? 'local' : 'remote',
            timestamp: data.transcript.timestamp_start * 1000,
            confidence: data.transcript.confidence || 0,
          };

          console.log('💬 Processing transcript:', newTranscript);

          // Only add if not already in the list (avoid duplicates from local saves)
          setTranscripts((prev) => {
            const exists = prev.some((t) => t.id === newTranscript.id);
            if (exists) {
              console.log('⚠️ Transcript already exists, skipping');
              return prev;
            }
            console.log('✅ Adding new transcript to list');
            return [...prev, newTranscript];
          });
        });
      })
      .catch((err) => {
        console.error('Failed to load Pusher:', err);
      });

    return () => {
      if (channel) {
        console.log('� Unsubscribing from Pusher channel');
        channel.unbind_all();
      }
      if (pusherInstance) {
        pusherInstance.unsubscribe(`private-meeting-${meetingId}`);
        pusherInstance.disconnect();
      }
    };
  }, [meetingId]);

  const startTranscription = useCallback(async () => {
    if (!audioStream || !meetingId) {
      console.error('No audio stream or meeting ID available');
      return;
    }

    try {
      setIsTranscribing(true);

      // Get API key from server
      console.log('Fetching AssemblyAI temporary token...');
      const response = await fetch('/api/transcription/token');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to get token: ${errorData.error || response.statusText}`);
      }

      const { token } = await response.json();

      if (!token) {
        throw new Error('No token received from server');
      }

      console.log(
        'Token received, initializing streaming transcriber with multilingual support...'
      );

      // Create streaming transcriber with temporary token
      // Enable multilingual model for automatic language detection
      const rt = new AssemblyAI({ apiKey: '' }).streaming.transcriber({
        token: token, // Temporary token for browser streaming
        sampleRate: 16_000,
        formatTurns: true, // Enable text formatting
        speechModel: 'universal-streaming-multilingual', // Detect and transcribe English, Spanish, French, German, Italian, Portuguese
      });

      transcriber.current = rt;

      // Handle session opened
      rt.on('open', ({ id }) => {
        console.log(`Streaming session opened with ID: ${id}`);
      });

      // Handle transcription turns (final transcripts)
      rt.on('turn', (turn) => {
        // Only process formatted final transcripts
        if (!turn.transcript || !turn.turn_is_formatted) {
          return;
        }

        console.log('Turn received:', turn.transcript);

        const newTranscript: Transcript = {
          id: Date.now().toString(),
          text: turn.transcript,
          speaker: 'local',
          timestamp: Date.now(),
          confidence: turn.end_of_turn_confidence || 0,
        };

        // DON'T add to state here - let Pusher broadcast handle it
        // This prevents duplicates
        // setTranscripts((prev) => [...prev, newTranscript]);

        // Save to database (Pusher will broadcast back and add to state)
        saveTranscript(newTranscript, meetingId);
      });

      // Handle errors
      rt.on('error', (error: Error) => {
        console.error('Streaming transcription error:', error);
      });

      // Handle session close
      rt.on('close', (code: number, reason: string) => {
        console.log('Streaming session closed:', code, reason);
      });

      // Connect to streaming service
      await rt.connect();
      console.log('Connected to AssemblyAI streaming service');

      // Setup audio processing with proper sample rate handling
      // Use the default sample rate of the audio stream, then resample if needed
      audioContext.current = new AudioContext();
      const sourceSampleRate = audioContext.current.sampleRate;

      source.current = audioContext.current.createMediaStreamSource(audioStream);
      processor.current = audioContext.current.createScriptProcessor(4096, 1, 1);

      source.current.connect(processor.current);
      processor.current.connect(audioContext.current.destination);

      processor.current.onaudioprocess = (e) => {
        const audioData = e.inputBuffer.getChannelData(0);

        // Resample to 16kHz if necessary
        let resampledData: Float32Array = audioData;
        if (sourceSampleRate !== 16000) {
          resampledData = resampleAudio(audioData, sourceSampleRate, 16000) as Float32Array;
        }

        const buffer = convertFloat32ToInt16(resampledData);

        // Send audio data to AssemblyAI - only if socket is open
        if (rt && buffer.buffer && transcriber.current) {
          try {
            rt.sendAudio(buffer.buffer);
          } catch (error: any) {
            // Silently ignore socket errors (happens when closing)
            if (!error?.message?.includes('Socket is not open')) {
              console.error('Error sending audio:', error);
            }
          }
        }
      };
      console.log('Audio processing started');
    } catch (error) {
      console.error('Failed to start transcription:', error);
      setIsTranscribing(false);
    }
  }, [audioStream, meetingId]);

  const stopTranscription = useCallback(async () => {
    if (transcriber.current) {
      try {
        await transcriber.current.close();
      } catch (error) {
        console.error('Error closing transcriber:', error);
      }
      transcriber.current = null;
    }

    if (processor.current) {
      processor.current.disconnect();
      processor.current = null;
    }

    if (source.current) {
      source.current.disconnect();
      source.current = null;
    }

    if (audioContext.current) {
      await audioContext.current.close();
      audioContext.current = null;
    }

    setIsTranscribing(false);
  }, []);

  async function saveTranscript(transcript: Transcript, meetingId: string) {
    try {
      // Save via API endpoint to bypass RLS
      const response = await fetch(`/api/save-transcript`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingId: meetingId,
          speaker: userIdRef.current, // Use unique user ID instead of 'local'
          text: transcript.text,
          confidence: transcript.confidence,
          timestamp: Math.floor(transcript.timestamp / 1000), // Convert to seconds
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          'Failed to save transcript. Status:',
          response.status,
          'Response:',
          errorText
        );
        throw new Error(`Failed to save transcript: ${response.status}`);
      }

      const data = await response.json();
      console.log('Transcript saved successfully:', data);
    } catch (error) {
      console.error('Failed to save transcript:', error);
    }
  }

  useEffect(() => {
    return () => {
      stopTranscription();
    };
  }, [stopTranscription]);

  return {
    transcripts,
    isTranscribing,
    startTranscription,
    stopTranscription,
  };
}

function resampleAudio(
  audioData: Float32Array,
  fromSampleRate: number,
  toSampleRate: number
): Float32Array {
  if (fromSampleRate === toSampleRate) {
    return audioData;
  }

  const sampleRateRatio = fromSampleRate / toSampleRate;
  const newLength = Math.round(audioData.length / sampleRateRatio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const index = i * sampleRateRatio;
    const indexInt = Math.floor(index);
    const indexFrac = index - indexInt;

    if (indexInt + 1 < audioData.length) {
      // Linear interpolation
      result[i] = audioData[indexInt] * (1 - indexFrac) + audioData[indexInt + 1] * indexFrac;
    } else {
      result[i] = audioData[indexInt];
    }
  }

  return result;
}

function convertFloat32ToInt16(buffer: Float32Array): Int16Array {
  const int16 = new Int16Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}
