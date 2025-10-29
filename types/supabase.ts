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

