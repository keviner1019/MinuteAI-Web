import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { UploadProvider } from '@/contexts/UploadContext';
import { ToastProvider } from '@/contexts/ToastContext';
import Header from '@/components/ui/Header';
import NotificationListener from '@/components/notifications/NotificationListener';

export const metadata: Metadata = {
  title: 'MinuteAI - AI-Powered Audio Transcription & Summarization',
  description:
    'Upload audio files and get AI-generated summaries, action items, key topics, and full transcripts',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <AuthProvider>
          <ToastProvider>
            <UploadProvider>
              <Header />
              {children}
              <NotificationListener />
            </UploadProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
