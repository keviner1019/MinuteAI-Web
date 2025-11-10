'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Hash, Link as LinkIcon } from 'lucide-react';
import Button from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

export default function JoinMeetingPage() {
  const [meetingCode, setMeetingCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingCode.trim()) {
      setError('Please enter a meeting code');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const codeToSearch = meetingCode.toUpperCase().trim();
      console.log('🔍 Looking for meeting with code:', codeToSearch);

      // Query for meeting with this code - use maybeSingle() to avoid errors
      const { data: meeting, error: dbError } = await supabase
        .from('meetings')
        .select('room_id, status, meeting_code')
        .eq('meeting_code', codeToSearch)
        .maybeSingle();

      console.log('📊 Query result:', { meeting, error: dbError });

      if (dbError) {
        console.error('❌ Database error:', dbError);
        setError('Failed to find meeting. Please try again.');
        return;
      }

      if (!meeting) {
        setError('Invalid meeting code. Please check and try again.');
        return;
      }

      // Check if meeting has ended
      if ((meeting as any).status === 'ended') {
        setError('This meeting has already ended');
        return;
      }

      console.log('✅ Meeting found! Joining room:', (meeting as any).room_id);

      // Join the meeting
      router.push(`/meeting/${(meeting as any).room_id}`);
    } catch (err) {
      console.error('❌ Error joining meeting:', err);
      setError('Failed to join meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Video className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join a Meeting</h1>
          <p className="text-gray-600">Enter the meeting code provided by the host</p>
        </div>

        {/* Join Form */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <form onSubmit={handleJoinByCode} className="space-y-6">
            {/* Meeting Code Input */}
            <div>
              <label htmlFor="meetingCode" className="block text-sm font-medium text-gray-700 mb-2">
                <Hash className="h-4 w-4 inline mr-1" />
                Meeting Code
              </label>
              <input
                type="text"
                id="meetingCode"
                value={meetingCode}
                onChange={(e) => setMeetingCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="w-full px-4 py-3 text-center text-2xl font-mono tracking-wider border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-gray-900"
                disabled={loading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Join Button */}
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading || !meetingCode.trim()}
            >
              {loading ? 'Joining...' : 'Join Meeting'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Alternative Options */}
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-600">Have a meeting link instead?</p>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                const link = prompt('Paste the meeting link here:');
                if (link) {
                  try {
                    const url = new URL(link);
                    const pathParts = url.pathname.split('/');
                    const roomId = pathParts[pathParts.indexOf('meeting') + 1];
                    if (roomId) {
                      router.push(`/meeting/${roomId}`);
                    }
                  } catch {
                    setError('Invalid meeting link');
                  }
                }
              }}
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Join with Link
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Don&apos;t have a meeting code?{' '}
            <button
              onClick={() => router.push('/dashboard')}
              className="text-blue-600 hover:underline font-medium"
            >
              Go to Dashboard
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
