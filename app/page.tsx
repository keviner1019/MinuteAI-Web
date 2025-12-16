'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import {
  FileAudio,
  Sparkles,
  CheckCircle,
  Video,
  Users,
  Globe,
  ArrowRight,
  Mic,
  Brain,
  Clock,
  Share2,
  Calendar,
  ListTodo,
  Play,
  Shield,
  Zap,
  ChevronRight,
  Star,
  MessageSquare
} from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/logo-icon.svg"
            alt="MinuteAI"
            width={64}
            height={64}
            className="animate-pulse"
          />
          <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-[loading_1s_ease-in-out_infinite]"
                 style={{ width: '40%', animation: 'loading 1.2s ease-in-out infinite' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Image
                src="/logo-icon.svg"
                alt="MinuteAI"
                width={36}
                height={36}
                className="rounded-xl"
              />
              <span className="text-xl font-bold text-slate-900">
                Minute<span className="text-blue-600">AI</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login"
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Sign In
              </Link>
              <Link href="/signup"
                className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32">
        {/* Background Pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-100/50 rounded-full blur-[100px]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f910_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f910_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-blue-50 rounded-full border border-blue-100 text-sm">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-blue-700 font-medium">AI-Powered Meeting Intelligence</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-8">
              Transform your meetings
              <span className="block mt-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                into actionable insights
              </span>
            </h1>

            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Host HD video meetings with real-time transcription, AI summaries,
              and automatic action items. Works with uploaded audio files too.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link href="/signup"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-all duration-200 shadow-lg shadow-slate-900/10 hover:shadow-xl hover:shadow-slate-900/20">
                Start for Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/join"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-700 font-semibold rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200">
                <Play className="w-5 h-5" />
                Join a Meeting
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span>Up to 10 participants</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span>99% transcription accuracy</span>
              </div>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none" />
            <div className="relative mx-auto max-w-5xl">
              <div className="bg-gradient-to-b from-slate-100 to-slate-50 rounded-2xl p-2 shadow-2xl shadow-slate-900/10 border border-slate-200">
                <div className="bg-white rounded-xl p-6 lg:p-8">
                  {/* Mock Dashboard UI */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-amber-400" />
                      <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    </div>
                    <div className="flex-1 h-8 bg-slate-100 rounded-lg" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 h-48 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl flex items-center justify-center">
                      <div className="text-center">
                        <Video className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">Live Meeting Preview</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="h-[88px] bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                        <MessageSquare className="w-5 h-5 text-blue-600 mb-2" />
                        <div className="h-2 bg-blue-200 rounded w-3/4 mb-1.5" />
                        <div className="h-2 bg-blue-100 rounded w-1/2" />
                      </div>
                      <div className="h-[88px] bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                        <ListTodo className="w-5 h-5 text-emerald-600 mb-2" />
                        <div className="h-2 bg-emerald-200 rounded w-2/3 mb-1.5" />
                        <div className="h-2 bg-emerald-100 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">Features</p>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Everything you need for smarter meetings</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Powerful AI tools that work together to save you time and boost productivity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature Cards */}
            {[
              {
                icon: Video,
                title: 'HD Video Meetings',
                description: 'Crystal clear video calls with up to 10 participants. Screen sharing and recording included.',
                color: 'blue'
              },
              {
                icon: Mic,
                title: 'Real-Time Transcription',
                description: 'Live captions powered by AssemblyAI with speaker identification and 99% accuracy.',
                color: 'indigo'
              },
              {
                icon: Brain,
                title: 'AI-Powered Analysis',
                description: 'DeepSeek AI generates smart summaries, extracts key topics, and identifies decisions.',
                color: 'violet'
              },
              {
                icon: ListTodo,
                title: 'Smart Action Items',
                description: 'Automatically extract to-dos with priorities and deadlines. Track progress easily.',
                color: 'emerald'
              },
              {
                icon: FileAudio,
                title: 'Audio File Processing',
                description: 'Upload MP3, WAV, M4A files. Batch process multiple recordings at once.',
                color: 'orange'
              },
              {
                icon: Globe,
                title: 'Translation',
                description: 'Instant translation to 50+ languages with DeepL. Break all language barriers.',
                color: 'cyan'
              }
            ].map((feature, index) => {
              const colorClasses: Record<string, { bg: string; icon: string; border: string }> = {
                blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'hover:border-blue-200' },
                indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'hover:border-indigo-200' },
                violet: { bg: 'bg-violet-50', icon: 'text-violet-600', border: 'hover:border-violet-200' },
                emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'hover:border-emerald-200' },
                orange: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'hover:border-orange-200' },
                cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', border: 'hover:border-cyan-200' }
              };
              const colors = colorClasses[feature.color];

              return (
                <div key={index}
                  className={`group bg-white rounded-2xl p-8 border border-slate-200 ${colors.border} hover:shadow-lg transition-all duration-300`}>
                  <div className={`w-14 h-14 ${colors.bg} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`w-7 h-7 ${colors.icon}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">Collaboration</p>
              <h2 className="text-4xl font-bold text-slate-900 mb-6">Built for teams that move fast</h2>
              <p className="text-lg text-slate-600 mb-8">
                Share notes, schedule meetings, and keep everyone in sync with powerful collaboration tools.
              </p>

              <div className="space-y-6">
                {[
                  {
                    icon: Calendar,
                    title: 'Meeting Scheduling',
                    description: 'Schedule meetings with automatic reminders at 15min, 1hr, and 1 day before.'
                  },
                  {
                    icon: Zap,
                    title: 'Easy Join Codes',
                    description: 'Share simple 6-character codes for instant meeting access.'
                  },
                  {
                    icon: Share2,
                    title: 'Note Sharing',
                    description: 'Collaborate on notes with viewer or editor permissions.'
                  },
                  {
                    icon: Play,
                    title: 'Meeting Recording',
                    description: 'Record video meetings with automatic cloud storage.'
                  }
                ].map((item, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-slate-700" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                      <p className="text-slate-600">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl blur-3xl opacity-10" />
              <div className="relative bg-gradient-to-br from-slate-100 to-slate-50 rounded-3xl p-8 border border-slate-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900 mb-1">10</p>
                    <p className="text-sm text-slate-500">Max Participants</p>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                      <Globe className="w-5 h-5 text-indigo-600" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900 mb-1">50+</p>
                    <p className="text-sm text-slate-500">Languages</p>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900 mb-1">99%</p>
                    <p className="text-sm text-slate-500">Accuracy</p>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center mb-4">
                      <Zap className="w-5 h-5 text-violet-600" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900 mb-1">Real-time</p>
                    <p className="text-sm text-slate-500">Transcription</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">How It Works</p>
            <h2 className="text-4xl font-bold text-slate-900">Three simple steps</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Start or Upload',
                description: 'Begin a video meeting instantly or upload your audio files. We support MP3, WAV, M4A, and more.',
                icon: Play
              },
              {
                step: '02',
                title: 'AI Does the Work',
                description: 'AssemblyAI transcribes in real-time while DeepSeek AI analyzes and extracts key insights.',
                icon: Brain
              },
              {
                step: '03',
                title: 'Review & Share',
                description: 'Get summaries, action items, and key topics. Translate and share with your entire team.',
                icon: Share2
              }
            ].map((item, index) => (
              <div key={index} className="relative">
                {index < 2 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-slate-300 to-transparent" />
                )}
                <div className="relative bg-white rounded-2xl p-8 border border-slate-200 hover:shadow-lg transition-shadow">
                  <span className="text-5xl font-bold text-slate-100">{item.step}</span>
                  <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center my-6">
                    <item.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-slate-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">Use Cases</p>
            <h2 className="text-4xl font-bold text-slate-900">Perfect for every team</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Users,
                title: 'Remote Teams',
                description: 'Keep distributed teams aligned with shared transcripts and action items',
                color: 'blue'
              },
              {
                icon: Sparkles,
                title: 'Content Creators',
                description: 'Transform podcasts and interviews into written content instantly',
                color: 'indigo'
              },
              {
                icon: Clock,
                title: 'Busy Professionals',
                description: 'Save hours on note-taking with AI-generated summaries',
                color: 'violet'
              },
              {
                icon: Globe,
                title: 'Global Teams',
                description: 'Bridge language gaps with instant translation to 50+ languages',
                color: 'emerald'
              }
            ].map((item, index) => {
              const bgColors: Record<string, string> = {
                blue: 'bg-blue-50',
                indigo: 'bg-indigo-50',
                violet: 'bg-violet-50',
                emerald: 'bg-emerald-50'
              };
              const iconColors: Record<string, string> = {
                blue: 'text-blue-600',
                indigo: 'text-indigo-600',
                violet: 'text-violet-600',
                emerald: 'text-emerald-600'
              };

              return (
                <div key={index} className="group text-center p-8 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all bg-white">
                  <div className={`w-14 h-14 ${bgColors[item.color]} rounded-xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform`}>
                    <item.icon className={`w-7 h-7 ${iconColors[item.color]}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-slate-600 text-sm">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-16 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium text-slate-500 uppercase tracking-wider mb-8">Powered by industry leaders</p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {[
              { name: 'AssemblyAI', letter: 'A', gradient: 'from-emerald-500 to-teal-600' },
              { name: 'DeepSeek AI', letter: 'D', gradient: 'from-blue-500 to-indigo-600' },
              { name: 'DeepL', letter: 'D', gradient: 'from-cyan-500 to-blue-600' },
              { name: 'Supabase', letter: 'S', gradient: 'from-emerald-500 to-green-600' },
              { name: 'WebRTC', letter: 'W', gradient: 'from-orange-500 to-red-600' }
            ].map((tech, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className={`w-9 h-9 bg-gradient-to-br ${tech.gradient} rounded-lg flex items-center justify-center`}>
                  <span className="text-white font-bold text-sm">{tech.letter}</span>
                </div>
                <span className="font-semibold text-slate-700">{tech.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden bg-slate-900 rounded-3xl p-12 lg:p-16">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />

            <div className="relative text-center">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                Ready to transform your meetings?
              </h2>
              <p className="text-lg text-slate-300 mb-8 max-w-xl mx-auto">
                Join teams who save hours every week with AI-powered transcription and analysis.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/signup"
                  className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors">
                  Start Free Today
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/join"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors border border-white/20">
                  Join a Meeting
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-icon.svg"
                alt="MinuteAI"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="font-bold text-slate-900">
                Minute<span className="text-blue-600">AI</span>
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <span>Powered by AssemblyAI, DeepSeek AI & DeepL</span>
            </div>
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} MinuteAI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
