import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const AccessToken = twilio.jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;

// Twilio credentials from environment variables
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioApiKeySid = process.env.TWILIO_API_KEY_SID;
const twilioApiKeySecret = process.env.TWILIO_API_KEY_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Validate Twilio credentials
    if (!twilioAccountSid || !twilioApiKeySid || !twilioApiKeySecret) {
      console.error('Missing Twilio credentials');
      return NextResponse.json(
        { error: 'Twilio credentials not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { roomName, identity } = body;

    if (!roomName) {
      return NextResponse.json(
        { error: 'Room name is required' },
        { status: 400 }
      );
    }

    if (!identity) {
      return NextResponse.json(
        { error: 'Identity is required' },
        { status: 400 }
      );
    }

    // Create an access token
    const token = new AccessToken(
      twilioAccountSid,
      twilioApiKeySid,
      twilioApiKeySecret,
      { identity }
    );

    // Create a Video grant and add it to the token
    const videoGrant = new VideoGrant({
      room: roomName,
    });

    token.addGrant(videoGrant);

    // Generate the token
    const jwt = token.toJwt();

    console.log(`Generated Twilio token for room: ${roomName}, identity: ${identity}`);

    return NextResponse.json({
      token: jwt,
      roomName,
      identity,
    });
  } catch (error) {
    console.error('Error generating Twilio token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
