import { NextResponse } from 'next/server';
import { AssemblyAI } from 'assemblyai';

export async function GET() {
  try {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;

    if (!apiKey) {
      console.error('AssemblyAI API key not found in environment variables');
      return NextResponse.json({ error: 'AssemblyAI API key not configured' }, { status: 500 });
    }

    console.log('Creating temporary token for browser streaming...');

    // Initialize AssemblyAI client on the server
    const client = new AssemblyAI({
      apiKey: apiKey,
    });

    // Create a temporary token for browser-based streaming
    const token = await client.streaming.createTemporaryToken({
      expires_in_seconds: 600, // Token expires in 10 minutes (max allowed)
    });

    console.log('Successfully created temporary token');
    return NextResponse.json({ token });
  } catch (error: any) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate token',
      },
      { status: 500 }
    );
  }
}
