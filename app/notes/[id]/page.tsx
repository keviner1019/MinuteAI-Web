'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Button from '@/components/ui/Button';
import {
  ArrowLeft,
  Loader2,
  Download,
  Trash2,
  XCircle,
  CheckCircle2,
  Music,
  FileText,
  Share2,
  Users,
} from 'lucide-react';
import { getNote, deleteNote } from '@/lib/supabase/database';
import { Note, ActionItem, TranscriptSegment } from '@/types';
import { ActionItemChange } from '@/hooks/useActionItems';
import TranscriptViewer from '@/components/meeting/TranscriptViewer';
import ActionItemsList from '@/components/meeting/ActionItemsList';
import ShareNoteModal from '@/components/notes/ShareNoteModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function NotePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const noteId = params.id as string;

  useEffect(() => {
    if (noteId) {
      loadNote();
    }
  }, [noteId]);

  const loadNote = async () => {
    try {
      setLoading(true);
      const data = await getNote(noteId);
      if (data) {
        setNote(data);
      } else {
        setError('Note not found');
      }
    } catch (err) {
      console.error('Error loading note:', err);
      setError('Failed to load note');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await deleteNote(noteId);
      router.push('/dashboard');
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete note');
    }
  };

  // Handle action items update - calls API for real-time notifications
  const handleUpdateActionItems = async (items: ActionItem[], change?: ActionItemChange) => {
    try {
      // Call the API to update action items with real-time notifications
      const response = await fetch(`/api/notes/${noteId}/action-items`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionItems: items,
          changeType: change?.type,
          changedItem: change?.item,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update action items');
      }

      // Update local state
      setNote((prev) => (prev ? { ...prev, actionItems: items } : null));
    } catch (error) {
      console.error('Failed to update action items:', error);
      throw error; // Let the component handle the error
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        </div>
      </ProtectedRoute>
    );
  }

  if (error && !note) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{error}</h2>
            <Button onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!note) return null;

  // Check if the note contains an audio/video file
  const hasAudio = note.fileType?.startsWith('audio/') || note.fileType?.startsWith('video/');

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 pb-8">
        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header with Enhanced File Display */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              className="mb-6 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>

            {/* Title and Actions */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-4xl font-bold text-gray-900 leading-tight">
                    {note.title}
                  </h1>
                  {note.isShared && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                      <Users className="h-3.5 w-3.5" />
                      Shared
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Created{' '}
                  {new Date(note.createdAt).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="secondary"
                  onClick={() => setIsShareModalOpen(true)}
                  className="hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 transition-all"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleDelete}
                  className="hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>

            {/* File Information Card */}
            <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border-2 border-blue-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-3 bg-white rounded-xl shadow-sm">
                  {hasAudio ? (
                    <Music className="h-8 w-8 text-blue-600" />
                  ) : (
                    <FileText className="h-8 w-8 text-purple-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 mb-1">File Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600 font-medium">Name:</span>
                      <span className="text-gray-900 font-semibold truncate">{note.fileName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600 font-medium">Size:</span>
                      <span className="text-gray-900 font-semibold">
                        {(note.fileSize / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600 font-medium">Type:</span>
                      <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                        {hasAudio ? 'Audio/Video' : 'Document'}
                      </span>
                    </div>
                    {note.transcript && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-green-700 font-semibold">Processing Complete</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Completed Transcription Section with Integrated Audio Player - only show if audio files exist */}
          {hasAudio && note.transcript && (
            <div className="card-lg mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Transcription</h2>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">Transcription Complete</span>
                </div>
              </div>

              {/* Show segments if available, otherwise show plain transcript */}
              {note.transcriptSegments && note.transcriptSegments.length > 0 ? (
                <TranscriptViewer
                  segments={note.transcriptSegments}
                  audioUrl={note.storageUrl}
                  title={note.title}
                  noteId={note.id}
                />
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-6 max-h-[600px] overflow-y-auto">
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                    {note.transcript}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Markdown Analysis (for documents) */}
          {note.markdownAnalysis && (
            <div className="card-lg mb-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Document Analysis</h2>
              </div>

              <div
                className="prose prose-lg max-w-none 
                [&_*]:text-gray-900 
                [&_h1]:!text-4xl [&_h1]:!mb-6 [&_h1]:!mt-8 [&_h1]:!text-gray-900 [&_h1]:!font-black [&_h1]:!border-b-4 [&_h1]:!border-blue-500 [&_h1]:!pb-3
                [&_h2]:!text-3xl [&_h2]:!mb-5 [&_h2]:!mt-7 [&_h2]:!text-blue-900 [&_h2]:!font-bold [&_h2]:!border-l-4 [&_h2]:!border-blue-500 [&_h2]:!pl-4
                [&_h3]:!text-2xl [&_h3]:!mb-4 [&_h3]:!mt-6 [&_h3]:!text-blue-800 [&_h3]:!font-bold
                [&_h4]:!text-xl [&_h4]:!mb-3 [&_h4]:!mt-5 [&_h4]:!text-gray-800 [&_h4]:!font-bold
                [&_p]:!text-gray-900 [&_p]:!leading-relaxed [&_p]:!mb-4 [&_p]:!text-base [&_p]:!font-medium
                [&_strong]:!text-gray-900 [&_strong]:!font-black
                [&_b]:!text-gray-900 [&_b]:!font-black
                [&_em]:!text-gray-800 [&_em]:!italic [&_em]:!font-semibold
                [&_ul]:!text-gray-900 [&_ul]:!my-5 [&_ul]:!list-disc [&_ul]:!pl-6
                [&_ol]:!text-gray-900 [&_ol]:!my-5 [&_ol]:!list-decimal [&_ol]:!pl-6
                [&_li]:!text-gray-900 [&_li]:!mb-3 [&_li]:!leading-relaxed [&_li]:!text-base [&_li]:!font-medium
                [&_blockquote]:!text-gray-800 [&_blockquote]:!border-l-8 [&_blockquote]:!border-blue-500 [&_blockquote]:!pl-6 [&_blockquote]:!italic [&_blockquote]:!bg-blue-50 [&_blockquote]:!py-4 [&_blockquote]:!my-6 [&_blockquote]:!rounded-r-lg
                [&_code]:!text-pink-700 [&_code]:!bg-gray-100 [&_code]:!px-2 [&_code]:!py-1 [&_code]:!rounded [&_code]:!text-sm [&_code]:!font-mono [&_code]:!font-bold [&_code]:!border [&_code]:!border-gray-300
                [&_pre]:!bg-gray-900 [&_pre]:!text-gray-100 [&_pre]:!p-6 [&_pre]:!rounded-xl [&_pre]:!overflow-x-auto [&_pre]:!shadow-lg [&_pre]:!my-6
                [&_a]:!text-blue-600 [&_a]:!underline [&_a]:!font-bold [&_a]:!decoration-2 hover:[&_a]:!text-blue-800 hover:[&_a]:!bg-blue-50
                [&_img]:!rounded-xl [&_img]:!shadow-xl [&_img]:!my-6
                [&_table]:!border-collapse [&_table]:!w-full [&_table]:!my-6 [&_table]:!shadow-lg [&_table]:!rounded-lg [&_table]:!overflow-hidden
                [&_thead]:!bg-gradient-to-r [&_thead]:!from-blue-600 [&_thead]:!to-blue-500
                [&_th]:!border [&_th]:!border-gray-300 [&_th]:!p-4 [&_th]:!text-left [&_th]:!font-bold [&_th]:!text-white [&_th]:!text-base
                [&_td]:!border [&_td]:!border-gray-200 [&_td]:!p-4 [&_td]:!text-gray-900 [&_td]:!bg-white [&_td]:!font-medium
                [&_tr:nth-child(even)]:!bg-gray-50
                [&_hr]:!border-gray-300 [&_hr]:!my-8 [&_hr]:!border-2"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.markdownAnalysis}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Summary */}
          {note.summary && !note.markdownAnalysis && (
            <div className="card-lg mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">AI Summary</h2>
              <p className="text-gray-900 text-base leading-relaxed font-medium">{note.summary}</p>
            </div>
          )}

          {/* Smart Action Items */}
          {note.actionItems && note.actionItems.length > 0 && (
            <div className="card-lg mb-6">
              <ActionItemsList
                initialItems={note.actionItems}
                noteId={note.id}
                onUpdate={handleUpdateActionItems}
              />
            </div>
          )}

          {/* Key Topics */}
          {note.keyTopics && note.keyTopics.length > 0 && (
            <div className="card-lg">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Key Topics</h2>
              <div className="flex flex-wrap gap-2">
                {note.keyTopics.map((topic, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-gradient-to-r from-violet-100 to-purple-100 text-violet-900 rounded-full text-sm font-bold border-2 border-violet-200"
                  >
                    #{topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Share Note Modal */}
        {user && (
          <ShareNoteModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            noteId={noteId}
            noteTitle={note.title}
            currentUserId={user.id}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
