'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { ArrowLeft, Loader2, Play, Download, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { getNote, updateNote, deleteNote } from '@/lib/supabase/database';
import { Note } from '@/types';

export default function NotePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
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

  const handleProcess = async () => {
    if (!note) return;

    setProcessing(true);
    setError('');

    try {
      // Step 1: Transcribe audio
      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: note.id, audioUrl: note.storageUrl }),
      });

      if (!transcribeResponse.ok) {
        throw new Error('Transcription failed');
      }

      const { transcript } = await transcribeResponse.json();

      // Step 2: Generate AI analysis
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: note.id, transcript }),
      });

      if (!analyzeResponse.ok) {
        throw new Error('AI analysis failed');
      }

      // Reload note to get updated data
      await loadNote();
    } catch (err: any) {
      console.error('Processing error:', err);
      setError(err.message || 'Failed to process audio');
    } finally {
      setProcessing(false);
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

          {/* Status & Processing */}
          <div className="card-lg mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Processing Status</h2>
              <Badge
                variant={
                  note.status === 'completed'
                    ? 'completed'
                    : note.status === 'processing'
                    ? 'processing'
                    : note.status === 'failed'
                    ? 'failed'
                    : 'scheduled'
                }
              >
                {note.status.charAt(0).toUpperCase() + note.status.slice(1)}
              </Badge>
            </div>

            {note.status === 'processing' && (
              <div className="mb-4">
                <p className="text-gray-600 mb-2 text-sm">Processing audio file...</p>
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-xs text-gray-500">This may take a few minutes</span>
                </div>
              </div>
            )}

            {!note.transcript && note.status !== 'completed' && (
              <Button
                variant="primary"
                onClick={handleProcess}
                disabled={processing}
                isLoading={processing}
              >
                <Play className="h-4 w-4" />
                {processing ? 'Processing...' : 'Process Audio'}
              </Button>
            )}
          </div>

          {/* Transcript */}
          {note.transcript && (
            <div className="card-lg mb-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Transcript</h2>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">
                  {note.transcript}
                </p>
              </div>
            </div>
          )}

          {/* Summary */}
          {note.summary && (
            <div className="card-lg mb-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">AI Summary</h2>
              <p className="text-gray-700 text-sm leading-relaxed">{note.summary}</p>
            </div>
          )}

          {/* Action Items */}
          {note.actionItems && note.actionItems.length > 0 && (
            <div className="card-lg mb-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Action Items</h2>
              <ul className="space-y-2">
                {note.actionItems.map((item, index) => (
                  <li key={item.id || index} className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-sm">{item.text}</span>
                  </li>
                ))}
              </ul>
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
