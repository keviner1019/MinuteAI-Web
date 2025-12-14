'use client';

import { VideoTile } from './VideoTile';
import { Participant } from '@/types';

interface LocalParticipant {
  stream: MediaStream | null;
  videoStream: MediaStream | null;
  isMuted: boolean;
  displayName: string;
  avatarUrl: string | null;
  isSpeaking?: boolean;
}

interface VideoGridProps {
  localParticipant: LocalParticipant;
  remoteParticipants: Participant[];
  speakingUserId?: string | null;
}

export function VideoGrid({
  localParticipant,
  remoteParticipants,
  speakingUserId,
}: VideoGridProps) {
  const totalParticipants = remoteParticipants.length + 1; // +1 for local

  // Determine grid layout based on participant count
  const getGridClass = () => {
    switch (totalParticipants) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-1 md:grid-cols-2';
      case 3:
      case 4:
        return 'grid-cols-2';
      case 5:
      case 6:
        return 'grid-cols-2 md:grid-cols-3';
      default:
        return 'grid-cols-3';
    }
  };

  // Get height class based on rows needed
  const getHeightClass = () => {
    if (totalParticipants <= 2) return 'h-full';
    if (totalParticipants <= 4) return 'h-1/2';
    if (totalParticipants <= 6) return 'h-1/2';
    return 'h-1/3';
  };

  return (
    <div className={`grid ${getGridClass()} gap-2 h-full w-full p-2`}>
      {/* Local Video Tile */}
      <div className={`relative ${getHeightClass()}`}>
        <VideoTile
          stream={localParticipant.videoStream || localParticipant.stream}
          isMuted={localParticipant.isMuted}
          isLocal={true}
          userName={localParticipant.displayName}
          userAvatar={localParticipant.avatarUrl}
          isSpeaking={localParticipant.isSpeaking || speakingUserId === 'local'}
        />
      </div>

      {/* Remote Video Tiles */}
      {remoteParticipants.map((participant) => (
        <div key={participant.userId} className={`relative ${getHeightClass()}`}>
          <VideoTile
            stream={participant.videoStream || participant.stream}
            isMuted={participant.isMuted}
            isLocal={false}
            userName={participant.displayName || 'Participant'}
            userAvatar={participant.avatarUrl}
            isSpeaking={speakingUserId === participant.userId}
          />
        </div>
      ))}
    </div>
  );
}
