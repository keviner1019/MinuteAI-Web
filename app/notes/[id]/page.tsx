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

  // Check if the file is audio/video or document
  const isAudioVideo = note.fileType.startsWith('audio/') || note.fileType.startsWith('video/');
  const isDocument =
    note.fileType.includes('pdf') ||
    note.fileType.includes('document') ||
    note.fileType.includes('word') ||
    note.fileType.includes('presentation') ||
    note.fileType.includes('powerpoint') ||
    note.fileType.includes('spreadsheet') ||
    note.fileType.includes('excel') ||
    note.fileType.includes('text/plain');

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

          {/* Audio Player - Only show for audio/video files */}
          {isAudioVideo && (
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
          )}

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
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Document Analysis</h2>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-semibold">Analysis Complete</span>
                </div>
              </div>

              <div
                className="prose prose-lg max-w-none 
                prose-headings:font-bold
                prose-h1:text-4xl prose-h1:mb-6 prose-h1:mt-8 prose-h1:text-gray-900 prose-h1:border-b-4 prose-h1:border-blue-500 prose-h1:pb-3
                prose-h2:text-3xl prose-h2:mb-5 prose-h2:mt-7 prose-h2:text-blue-900 prose-h2:border-l-4 prose-h2:border-blue-500 prose-h2:pl-4
                prose-h3:text-2xl prose-h3:mb-4 prose-h3:mt-6 prose-h3:text-blue-800
                prose-h4:text-xl prose-h4:mb-3 prose-h4:mt-5 prose-h4:text-gray-800
                prose-p:text-gray-900 prose-p:leading-relaxed prose-p:mb-4 prose-p:text-base
                prose-strong:text-gray-900 prose-strong:font-bold prose-strong:bg-yellow-50 prose-strong:px-1
                prose-em:text-gray-800 prose-em:italic prose-em:font-medium
                prose-ul:text-gray-900 prose-ul:my-5 prose-ul:list-disc prose-ul:pl-6
                prose-ol:text-gray-900 prose-ol:my-5 prose-ol:list-decimal prose-ol:pl-6
                prose-li:text-gray-900 prose-li:mb-3 prose-li:leading-relaxed prose-li:text-base
                prose-blockquote:text-gray-800 prose-blockquote:border-l-8 prose-blockquote:border-blue-500 prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:bg-blue-50 prose-blockquote:py-4 prose-blockquote:my-6 prose-blockquote:rounded-r-lg
                prose-code:text-pink-700 prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:font-semibold prose-code:border prose-code:border-gray-300
                prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:p-6 prose-pre:rounded-xl prose-pre:overflow-x-auto prose-pre:shadow-lg prose-pre:my-6
                prose-a:text-blue-600 prose-a:underline prose-a:font-semibold prose-a:decoration-2 hover:prose-a:text-blue-800 hover:prose-a:bg-blue-50
                prose-img:rounded-xl prose-img:shadow-xl prose-img:my-6
                prose-table:border-collapse prose-table:w-full prose-table:my-6 prose-table:shadow-lg prose-table:rounded-lg prose-table:overflow-hidden
                prose-thead:bg-gradient-to-r prose-thead:from-blue-600 prose-thead:to-blue-500
                prose-th:border prose-th:border-gray-300 prose-th:p-4 prose-th:text-left prose-th:font-bold prose-th:text-white prose-th:text-base
                prose-td:border prose-td:border-gray-200 prose-td:p-4 prose-td:text-gray-900 prose-td:bg-white
                prose-tr:even:bg-gray-50
                prose-hr:border-gray-300 prose-hr:my-8 prose-hr:border-2"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.markdownAnalysis}</ReactMarkdown>
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
