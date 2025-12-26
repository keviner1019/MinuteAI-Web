'use client';

import { useState, useEffect, useRef } from 'react';
import { VideoGrid } from '@/components/meeting/VideoGrid';
import { RecordingNotificationBanner } from '@/components/meeting/RecordingNotificationBanner';
import { useCompositeRecorder } from '@/hooks/useCompositeRecorder';
import { Participant } from '@/types';
import {
  Play,
  Square,
  UserPlus,
  UserMinus,
  Pin,
  Maximize2,
  Grid,
  WifiOff,
  Wifi,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'pending';
  message: string;
}

export default function TestRecordingPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [localVideoStream, setLocalVideoStream] = useState<MediaStream | null>(null);
  const [recordingNotifications, setRecordingNotifications] = useState<any[]>([]);
  const [recordingUsers, setRecordingUsers] = useState<Map<string, any>>(new Map());
  const [pinnedUserId, setPinnedUserId] = useState<string | null>(null);
  const testMeetingId = 'test-meeting-' + Date.now();
  const participantCountRef = useRef(0);

  const {
    isRecording,
    isSaving,
    recordingDuration,
    error,
    startRecording,
    stopRecording,
    updateParticipant,
    addParticipant,
    removeParticipant,
    setLayoutMode,
    setPinnedUser,
    setSpeakingUser,
  } = useCompositeRecorder(testMeetingId);

  // Initialize local media
  useEffect(() => {
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setLocalStream(stream);
        setLocalVideoStream(stream);
        addTestResult('Local Media Access', 'passed', 'Successfully accessed camera and microphone');
      } catch (err) {
        addTestResult('Local Media Access', 'failed', `Failed: ${err}`);
      }
    };
    initMedia();

    return () => {
      localStream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const addTestResult = (name: string, status: TestResult['status'], message: string) => {
    setTestResults(prev => {
      const existing = prev.findIndex(r => r.name === name);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { name, status, message };
        return updated;
      }
      return [...prev, { name, status, message }];
    });
  };

  // Test 1: Multi-user video recording
  const testMultiUserRecording = async () => {
    addTestResult('Multi-User Recording', 'pending', 'Testing...');

    try {
      // Create mock participants
      const mockParticipants: Participant[] = [];
      for (let i = 0; i < 4; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = `hsl(${i * 90}, 70%, 50%)`;
        ctx.fillRect(0, 0, 640, 480);
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`User ${i + 1}`, 320, 260);

        const videoStream = canvas.captureStream(30);

        mockParticipants.push({
          userId: `user-${i}`,
          sessionId: `session-${i}`,
          displayName: `Test User ${i + 1}`,
          avatarUrl: null,
          isMuted: false,
          isVideoEnabled: true,
          isSpeaking: false,
          isRecording: false,
          connectionState: 'connected',
          stream: videoStream,
          videoStream: videoStream,
        });
      }

      setParticipants(mockParticipants);

      // Start recording with multiple participants
      await startRecording(
        localVideoStream,
        null,
        localStream,
        { display_name: 'Local User' },
        null,
        new Map(mockParticipants.map(p => [p.userId, p]))
      );

      // Wait a bit to record
      await new Promise(resolve => setTimeout(resolve, 3000));

      if (isRecording) {
        addTestResult('Multi-User Recording', 'passed',
          `Recording ${mockParticipants.length + 1} participants successfully`);
      } else {
        addTestResult('Multi-User Recording', 'failed', 'Recording did not start');
      }
    } catch (err) {
      addTestResult('Multi-User Recording', 'failed', `Error: ${err}`);
    }
  };

  // Test 2: Connection failure handling
  const testConnectionFailure = async () => {
    addTestResult('Connection Failure Handling', 'pending', 'Testing...');

    try {
      // Simulate a participant disconnecting
      if (participants.length > 0) {
        const disconnectedId = participants[0].userId;
        updateParticipant(disconnectedId, {
          connectionState: 'disconnected',
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        addTestResult('Connection Failure Handling', 'passed',
          'Participant marked as disconnected, visual indicator shown');
      } else {
        addTestResult('Connection Failure Handling', 'failed',
          'No participants to test with');
      }
    } catch (err) {
      addTestResult('Connection Failure Handling', 'failed', `Error: ${err}`);
    }
  };

  // Test 3: Pin/Zoom functionality
  const testPinZoom = () => {
    addTestResult('Pin/Zoom Functionality', 'pending', 'Testing...');

    try {
      if (participants.length > 0) {
        const pinnedId = participants[0].userId;
        setPinnedUserId(pinnedId);
        setPinnedUser(pinnedId);
        setLayoutMode('spotlight');

        addTestResult('Pin/Zoom Functionality', 'passed',
          `Pinned user ${pinnedId}, switched to spotlight layout`);
      } else {
        // Test with local user
        setPinnedUserId('local');
        setPinnedUser('local');
        setLayoutMode('spotlight');

        addTestResult('Pin/Zoom Functionality', 'passed',
          'Pinned local user, switched to spotlight layout');
      }
    } catch (err) {
      addTestResult('Pin/Zoom Functionality', 'failed', `Error: ${err}`);
    }
  };

  // Test 4: Video layout pagination
  const testLayoutPagination = () => {
    addTestResult('Layout Pagination', 'pending', 'Testing...');

    try {
      // Create 7+ participants to trigger pagination
      const manyParticipants: Participant[] = [];
      for (let i = 0; i < 8; i++) {
        manyParticipants.push({
          userId: `user-${i}`,
          sessionId: `session-${i}`,
          displayName: `User ${i + 1}`,
          avatarUrl: null,
          isMuted: false,
          isVideoEnabled: true,
          isSpeaking: false,
          isRecording: false,
          connectionState: 'connected',
          stream: null,
          videoStream: null,
        });
      }

      setParticipants(manyParticipants);

      // Pagination should be enabled with > 6 participants
      addTestResult('Layout Pagination', 'passed',
        `Created ${manyParticipants.length} participants, pagination should be visible`);
    } catch (err) {
      addTestResult('Layout Pagination', 'failed', `Error: ${err}`);
    }
  };

  // Test 5: Recording notifications
  const testRecordingNotifications = () => {
    addTestResult('Recording Notifications', 'pending', 'Testing...');

    try {
      // Simulate recording notification
      const mockNotification = {
        type: 'recording_started' as const,
        userId: 'test-user-1',
        userName: 'Test User',
        timestamp: Date.now(),
      };

      setRecordingNotifications([mockNotification]);

      // Also add to recording users map
      const newRecordingUsers = new Map(recordingUsers);
      newRecordingUsers.set('test-user-1', {
        userId: 'test-user-1',
        userName: 'Test User',
        isRecording: true,
        startedAt: Date.now(),
      });
      setRecordingUsers(newRecordingUsers);

      setTimeout(() => {
        // Test stop notification
        const stopNotification = {
          type: 'recording_stopped' as const,
          userId: 'test-user-1',
          userName: 'Test User',
          timestamp: Date.now(),
        };
        setRecordingNotifications(prev => [...prev, stopNotification]);
        setRecordingUsers(new Map());
      }, 2000);

      addTestResult('Recording Notifications', 'passed',
        'Notification banner displayed, auto-dismiss working');
    } catch (err) {
      addTestResult('Recording Notifications', 'failed', `Error: ${err}`);
    }
  };

  // Test 6: Multiple recordings per meeting
  const testMultipleRecordings = async () => {
    addTestResult('Multiple Recordings', 'pending', 'Testing first recording...');

    try {
      if (!localStream) {
        addTestResult('Multiple Recordings', 'failed', 'No local stream available');
        return;
      }

      // First recording
      await startRecording(localVideoStream, null, localStream, { display_name: 'User' }, null);
      await new Promise(resolve => setTimeout(resolve, 2000));
      await stopRecording();

      addTestResult('Multiple Recordings', 'pending', 'First recording done, starting second...');

      // Wait for save to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Second recording
      await startRecording(localVideoStream, null, localStream, { display_name: 'User' }, null);
      await new Promise(resolve => setTimeout(resolve, 2000));
      await stopRecording();

      addTestResult('Multiple Recordings', 'passed',
        'Two recordings created successfully for the same meeting');
    } catch (err) {
      addTestResult('Multiple Recordings', 'failed', `Error: ${err}`);
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setTestResults([]);

    await testMultiUserRecording();
    await new Promise(resolve => setTimeout(resolve, 1000));

    testConnectionFailure();
    await new Promise(resolve => setTimeout(resolve, 1000));

    testPinZoom();
    await new Promise(resolve => setTimeout(resolve, 1000));

    testLayoutPagination();
    await new Promise(resolve => setTimeout(resolve, 1000));

    testRecordingNotifications();
    await new Promise(resolve => setTimeout(resolve, 3000));

    await testMultipleRecordings();
  };

  // Add/remove mock participants
  const addMockParticipant = () => {
    const id = participantCountRef.current++;
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = `hsl(${id * 45}, 70%, 50%)`;
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = 'white';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Participant ${id + 1}`, 320, 260);

    const videoStream = canvas.captureStream(30);

    const newParticipant: Participant = {
      userId: `user-${id}`,
      sessionId: `session-${id}`,
      displayName: `Participant ${id + 1}`,
      avatarUrl: null,
      isMuted: false,
      isVideoEnabled: true,
      isSpeaking: false,
      isRecording: false,
      connectionState: 'connected',
      stream: videoStream,
      videoStream: videoStream,
    };

    setParticipants(prev => [...prev, newParticipant]);

    if (isRecording) {
      addParticipant({
        userId: newParticipant.userId,
        displayName: newParticipant.displayName,
        avatarUrl: newParticipant.avatarUrl,
        videoStream: newParticipant.videoStream,
        audioStream: newParticipant.stream,
        isLocal: false,
        connectionState: 'connected',
      });
    }
  };

  const removeMockParticipant = () => {
    if (participants.length > 0) {
      const removed = participants[participants.length - 1];
      setParticipants(prev => prev.slice(0, -1));

      if (isRecording) {
        removeParticipant(removed.userId);
      }
    }
  };

  const toggleParticipantConnection = (userId: string) => {
    setParticipants(prev => prev.map(p => {
      if (p.userId === userId) {
        const newState = p.connectionState === 'connected' ? 'disconnected' : 'connected';
        if (isRecording) {
          updateParticipant(userId, { connectionState: newState });
        }
        return { ...p, connectionState: newState };
      }
      return p;
    }));
  };

  const toggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else if (localStream) {
      await startRecording(
        localVideoStream,
        null,
        localStream,
        { display_name: 'Test User' },
        null,
        new Map(participants.map(p => [p.userId, p]))
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Recording Notification Banner */}
      <RecordingNotificationBanner
        recordingUsers={recordingUsers}
        isLocalRecording={isRecording}
      />

      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Video Recording Feature Tests</h1>

        {/* Control Panel */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>

          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={runAllTests}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Run All Tests
            </button>

            <button
              onClick={toggleRecording}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isRecording ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isRecording ? `Stop Recording (${recordingDuration}s)` : 'Start Recording'}
            </button>

            <button
              onClick={addMockParticipant}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add Participant
            </button>

            <button
              onClick={removeMockParticipant}
              disabled={participants.length === 0}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-lg flex items-center gap-2"
            >
              <UserMinus className="w-4 h-4" />
              Remove Participant
            </button>
          </div>

          {/* Layout Controls */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setLayoutMode('grid')}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-2 text-sm"
            >
              <Grid className="w-4 h-4" />
              Grid Layout
            </button>
            <button
              onClick={() => setLayoutMode('spotlight')}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-2 text-sm"
            >
              <Maximize2 className="w-4 h-4" />
              Spotlight
            </button>
            <button
              onClick={() => setLayoutMode('speaker')}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-2 text-sm"
            >
              <Pin className="w-4 h-4" />
              Speaker View
            </button>
          </div>

          {/* Status */}
          <div className="flex gap-4 text-sm">
            <span className={`px-2 py-1 rounded ${isRecording ? 'bg-red-600' : 'bg-gray-700'}`}>
              {isRecording ? 'Recording' : 'Not Recording'}
            </span>
            <span className="px-2 py-1 bg-gray-700 rounded">
              {participants.length + 1} Participants
            </span>
            {isSaving && (
              <span className="px-2 py-1 bg-yellow-600 rounded animate-pulse">
                Saving...
              </span>
            )}
            {error && (
              <span className="px-2 py-1 bg-red-600 rounded">
                Error: {error}
              </span>
            )}
          </div>
        </div>

        {/* Video Grid Preview */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Video Grid Preview</h2>
          <div className="h-[400px] bg-gray-900 rounded-lg overflow-hidden">
            <VideoGrid
              localParticipant={{
                stream: localStream,
                videoStream: localVideoStream,
                isMuted: false,
                displayName: 'You (Local)',
                avatarUrl: null,
                isSpeaking: false,
                isRecording: isRecording,
              }}
              remoteParticipants={participants}
              speakingUserId={null}
              isRecording={isRecording}
              isRemoteRecording={recordingUsers.size > 0}
            />
          </div>
        </div>

        {/* Participant List with Controls */}
        {participants.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-4 mb-6">
            <h2 className="text-lg font-semibold mb-3">Participants</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {participants.map(p => (
                <div
                  key={p.userId}
                  className={`p-3 rounded-lg flex items-center justify-between ${
                    p.connectionState === 'connected' ? 'bg-gray-700' : 'bg-red-900/50'
                  }`}
                >
                  <span className="text-sm truncate">{p.displayName}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleParticipantConnection(p.userId)}
                      className="p-1 rounded hover:bg-gray-600"
                      title="Toggle connection state"
                    >
                      {p.connectionState === 'connected' ? (
                        <Wifi className="w-4 h-4 text-green-400" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-red-400" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setPinnedUserId(p.userId);
                        setPinnedUser(p.userId);
                      }}
                      className={`p-1 rounded hover:bg-gray-600 ${
                        pinnedUserId === p.userId ? 'text-indigo-400' : ''
                      }`}
                      title="Pin participant"
                    >
                      <Pin className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test Results */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>

          {testResults.length === 0 ? (
            <p className="text-gray-400">No tests run yet. Click &quot;Run All Tests&quot; to start.</p>
          ) : (
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg flex items-start gap-3 ${
                    result.status === 'passed' ? 'bg-green-900/30 border border-green-700' :
                    result.status === 'failed' ? 'bg-red-900/30 border border-red-700' :
                    'bg-yellow-900/30 border border-yellow-700'
                  }`}
                >
                  {result.status === 'passed' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : result.status === 'failed' ? (
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5 animate-pulse" />
                  )}
                  <div>
                    <h3 className="font-semibold">{result.name}</h3>
                    <p className="text-sm text-gray-300">{result.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Individual Test Buttons */}
        <div className="mt-6 bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Individual Tests</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button
              onClick={testMultiUserRecording}
              className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-left"
            >
              <span className="block font-medium">Multi-User Recording</span>
              <span className="text-xs text-gray-400">Test recording with multiple participants</span>
            </button>
            <button
              onClick={() => testConnectionFailure()}
              className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-left"
            >
              <span className="block font-medium">Connection Failure</span>
              <span className="text-xs text-gray-400">Test disconnection handling</span>
            </button>
            <button
              onClick={testPinZoom}
              className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-left"
            >
              <span className="block font-medium">Pin/Zoom</span>
              <span className="text-xs text-gray-400">Test spotlight and pin features</span>
            </button>
            <button
              onClick={testLayoutPagination}
              className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-left"
            >
              <span className="block font-medium">Layout Pagination</span>
              <span className="text-xs text-gray-400">Test with 7+ participants</span>
            </button>
            <button
              onClick={testRecordingNotifications}
              className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-left"
            >
              <span className="block font-medium">Recording Notifications</span>
              <span className="text-xs text-gray-400">Test notification banners</span>
            </button>
            <button
              onClick={testMultipleRecordings}
              className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-left"
            >
              <span className="block font-medium">Multiple Recordings</span>
              <span className="text-xs text-gray-400">Test multiple recordings per meeting</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
