'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Button from '@/components/ui/Button';
import { ArrowLeft, Loader2, Download, Trash2, XCircle, CheckCircle2 } from 'lucide-react';
import { getNote, deleteNote, updateActionItems } from '@/lib/supabase/database';
import { Note, ActionItem, TranscriptSegment } from '@/types';
import TranscriptViewer from '@/components/meeting/TranscriptViewer';
import ActionItemsList from '@/components/meeting/ActionItemsList';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function NotePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  // Handle action items update
  const handleUpdateActionItems = async (items: ActionItem[]) => {
    try {
      await updateActionItems(noteId, items);
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 pb-8">
        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.push('/dashboard')} className="mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{note.title}</h1>
                <p className="text-sm text-gray-600">
                  {note.fileName} • {(note.fileSize / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button variant="secondary" onClick={handleDelete} className="ml-4">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Audio Player */}
          <div className="card-lg mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Audio File</h2>
            <audio controls className="w-full" src={note.storageUrl}>
              Your browser does not support the audio element.
            </audio>
            <div className="mt-4">
              <a
                href={note.storageUrl}
                download={note.fileName}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 inline-flex"
              >
                <Download className="h-4 w-4" />
                Download Audio
              </a>
            </div>
          </div>

          {/* Completed Transcription Section */}
          {note.transcript && !note.markdownAnalysis && (
            <div className="card-lg mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Completed Transcription</h2>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">Transcription Complete</span>
                </div>
              </div>

              <TranscriptViewer
                segments={note.transcriptSegments || []}
                audioUrl={note.storageUrl}
                title={note.title}
                noteId={note.id}
              />
            </div>
          )}

          {/* Markdown Analysis (for documents) */}
          {note.markdownAnalysis && (
            <div className="card-lg mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Document Analysis</h2>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">Analysis Complete</span>
                </div>
              </div>

              <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-blockquote:text-gray-700 prose-blockquote:border-blue-500">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {note.markdownAnalysis}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Summary */}
          {note.summary && !note.markdownAnalysis && (
            <div className="card-lg mb-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">AI Summary</h2>
              <p className="text-gray-700 text-sm leading-relaxed">{note.summary}</p>
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
              <h2 className="text-base font-semibold text-gray-900 mb-4">Key Topics</h2>
              <div className="flex flex-wrap gap-2">
                {note.keyTopics.map((topic, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-violet-50 text-violet-700 rounded-full text-xs font-medium"
                  >
                    #{topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
