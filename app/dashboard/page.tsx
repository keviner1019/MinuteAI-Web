'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotes } from '@/hooks/useNotes';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import NoteCard from '@/components/ui/NoteCard';
import UploadModal from '@/components/ui/UploadModal';
import MeetingLinkModal from '@/components/ui/MeetingLinkModal';
import { UploadProvider } from '@/contexts/UploadContext';
import UploadTasksPanel from '@/components/ui/UploadTasksPanel';
import Button from '@/components/ui/Button';
import { MeetingCard } from '@/components/ui/MeetingCard';
import { 
  Plus, 
  Loader2, 
  FileAudio, 
  Video, 
  ListTodo, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  Upload,
  Zap,
  BarChart3,
} from 'lucide-react';
import { uploadAudioFile } from '@/lib/supabase/storage';
import { createNote } from '@/lib/supabase/database';
import { createClient } from '@/lib/supabase/client';
import { useUpload } from '@/contexts/UploadContext';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const { notes, loading, error, refreshNotes } = useNotes(user?.id || null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [meetingLinkModal, setMeetingLinkModal] = useState<{ url: string; code: string; roomId: string } | null>(null);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'meetings'>('notes');

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'completed' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');

  const router = useRouter();
  const supabase = createClient();
  const uploadCtx = useUpload();

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

      if (error) throw error;

      // Show meeting link modal
      const meetingUrl = `${window.location.origin}/meeting/${roomId}`;
      setMeetingLinkModal({ url: meetingUrl, code: meetingCode, roomId });
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
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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

  const handleUpload = async (files: File[], title: string, generateTodos?: boolean) => {
    if (!user) throw new Error('User not authenticated');

    try {
      await uploadCtx.startUpload(files, title, user.id, () => {
        refreshNotes();
      }, generateTodos);
    } catch (error) {
      console.error('Background upload error:', error);
      throw error;
    }
  };

  // Filter and search notes
  const filteredNotes = notes
    .filter((note) => {
      const matchesSearch =
        searchQuery === '' ||
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.transcript?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.keyTopics?.some((topic) => topic.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFilter =
        filterType === 'all' ||
        (filterType === 'completed' && note.transcript) ||
        (filterType === 'pending' && !note.transcript);

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        return a.title.localeCompare(b.title);
      }
    });

  const stats = {
    total: notes.length,
    completed: notes.filter(n => n.transcript).length,
    pending: notes.filter(n => !n.transcript).length,
    todosCount: notes.reduce((acc, note) => acc + (note.actionItems?.length || 0), 0),
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Animated Header */}
          <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-xl opacity-30 animate-pulse"></div>
                    <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-2xl shadow-lg">
                      <Sparkles className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-blue-900 bg-clip-text text-transparent">
                      Welcome back, {user?.user_metadata?.display_name || user?.email?.split('@')[0]}!
                    </h1>
                    <p className="text-gray-600 mt-1 font-medium">
                      Let&apos;s get things done today 🚀
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => router.push('/todos')}
                className="group px-5 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <ListTodo className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                All Todos
              </button>
              <button
                onClick={() => router.push('/join')}
                className="group px-5 py-3 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-purple-300 text-gray-700 rounded-xl font-semibold transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform" />
                Join Meeting
              </button>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="group px-5 py-3 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-300 text-gray-700 rounded-xl font-semibold transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <Upload className="h-5 w-5 group-hover:-translate-y-1 transition-transform" />
                Upload
              </button>
              <button
                onClick={createNewMeeting}
                disabled={creatingMeeting}
                className="group px-5 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingMeeting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Video className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    New Meeting
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Modern Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 delay-100 group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-bl-full opacity-10 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <FileAudio className="h-8 w-8 text-white mb-3 opacity-80" />
                <p className="text-4xl font-bold text-white mb-1">{stats.total}</p>
                <p className="text-blue-100 text-sm font-medium">Total Notes</p>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 delay-200 group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-bl-full opacity-10 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <CheckCircle2 className="h-8 w-8 text-white mb-3 opacity-80 group-hover:animate-bounce" />
                <p className="text-4xl font-bold text-white mb-1">{stats.completed}</p>
                <p className="text-green-100 text-sm font-medium">Completed</p>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-lg p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 animate-in fade-in-from-bottom-4 delay-300 group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-bl-full opacity-10 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <Clock className="h-8 w-8 text-white mb-3 opacity-80 group-hover:animate-spin" />
                <p className="text-4xl font-bold text-white mb-1">{stats.pending}</p>
                <p className="text-orange-100 text-sm font-medium">Processing</p>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 delay-[400ms] group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-bl-full opacity-10 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <ListTodo className="h-8 w-8 text-white mb-3 opacity-80 group-hover:scale-110" />
                <p className="text-4xl font-bold text-white mb-1">{stats.todosCount}</p>
                <p className="text-purple-100 text-sm font-medium">Action Items</p>
              </div>
            </div>
          </div>

          {/* Modern Tabs */}
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
            <div className="inline-flex bg-white rounded-2xl shadow-lg p-1.5 border border-gray-100">
              <button
                onClick={() => setActiveTab('notes')}
                className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${
                  activeTab === 'notes'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <FileAudio className="h-4 w-4" />
                Notes
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">{notes.length}</span>
              </button>
              <button
                onClick={() => setActiveTab('meetings')}
                className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${
                  activeTab === 'meetings'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Video className="h-4 w-4" />
                Meetings
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">{meetings.length}</span>
              </button>
            </div>
          </div>

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <>
              {/* Modern Search and Filter */}
              {!loading && notes.length > 0 && (
                <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
                  <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                    <div className="space-y-4">
                      {/* Search Input */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="🔍 Search notes..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-500 font-medium focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all hover:border-purple-300"
                        />
                        <svg
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                      </div>

                      {/* Filters */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-bold text-gray-900">Filters:</span>
                        <select
                          title="Filter notes"
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value as any)}
                          className="px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-purple-500 hover:border-purple-300 cursor-pointer"
                        >
                          <option value="all">All Notes</option>
                          <option value="completed">✅ Completed</option>
                          <option value="pending">⏳ Processing</option>
                        </select>

                        <select
                          title="Sort notes"
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-purple-500 hover:border-purple-300 cursor-pointer"
                        >
                          <option value="newest">Newest First</option>
                          <option value="oldest">Oldest First</option>
                          <option value="title">Title (A-Z)</option>
                        </select>

                        <div className="ml-auto text-sm font-bold text-gray-900">
                          {filteredNotes.length} of {notes.length}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="relative mb-4">
                      <div className="absolute inset-0 bg-purple-600 rounded-full blur-xl opacity-20 animate-pulse"></div>
                      <Loader2 className="relative h-16 w-16 animate-spin text-purple-600 mx-auto" />
                    </div>
                    <p className="text-gray-700 font-semibold">Loading your notes...</p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 text-red-800 px-6 py-4 rounded-2xl text-sm font-medium">
                  Error: {error}
                </div>
              )}

              {/* Empty State */}
              {!loading && !error && notes.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-300 animate-in fade-in zoom-in duration-500">
                  <div className="inline-block p-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-6">
                    <FileAudio className="h-16 w-16 text-purple-600 animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">No notes yet</h2>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Upload your first audio file to get started with AI-powered transcription
                  </p>
                  <Button variant="primary" onClick={() => setUploadModalOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Upload Your First Note
                  </Button>
                </div>
              )}

              {/* No Results */}
              {!loading && !error && notes.length > 0 && filteredNotes.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-300">
                  <div className="max-w-md mx-auto px-6">
                    <p className="text-gray-600 mb-6">No notes match your search</p>
                    <div className="flex justify-center">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSearchQuery('');
                          setFilterType('all');
                        }}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes Grid - Masonry Style */}
              {!loading && !error && filteredNotes.length > 0 && (
                <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                  {filteredNotes.map((note, index) => (
                    <div 
                      key={note.id}
                      className="break-inside-avoid animate-in fade-in slide-in-from-bottom-4 duration-500"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <NoteCard
                        note={note}
                        onClick={() => router.push(`/notes/${note.id}`)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Meetings Tab */}
          {activeTab === 'meetings' && (
            <>
              {loadingMeetings ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <Loader2 className="h-16 w-16 animate-spin text-purple-600 mx-auto mb-4" />
                    <p className="text-gray-700 font-semibold">Loading meetings...</p>
                  </div>
                </div>
              ) : meetings.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-300">
                  <div className="inline-block p-6 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full mb-6">
                    <Video className="h-16 w-16 text-blue-600 animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">No meetings yet</h2>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Start your first video meeting with AI-powered transcription
                  </p>
                  <Button variant="primary" onClick={createNewMeeting}>
                    <Video className="h-4 w-4" />
                    Start New Meeting
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {meetings.map((meeting, index) => (
                    <div
                      key={meeting.id}
                      className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <MeetingCard
                        meeting={meeting}
                        onJoin={(roomId) => router.push(`/meeting/${roomId}`)}
                        onViewSummary={(roomId) => router.push(`/meeting/${roomId}/summary`)}
                      />
                    </div>
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

        {/* Meeting Link Modal */}
        {meetingLinkModal && (
          <MeetingLinkModal
            isOpen={true}
            onClose={() => {
              setMeetingLinkModal(null);
              loadMeetings();
            }}
            meetingUrl={meetingLinkModal.url}
            meetingCode={meetingLinkModal.code}
            roomId={meetingLinkModal.roomId}
          />
        )}

        {/* Persistent Upload Tasks Panel */}
        <UploadTasksPanel />
      </div>
    </ProtectedRoute>
  );
}
