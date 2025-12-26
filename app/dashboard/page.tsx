'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotes, SharedNote } from '@/hooks/useNotes';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import NoteCard from '@/components/ui/NoteCard';
import UploadModal from '@/components/ui/UploadModal';
import MeetingLinkModal from '@/components/ui/MeetingLinkModal';
import CreateMeetingModal from '@/components/meeting/CreateMeetingModal';
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
  Search,
  Calendar,
  ArrowUpDown,
} from 'lucide-react';
import { uploadAudioFile } from '@/lib/supabase/storage';
import { createNote } from '@/lib/supabase/database';
import { createClient } from '@/lib/supabase/client';
import { useUpload } from '@/contexts/UploadContext';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const { notes, sharedNotes, loading, error, refreshNotes } = useNotes(user?.id || null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [createMeetingModalOpen, setCreateMeetingModalOpen] = useState(false);
  const [meetingLinkModal, setMeetingLinkModal] = useState<{ url: string; code: string; roomId: string } | null>(null);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [activeTab, setActiveTab] = useState<'notes' | 'meetings'>('notes');

  // Search and Filter states for Notes
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'audio' | 'documents'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');

  // Search and Filter states for Meetings
  const [meetingSearchQuery, setMeetingSearchQuery] = useState('');
  const [meetingStatusFilter, setMeetingStatusFilter] = useState<'all' | 'scheduled' | 'active' | 'ended'>('all');
  const [meetingSortBy, setMeetingSortBy] = useState<'newest' | 'oldest' | 'upcoming' | 'title'>('newest');

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
      // Fetch hosted meetings
      const { data: hostedMeetings, error: hostedError } = await supabase
        .from('meetings')
        .select('*')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false });

      if (hostedError) throw hostedError;

      type MeetingRow = { id: string; [key: string]: any };
      let allMeetings: MeetingRow[] = [...(hostedMeetings as MeetingRow[] || [])];

      // Fetch meetings where user is a participant (but not host)
      const { data: participantData } = await supabase
        .from('meeting_participants')
        .select('meeting_id')
        .eq('user_id', user.id);

      if (participantData && participantData.length > 0) {
        const participantMeetingIds = participantData.map((p: { meeting_id: string }) => p.meeting_id);
        const hostedIds = new Set(allMeetings.map(m => m.id));
        const newMeetingIds = participantMeetingIds.filter((id: string) => !hostedIds.has(id));

        if (newMeetingIds.length > 0) {
          const { data: participantMeetings } = await supabase
            .from('meetings')
            .select('*')
            .in('id', newMeetingIds)
            .order('created_at', { ascending: false });

          if (participantMeetings) {
            allMeetings = [...allMeetings, ...(participantMeetings as MeetingRow[]).map(m => ({ ...m, isParticipant: true }))];
          }
        }
      }

      // Fetch meetings where user is invited (via email)
      if (user.email) {
        const { data: invitations } = await supabase
          .from('meeting_invitations')
          .select('meeting_id')
          .eq('invitee_email', user.email.toLowerCase())
          .eq('status', 'pending');

        if (invitations && invitations.length > 0) {
          const existingIds = new Set(allMeetings.map(m => m.id));
          const invitedMeetingIds = invitations
            .map((inv: { meeting_id: string }) => inv.meeting_id)
            .filter((id: string) => !existingIds.has(id));

          if (invitedMeetingIds.length > 0) {
            const { data: invitedMeetings } = await supabase
              .from('meetings')
              .select('*')
              .in('id', invitedMeetingIds)
              .order('created_at', { ascending: false });

            if (invitedMeetings) {
              allMeetings = [...allMeetings, ...(invitedMeetings as MeetingRow[]).map(m => ({ ...m, isInvited: true }))];
            }
          }
        }
      }

      // Sort all meetings by scheduled_at or created_at descending
      allMeetings.sort((a, b) => {
        const dateA = new Date(a.scheduled_at || a.created_at).getTime();
        const dateB = new Date(b.scheduled_at || b.created_at).getTime();
        return dateB - dateA;
      });

      setMeetings(allMeetings);
    } catch (error) {
      console.error('Failed to load meetings:', error);
    } finally {
      setLoadingMeetings(false);
    }
  }

  const handleMeetingCreated = (meeting: {
    id: string;
    roomId: string;
    meetingCode: string;
    meetingUrl: string;
  }) => {
    setMeetingLinkModal({
      url: meeting.meetingUrl,
      code: meeting.meetingCode,
      roomId: meeting.roomId,
    });
    loadMeetings();
  };

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

  // Combine owned notes and shared notes with markers
  const allNotesWithMarkers = [
    ...notes.map(note => ({ ...note, isSharedWithMe: false as const })),
    ...sharedNotes.map(note => ({ ...note, isSharedWithMe: true as const })),
  ];

  // Filter and search notes (including shared notes)
  const filteredNotes = allNotesWithMarkers
    .filter((note) => {
      const matchesSearch =
        searchQuery === '' ||
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.transcript?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.keyTopics?.some((topic) => topic.toLowerCase().includes(searchQuery.toLowerCase()));

      // Filter by file type - check fileType for audio vs document
      const isAudioFile = note.fileType?.startsWith('audio/') ||
        ['mp3', 'wav', 'ogg', 'm4a', 'webm'].some(ext => note.fileName?.toLowerCase().endsWith(ext));
      const isDocumentFile = !isAudioFile;

      const matchesFilter =
        filterType === 'all' ||
        (filterType === 'audio' && isAudioFile) ||
        (filterType === 'documents' && isDocumentFile);

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

  const totalNotes = notes.length + sharedNotes.length;

  // Filter and sort meetings
  const filteredMeetings = meetings
    .filter((meeting) => {
      // Search filter - search in title, description, and meeting code
      const matchesSearch =
        meetingSearchQuery === '' ||
        meeting.title?.toLowerCase().includes(meetingSearchQuery.toLowerCase()) ||
        meeting.description?.toLowerCase().includes(meetingSearchQuery.toLowerCase()) ||
        meeting.meeting_code?.toLowerCase().includes(meetingSearchQuery.toLowerCase());

      // Status filter
      const matchesStatus =
        meetingStatusFilter === 'all' ||
        meeting.status === meetingStatusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (meetingSortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'upcoming':
          // Sort by scheduled_at, with null values at the end
          const dateA = a.scheduled_at ? new Date(a.scheduled_at).getTime() : Infinity;
          const dateB = b.scheduled_at ? new Date(b.scheduled_at).getTime() : Infinity;
          return dateA - dateB;
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        default:
          return 0;
      }
    });

  const stats = {
    total: totalNotes,
    completed: [...notes, ...sharedNotes].filter(n => n.transcript).length,
    pending: [...notes, ...sharedNotes].filter(n => !n.transcript).length,
    todosCount: [...notes, ...sharedNotes].reduce((acc, note) => acc + (note.actionItems?.length || 0), 0),
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
              {/* Upload File - Primary (purple, filled) */}
              <button
                onClick={() => setUploadModalOpen(true)}
                className="group px-5 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <Upload className="h-5 w-5 group-hover:-translate-y-1 transition-transform" />
                Upload File
              </button>
              {/* New Meeting - Secondary (outline) */}
              <button
                onClick={() => setCreateMeetingModalOpen(true)}
                className="group px-5 py-3 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-purple-300 text-gray-700 rounded-xl font-semibold transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <Video className="h-5 w-5 group-hover:scale-110 transition-transform" />
                New Meeting
              </button>
              {/* Join Meeting - Secondary (outline) */}
              <button
                onClick={() => router.push('/join')}
                className="group px-5 py-3 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-purple-300 text-gray-700 rounded-xl font-semibold transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform" />
                Join Meeting
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
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">{totalNotes}</span>
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
              {!loading && totalNotes > 0 && (
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
                          <option value="audio">Audio</option>
                          <option value="documents">Documents</option>
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
                          {filteredNotes.length} of {totalNotes}
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
              {!loading && !error && totalNotes === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-300 animate-in fade-in zoom-in duration-500">
                  <div className="inline-block p-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-6">
                    <FileAudio className="h-16 w-16 text-purple-600 animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">No notes yet</h2>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Upload your first audio file to get started with AI-powered transcription
                  </p>
                  <div className="flex justify-center">
                    <Button variant="primary" onClick={() => setUploadModalOpen(true)}>
                      <Plus className="h-4 w-4" />
                      Upload Your First Note
                    </Button>
                  </div>
                </div>
              )}

              {/* No Results */}
              {!loading && !error && totalNotes > 0 && filteredNotes.length === 0 && (
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
              {/* Search and Filter for Meetings */}
              {!loadingMeetings && meetings.length > 0 && (
                <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
                  <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                    <div className="space-y-4">
                      {/* Search Input */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search meetings by title, description, or code..."
                          value={meetingSearchQuery}
                          onChange={(e) => setMeetingSearchQuery(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-500 font-medium focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all hover:border-purple-300"
                        />
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      </div>

                      {/* Filters */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-bold text-gray-900">Filters:</span>

                        {/* Status Filter */}
                        <select
                          title="Filter by status"
                          value={meetingStatusFilter}
                          onChange={(e) => setMeetingStatusFilter(e.target.value as any)}
                          className="px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-purple-500 hover:border-purple-300 cursor-pointer"
                        >
                          <option value="all">All Status</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="active">Active</option>
                          <option value="ended">Ended</option>
                        </select>

                        {/* Sort By */}
                        <select
                          title="Sort meetings"
                          value={meetingSortBy}
                          onChange={(e) => setMeetingSortBy(e.target.value as any)}
                          className="px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-purple-500 hover:border-purple-300 cursor-pointer"
                        >
                          <option value="newest">Newest First</option>
                          <option value="oldest">Oldest First</option>
                          <option value="upcoming">Upcoming First</option>
                          <option value="title">Title (A-Z)</option>
                        </select>

                        {/* Result Count */}
                        <div className="ml-auto text-sm font-bold text-gray-900">
                          {filteredMeetings.length} of {meetings.length}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {loadingMeetings ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <Loader2 className="h-16 w-16 animate-spin text-purple-600 mx-auto mb-4" />
                    <p className="text-gray-700 font-semibold">Loading meetings...</p>
                  </div>
                </div>
              ) : meetings.length === 0 ? (
                /* Empty State - No meetings at all */
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-300">
                  <div className="inline-block p-6 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full mb-6">
                    <Video className="h-16 w-16 text-blue-600 animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">No meetings yet</h2>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Start your first video meeting with AI-powered transcription
                  </p>
                  <div className="flex justify-center">
                    <Button variant="primary" onClick={() => setCreateMeetingModalOpen(true)}>
                      <Video className="h-4 w-4" />
                      Start New Meeting
                    </Button>
                  </div>
                </div>
              ) : filteredMeetings.length === 0 ? (
                /* No Results - Filters applied but no matches */
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-300">
                  <div className="max-w-md mx-auto px-6">
                    <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
                      <Search className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No meetings found</h3>
                    <p className="text-gray-600 mb-6">No meetings match your search or filter criteria</p>
                    <div className="flex justify-center">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setMeetingSearchQuery('');
                          setMeetingStatusFilter('all');
                        }}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Meetings Grid */
                <div className="grid grid-cols-1 gap-4">
                  {filteredMeetings.map((meeting, index) => (
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

        {/* Create Meeting Modal */}
        <CreateMeetingModal
          isOpen={createMeetingModalOpen}
          onClose={() => setCreateMeetingModalOpen(false)}
          onMeetingCreated={handleMeetingCreated}
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
