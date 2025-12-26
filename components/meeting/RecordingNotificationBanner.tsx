'use client';

import { useEffect, useState } from 'react';

interface RecordingUser {
  userId: string;
  userName: string;
  isRecording: boolean;
  startedAt: number | null;
}

interface RecordingNotificationBannerProps {
  recordingUsers: Map<string, RecordingUser>;
  isLocalRecording?: boolean;
}

export function RecordingNotificationBanner({
  recordingUsers,
  isLocalRecording = false,
}: RecordingNotificationBannerProps) {
  const [showPersistentBanner, setShowPersistentBanner] = useState(false);

  const recordingCount = recordingUsers.size + (isLocalRecording ? 1 : 0);
  const recordingUserNames = Array.from(recordingUsers.values())
    .map((u) => u.userName)
    .filter(Boolean);

  // Add "You" if local is recording
  if (isLocalRecording) {
    recordingUserNames.unshift('You');
  }

  // Show persistent banner if anyone is recording
  useEffect(() => {
    setShowPersistentBanner(recordingCount > 0);
  }, [recordingCount]);

  // Format recording users for display
  const formatRecordingUsers = () => {
    if (recordingUserNames.length === 0) return '';
    if (recordingUserNames.length === 1) return recordingUserNames[0];
    if (recordingUserNames.length === 2) return recordingUserNames.join(' and ');
    return `${recordingUserNames.slice(0, -1).join(', ')}, and ${recordingUserNames[recordingUserNames.length - 1]}`;
  };

  return (
    <>
      {/* Persistent recording badge */}
      {showPersistentBanner && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40">
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-red-600/90 text-white shadow-lg backdrop-blur-md">
            <div className="relative">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <div className="absolute inset-0 w-3 h-3 bg-white rounded-full animate-ping" />
            </div>
            <span className="text-sm font-medium">
              {recordingCount === 1 ? (
                <>{formatRecordingUsers()} is recording</>
              ) : (
                <>{formatRecordingUsers()} are recording</>
              )}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
