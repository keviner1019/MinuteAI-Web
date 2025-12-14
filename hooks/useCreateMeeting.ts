import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

async function getAuthHeaders() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

export interface CreateMeetingInput {
  title?: string;
  scheduledAt?: Date | null;
  description?: string;
  invitedFriendIds?: string[];
  invitedEmails?: string[];
  maxParticipants?: number;
}

export interface CreateMeetingOutput {
  id: string;
  roomId: string;
  meetingCode: string;
  meetingUrl: string;
  hostId: string;
  title: string;
  status: 'scheduled' | 'active';
  scheduledAt?: string;
  createdAt: string;
}

interface UseCreateMeetingReturn {
  createMeeting: (input?: CreateMeetingInput) => Promise<CreateMeetingOutput>;
  isCreating: boolean;
  error: string | null;
  clearError: () => void;
}

export function useCreateMeeting(): UseCreateMeetingReturn {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMeeting = useCallback(
    async (input?: CreateMeetingInput): Promise<CreateMeetingOutput> => {
      setIsCreating(true);
      setError(null);

      try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/meetings', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title: input?.title?.trim() || 'Quick Meeting',
            scheduled_at: input?.scheduledAt?.toISOString() || null,
            description: input?.description?.trim() || null,
            max_participants: input?.maxParticipants || 10,
            invited_friend_ids: input?.invitedFriendIds || [],
            invited_emails: input?.invitedEmails || [],
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create meeting');
        }

        const meetingUrl = `${window.location.origin}/meeting/${data.room_id}`;

        return {
          id: data.id,
          roomId: data.room_id,
          meetingCode: data.meeting_code,
          meetingUrl,
          hostId: data.host_id,
          title: data.title,
          status: data.status,
          scheduledAt: data.scheduled_at,
          createdAt: data.created_at,
        };
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to create meeting';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    createMeeting,
    isCreating,
    error,
    clearError,
  };
}
