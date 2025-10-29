'use client';

import { useEffect, useState } from 'react';
import Pusher from 'pusher-js';

export default function TestPusherPage() {
  const [status, setStatus] = useState('Not connected');
  const [messages, setMessages] = useState<string[]>([]);
  const [pusher, setPusher] = useState<Pusher | null>(null);
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    // Enable logging
    Pusher.logToConsole = true;

    const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
      auth: {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    });

    setPusher(pusherClient);

    pusherClient.connection.bind('connected', () => {
      setStatus('✅ Connected to Pusher');
      addMessage('Connected to Pusher successfully');
    });

    pusherClient.connection.bind('error', (err: any) => {
      setStatus('❌ Connection error');
      addMessage('Error: ' + JSON.stringify(err));
    });

    return () => {
      pusherClient.disconnect();
    };
  }, []);

  const addMessage = (msg: string) => {
    setMessages((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const testChannel = () => {
    if (!pusher) {
      addMessage('❌ Pusher not initialized');
      return;
    }

    // Use PRIVATE channel for client events
    const testChannelName = 'private-test-channel';
    addMessage(`Subscribing to ${testChannelName}...`);

    const ch = pusher.subscribe(testChannelName);

    ch.bind('pusher:subscription_succeeded', () => {
      addMessage('✅ Subscribed to private-test-channel');
    });

    ch.bind('pusher:subscription_error', (error: any) => {
      addMessage('❌ Subscription error: ' + JSON.stringify(error));
    });

    setChannel(ch);
  };

  const testClientEvent = () => {
    if (!channel) {
      addMessage('❌ Channel not subscribed. Click "Test Channel" first.');
      return;
    }

    addMessage('Sending client event...');

    try {
      channel.trigger('client-test-event', { message: 'Hello from client!' });
      addMessage('✅ Client event sent (check if received below)');
    } catch (error: any) {
      addMessage('❌ Error sending client event: ' + error.message);
    }

    // Listen for the event
    channel.bind('client-test-event', (data: any) => {
      addMessage('📥 Received client event: ' + JSON.stringify(data));
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Pusher Configuration Test</h1>

        {/* Status */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold mb-2">Connection Status</h2>
          <p className="text-lg">{status}</p>
        </div>

        {/* Test Buttons */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold mb-4">Tests</h2>
          <div className="space-y-3">
            <button
              onClick={testChannel}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
            >
              1. Test Channel Subscription
            </button>
            <button
              onClick={testClientEvent}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium"
            >
              2. Test Client Events (MUST ENABLE IN PUSHER DASHBOARD!)
            </button>
          </div>
        </div>

        {/* Messages Log */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Event Log</h2>
          <div className="bg-gray-900 rounded p-4 h-96 overflow-y-auto font-mono text-sm">
            {messages.length === 0 ? (
              <p className="text-gray-500">No messages yet...</p>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className="mb-2">
                  {msg}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-green-900/20 border border-green-600 rounded-lg p-4">
          <h3 className="text-green-400 font-semibold mb-2">✅ How It Works Now</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>First, click "Test Channel Subscription"</li>
            <li>You should see "✅ Subscribed to private-test-channel"</li>
            <li>Then click "Test Client Events"</li>
            <li>You should see "✅ Client event sent" AND "📥 Received client event"</li>
            <li>If working here, meetings will work too!</li>
          </ol>
          <div className="mt-4 bg-gray-800 p-3 rounded">
            <p className="font-bold text-blue-400 mb-2">What Changed:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Now using PRIVATE channels (client events are supported)</li>
              <li>Added authentication endpoint at /api/pusher/auth</li>
              <li>No longer need to enable &quot;client events&quot; in Pusher dashboard</li>
              <li>Private channels support client events by default!</li>
            </ul>
          </div>
        </div>

        {/* Config Info */}
        <div className="mt-6 bg-gray-800 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Current Configuration</h3>
          <div className="font-mono text-sm space-y-1">
            <p>
              <span className="text-gray-400">Pusher Key:</span>{' '}
              {process.env.NEXT_PUBLIC_PUSHER_KEY}
            </p>
            <p>
              <span className="text-gray-400">Cluster:</span>{' '}
              {process.env.NEXT_PUBLIC_PUSHER_CLUSTER}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
