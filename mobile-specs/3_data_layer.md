# Data Layer

## API Client Architecture

```typescript
// lib/api.ts
import { supabase } from './supabase';
import { config } from './config';

class ApiClient {
  private baseUrl = config.apiBaseUrl;

  private async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    };
  }

  async get<T>(endpoint: string): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, { headers });

    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }

    return response.json();
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }

    return response.json();
  }

  async uploadFile(endpoint: string, file: FormData): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: file,
    });

    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }

    return response.json();
  }
}

export const api = new ApiClient();

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}
```

## Zustand State Management

### Notes Store

```typescript
// stores/notesStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

const mmkvStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.delete(name),
};

interface NotesState {
  notes: Note[];
  selectedNote: Note | null;
  isLoading: boolean;
  error: string | null;

  fetchNotes: () => Promise<void>;
  fetchNoteById: (id: string) => Promise<void>;
  createNote: (data: CreateNoteInput) => Promise<Note>;
  updateNote: (id: string, data: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: [],
      selectedNote: null,
      isLoading: false,
      error: null,

      fetchNotes: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('notes')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) throw error;
          set({ notes: data, isLoading: false });
        } catch (e) {
          set({ error: e.message, isLoading: false });
        }
      },

      fetchNoteById: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('notes')
            .select('*, action_items(*)')
            .eq('id', id)
            .single();

          if (error) throw error;
          set({ selectedNote: data, isLoading: false });
        } catch (e) {
          set({ error: e.message, isLoading: false });
        }
      },

      createNote: async (input) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('notes')
            .insert(input)
            .select()
            .single();

          if (error) throw error;

          // Optimistic update
          set((state) => ({
            notes: [data, ...state.notes],
            isLoading: false,
          }));

          return data;
        } catch (e) {
          set({ error: e.message, isLoading: false });
          throw e;
        }
      },

      updateNote: async (id, updates) => {
        // Optimistic update
        const previousNotes = get().notes;
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === id ? { ...n, ...updates } : n
          ),
        }));

        try {
          const { error } = await supabase
            .from('notes')
            .update(updates)
            .eq('id', id);

          if (error) throw error;
        } catch (e) {
          // Rollback on error
          set({ notes: previousNotes, error: e.message });
          throw e;
        }
      },

      deleteNote: async (id) => {
        const previousNotes = get().notes;
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== id),
        }));

        try {
          const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', id);

          if (error) throw error;
        } catch (e) {
          set({ notes: previousNotes, error: e.message });
          throw e;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'notes-storage',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ notes: state.notes }),
    }
  )
);
```

### Upload Store

```typescript
// stores/uploadStore.ts
import { create } from 'zustand';
import * as FileSystem from 'expo-file-system';

interface UploadTask {
  id: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  noteId?: string;
}

interface UploadState {
  tasks: UploadTask[];
  addTask: (file: FileSystem.FileInfo & { name: string }) => string;
  updateTask: (id: string, updates: Partial<UploadTask>) => void;
  removeTask: (id: string) => void;
  uploadFile: (taskId: string, uri: string) => Promise<void>;
}

export const useUploadStore = create<UploadState>((set, get) => ({
  tasks: [],

  addTask: (file) => {
    const id = Date.now().toString();
    const task: UploadTask = {
      id,
      fileName: file.name,
      progress: 0,
      status: 'pending',
    };
    set((state) => ({ tasks: [...state.tasks, task] }));
    return id;
  },

  updateTask: (id, updates) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    }));
  },

  removeTask: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
  },

  uploadFile: async (taskId, uri) => {
    const { updateTask } = get();

    try {
      updateTask(taskId, { status: 'uploading', progress: 0 });

      const uploadResult = await FileSystem.uploadAsync(
        `${config.apiBaseUrl}/api/transcribe`,
        uri,
        {
          fieldName: 'file',
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          headers: await getAuthHeaders(),
        }
      );

      if (uploadResult.status !== 200) {
        throw new Error(uploadResult.body);
      }

      const result = JSON.parse(uploadResult.body);
      updateTask(taskId, {
        status: 'completed',
        progress: 100,
        noteId: result.noteId,
      });
    } catch (e) {
      updateTask(taskId, {
        status: 'error',
        error: e.message,
      });
    }
  },
}));
```

## Real-time Subscriptions

```typescript
// hooks/useRealtimeNotes.ts
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNotesStore } from '@/stores/notesStore';

export function useRealtimeNotes() {
  const { fetchNotes } = useNotesStore();

  useEffect(() => {
    const channel = supabase
      .channel('notes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
        },
        (payload) => {
          // Refetch on any change
          fetchNotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
```

## Offline Support

```typescript
// hooks/useOfflineSync.ts
import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { MMKV } from 'react-native-mmkv';

const pendingActions = new MMKV({ id: 'pending-actions' });

export function useOfflineSync() {
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        syncPendingActions();
      }
    });

    return unsubscribe;
  }, []);
}

async function syncPendingActions() {
  const actions = JSON.parse(pendingActions.getString('queue') || '[]');

  for (const action of actions) {
    try {
      await executeAction(action);
      // Remove from queue on success
    } catch (e) {
      // Retry later
    }
  }
}
```

## Best Practices

1. **MMKV Storage**: 10x faster than AsyncStorage for persistence
2. **Optimistic Updates**: Update UI immediately, rollback on error
3. **Request Deduplication**: Cancel duplicate in-flight requests
4. **Pagination**: Use cursor-based pagination for large lists
5. **Cache Invalidation**: Subscribe to real-time changes
6. **Offline Queue**: Store pending mutations for sync when online
