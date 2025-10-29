'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotes } from '@/hooks/useNotes';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import NoteCard from '@/components/ui/NoteCard';
import UploadModal from '@/components/ui/UploadModal';
import Button from '@/components/ui/Button';
import { MeetingCard } from '@/components/ui/MeetingCard';
import { Plus, Loader2, FileAudio, Video } from 'lucide-react';
import { uploadAudioFile } from '@/lib/supabase/storage';
import { createNote } from '@/lib/supabase/database';
import { createClient } from '@/lib/supabase/client';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const { notes, loading, error } = useNotes(user?.id || null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [showProcessingToast, setShowProcessingToast] = useState(false);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'meetings'>('notes');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      loadMeetings();
    }
  }, [user]);

  async function loadMeetings() {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Failed to load meetings:', error);
    } finally {
      setLoadingMeetings(false);
    }
  }

  async function createNewMeeting() {
    if (!user?.id) {
      console.error('User not authenticated');
      alert('Please log in to create a meeting');
      return;
    }

    try {
      setCreatingMeeting(true);
      const roomId = generateRoomId();
      const meetingCode = generateMeetingCode();

      console.log('Creating meeting with:', { roomId, meetingCode, host_id: user.id });

      const { data: meeting, error } = await supabase
        .from('meetings')
        .insert({
          room_id: roomId,
          meeting_code: meetingCode,
          host_id: user.id,
          title: 'Quick Meeting',
          status: 'scheduled',
        } as any)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Meeting created successfully:', meeting);
      router.push(`/meeting/${roomId}`);
    } catch (error) {
      console.error('Failed to create meeting:', error);
      alert('Failed to create meeting. Please try again.');
    } finally {
      setCreatingMeeting(false);
    }
  }

  function generateRoomId(): string {
    return Math.random().toString(36).substring(2, 12);
  }

  function generateMeetingCode(): string {
    // Generate a 6-character alphanumeric code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar looking chars
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const handleUpload = async (file: File, title: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Step 1: Upload file to Supabase Storage
      setProcessingStatus('Uploading file...');
      setShowProcessingToast(true);
      console.log('Uploading file to Supabase...');
      const storageUrl = await uploadAudioFile(file, user.id);
      console.log('Upload complete. URL:', storageUrl);

      // Step 2: Create note document in Supabase Database
      setProcessingStatus('Creating note...');
      const newNote = await createNote({
        userId: user.id,
        title: title,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        storageUrl: storageUrl,
        status: 'processing',
      });
      console.log('Note created successfully:', newNote.id);

      // Step 3: Transcribe audio (WAIT for completion)
      setProcessingStatus('Transcribing audio... This may take a few minutes');
      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: newNote.id, audioUrl: storageUrl }),
      });

      if (!transcribeResponse.ok) {
        throw new Error('Transcription failed');
      }

      const { transcript } = await transcribeResponse.json();
      console.log('Transcription completed');

      // Step 4: Generate AI analysis (WAIT for completion)
      setProcessingStatus('Generating AI analysis...');
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: newNote.id, transcript }),
      });

      if (!analyzeResponse.ok) {
        throw new Error('AI analysis failed');
      }

      console.log('AI analysis completed');

      // Step 5: All done!
      setProcessingStatus('✓ Processing complete!');

      // Hide toast after 2 seconds
      setTimeout(() => {
        setShowProcessingToast(false);
        setProcessingStatus('');
      }, 2000);
    } catch (error) {
      console.error('Upload/Processing error:', error);
      setProcessingStatus('✗ Processing failed. Please try again.');

      // Hide error after 4 seconds
      setTimeout(() => {
        setShowProcessingToast(false);
        setProcessingStatus('');
      }, 4000);

      throw error;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Main Content */}
        <main className="max-w-container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back, {user?.user_metadata?.display_name || user?.email?.split('@')[0]}!
              </h1>
              <p className="text-sm text-gray-600">
                {notes.length} notes · {meetings.length} meetings
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={() => setUploadModalOpen(true)}>
                <Plus className="h-4 w-4" />
                Upload
              </Button>
              <Button variant="primary" onClick={createNewMeeting} disabled={creatingMeeting}>
                {creatingMeeting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4" />
                    New Meeting
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('notes')}
                className={`pb-3 px-1 font-medium text-sm transition-colors border-b-2 ${
                  activeTab === 'notes'
                    ? 'border-blue-500 text-blue-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileAudio className="h-4 w-4 inline mr-2" />
                Notes
              </button>
              <button
                onClick={() => setActiveTab('meetings')}
                className={`pb-3 px-1 font-medium text-sm transition-colors border-b-2 ${
                  activeTab === 'meetings'
                    ? 'border-blue-500 text-blue-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Video className="h-4 w-4 inline mr-2" />
                Meetings
              </button>
            </div>
          </div>

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <>
              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-500 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">Loading your notes...</p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  Error loading notes: {error}
                </div>
              )}

              {/* Empty State */}
              {!loading && !error && notes.length === 0 && (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <FileAudio className="h-8 w-8 text-gray-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">No audio files yet</h2>
                  <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                    Upload your first audio file to get started with AI-powered transcription and
                    analysis
                  </p>
                  <Button variant="primary" onClick={() => setUploadModalOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Upload Your First Audio
                  </Button>
                </div>
              )}

              {/* Notes Grid */}
              {!loading && !error && notes.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {notes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onClick={() => router.push(`/notes/${note.id}`)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Meetings Tab */}
          {activeTab === 'meetings' && (
            <>
              {loadingMeetings ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-500 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">Loading meetings...</p>
                  </div>
                </div>
              ) : meetings.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <Video className="h-8 w-8 text-gray-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">No meetings yet</h2>
                  <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                    Start your first P2P video meeting with AI-powered transcription
                  </p>
                  <Button variant="primary" onClick={createNewMeeting}>
                    <Video className="h-4 w-4" />
                    Start New Meeting
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {meetings.map((meeting) => (
                    <MeetingCard
                      key={meeting.id}
                      meeting={meeting}
                      onJoin={(roomId) => router.push(`/meeting/${roomId}`)}
                      onViewSummary={(roomId) => router.push(`/meeting/${roomId}/summary`)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>

        {/* Upload Modal */}
        <UploadModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          onUpload={handleUpload}
        />

        {/* Processing Status Toast */}
        {showProcessingToast && (
          <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-5">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[320px] max-w-md">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {processingStatus.startsWith('✓') ? (
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                      <svg
                        className="h-5 w-5 text-green-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  ) : processingStatus.startsWith('✗') ? (
                    <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                      <svg
                        className="h-5 w-5 text-red-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                  ) : (
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      processingStatus.startsWith('✓')
                        ? 'text-green-900'
                        : processingStatus.startsWith('✗')
                        ? 'text-red-900'
                        : 'text-gray-900'
                    }`}
                  >
                    {processingStatus.startsWith('✓') || processingStatus.startsWith('✗')
                      ? processingStatus
                      : 'Processing Audio'}
                  </p>
                  {!processingStatus.startsWith('✓') && !processingStatus.startsWith('✗') && (
                    <p className="text-xs text-gray-600 mt-1">{processingStatus}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
