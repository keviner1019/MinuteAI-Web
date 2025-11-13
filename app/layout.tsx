import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { UploadProvider } from '@/contexts/UploadContext';
import Header from '@/components/ui/Header';

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
          <UploadProvider>
            <Header />
            {children}
          </UploadProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
