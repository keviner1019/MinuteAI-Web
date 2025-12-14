import { NextResponse } from 'next/server';
import { verifyEmailConnection, isEmailConfigured } from '@/lib/email';

// GET: Verify email service is configured and working
export async function GET() {
  try {
    if (!isEmailConfigured()) {
      return NextResponse.json({
        configured: false,
        connected: false,
        message: 'Email service not configured. Please set SMTP environment variables.',
      });
    }

    const isConnected = await verifyEmailConnection();

    return NextResponse.json({
      configured: true,
      connected: isConnected,
      message: isConnected
        ? 'Email service is configured and connected'
        : 'Email service is configured but connection failed. Check SMTP credentials.',
    });
  } catch (error) {
    console.error('Email verify error:', error);
    return NextResponse.json({
      configured: isEmailConfigured(),
      connected: false,
      message: 'Error verifying email connection',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
