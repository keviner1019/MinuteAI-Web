import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { UploadProvider } from '@/contexts/UploadContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { PresenceProvider } from '@/contexts/PresenceContext';
import { MeetingNotificationProvider } from '@/contexts/MeetingNotificationContext';
import Header from '@/components/ui/Header';
import NotificationListener from '@/components/notifications/NotificationListener';

export const metadata: Metadata = {
  title: 'MinuteAI - AI-Powered Audio Transcription & Summarization',
  description:
    'Upload audio files and get AI-generated summaries, action items, key topics, and full transcripts',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: '/apple-touch-icon.svg',
  },
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
          <PresenceProvider>
            <ToastProvider>
              <MeetingNotificationProvider>
                <UploadProvider>
                  <Header />
                  {children}
                  <NotificationListener />
                </UploadProvider>
              </MeetingNotificationProvider>
            </ToastProvider>
          </PresenceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
