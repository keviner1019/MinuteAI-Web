'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import { FileAudio, Sparkles, CheckCircle, Zap } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-gray-50">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">MinuteAI</h1>
          <p className="text-2xl text-gray-700 mb-4 font-medium">
            AI-Powered Audio Transcription & Summarization
          </p>
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
            Transform your audio recordings into actionable insights with AI. Get transcripts,
            summaries, action items, and key topics instantly.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button variant="primary" size="lg">
                Get Started Free
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <FileAudio className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Accurate Transcription</h3>
            <p className="text-gray-600 text-sm">
              Convert speech to text with high accuracy using advanced AI. Supports speaker
              diarization.
            </p>
          </div>

          <div className="card">
            <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-violet-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Summarization</h3>
            <p className="text-gray-600 text-sm">
              Get concise summaries of your recordings powered by Google Gemini AI.
            </p>
          </div>

          <div className="card">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Action Items</h3>
            <p className="text-gray-600 text-sm">
              Automatically extract action items and key topics from your meetings and calls.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-md">
                1
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Upload Audio</h3>
              <p className="text-gray-600 text-sm">Upload your audio file in any format</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-violet-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-md">
                2
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI Processing</h3>
              <p className="text-gray-600 text-sm">Our AI transcribes and analyzes your audio</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-md">
                3
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Get Insights</h3>
              <p className="text-gray-600 text-sm">Receive summaries, action items, and topics</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-amber-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-md">
                4
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Take Action</h3>
              <p className="text-gray-600 text-sm">Use insights to drive your work forward</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
