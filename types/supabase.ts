// Supabase Database Types
// Auto-generated types for type-safe database queries

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          file_name: string;
          file_size: number;
          file_type: string;
          storage_url: string;
          duration: number | null;
          status: 'uploading' | 'processing' | 'completed' | 'failed';
          transcript: string | null;
          summary: string | null;
          action_items: ActionItemDB[] | null;
          key_topics: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          file_name: string;
          file_size: number;
          file_type: string;
          storage_url: string;
          duration?: number | null;
          status?: 'uploading' | 'processing' | 'completed' | 'failed';
          transcript?: string | null;
          summary?: string | null;
          action_items?: ActionItemDB[] | null;
          key_topics?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          file_name?: string;
          file_size?: number;
          file_type?: string;
          storage_url?: string;
          duration?: number | null;
          status?: 'uploading' | 'processing' | 'completed' | 'failed';
          transcript?: string | null;
          summary?: string | null;
          action_items?: ActionItemDB[] | null;
          key_topics?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      meeting_audio: {
        Row: {
          id: string;
          meeting_id: string;
          audio_url: string | null;
          duration: number | null;
          file_size: number | null;
          format: string | null;
          recorded_by: string | null;
          status: 'uploading' | 'completed' | 'failed';
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          audio_url?: string | null;
          duration?: number | null;
          file_size?: number | null;
          format?: string | null;
          recorded_by?: string | null;
          status?: 'uploading' | 'completed' | 'failed';
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          audio_url?: string | null;
          duration?: number | null;
          file_size?: number | null;
          format?: string | null;
          recorded_by?: string | null;
          status?: 'uploading' | 'completed' | 'failed';
          created_at?: string;
          updated_at?: string | null;
        };
      };
      meetings: {
        Row: {
          id: string;
          room_id: string;
          host_id: string | null;
          guest_id: string | null;
          title: string | null;
          status: 'scheduled' | 'active' | 'ended' | null;
          started_at: string | null;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
          meeting_code: string | null;
        };
        Insert: {
          id?: string;
          room_id: string;
          host_id?: string | null;
          guest_id?: string | null;
          title?: string | null;
          status?: 'scheduled' | 'active' | 'ended' | null;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
          meeting_code?: string | null;
        };
        Update: {
          id?: string;
          room_id?: string;
          host_id?: string | null;
          guest_id?: string | null;
          title?: string | null;
          status?: 'scheduled' | 'active' | 'ended' | null;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
          meeting_code?: string | null;
        };
      };
      meeting_participants: {
        Row: {
          id: string;
          meeting_id: string;
          user_id: string;
          role: 'host' | 'participant' | 'guest' | null;
          is_active: boolean | null;
          joined_at: string | null;
          left_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          user_id: string;
          role?: 'host' | 'participant' | 'guest' | null;
          is_active?: boolean | null;
          joined_at?: string | null;
          left_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          user_id?: string;
          role?: 'host' | 'participant' | 'guest' | null;
          is_active?: boolean | null;
          joined_at?: string | null;
          left_at?: string | null;
          created_at?: string;
        };
      };
    };
  };
}

// Helper type for action items stored in JSONB
export interface ActionItemDB {
  id: string;
  text: string;
  priority?: 'high' | 'medium' | 'low';
  completed: boolean;
}
