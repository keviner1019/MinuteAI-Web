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

  // Build array of all participants (local first)
  const allParticipants = [
    { ...localParticipant, isLocal: true, oderId: 'local' },
    ...remoteParticipants.map((p) => ({ ...p, isLocal: false })),
  ];

  // Determine optimal grid dimensions based on participant count
  const getGridLayout = () => {
    switch (totalParticipants) {
      case 1:
        return { cols: 1, rows: 1 };
      case 2:
        return { cols: 2, rows: 1 };
      case 3:
        return { cols: 3, rows: 1 }; // 3 in a row
      case 4:
        return { cols: 2, rows: 2 }; // 2x2 grid
      case 5:
        return { cols: 3, rows: 2 }; // 3 top, 2 bottom centered
      case 6:
        return { cols: 3, rows: 2 }; // 3x2 grid
      case 7:
        return { cols: 4, rows: 2 }; // 4 top, 3 bottom centered
      case 8:
        return { cols: 4, rows: 2 }; // 4x2 grid
      case 9:
        return { cols: 3, rows: 3 }; // 3x3 grid
      default:
        // For more participants, calculate optimal grid
        const cols = Math.ceil(Math.sqrt(totalParticipants));
        const rows = Math.ceil(totalParticipants / cols);
        return { cols, rows };
    }
  };

  const { cols, rows } = getGridLayout();
  const lastRowCount = totalParticipants % cols || cols;
  const isLastRowIncomplete = lastRowCount < cols && totalParticipants > cols;
  const fullRowsCount = Math.floor(totalParticipants / cols);

  // For 1 participant - full screen
  if (totalParticipants === 1) {
    return (
      <div className="h-full w-full p-2">
        <div className="h-full w-full">
          <VideoTile
            stream={localParticipant.videoStream || localParticipant.stream}
            isMuted={localParticipant.isMuted}
            isLocal={true}
            userName={localParticipant.displayName}
            userAvatar={localParticipant.avatarUrl}
            isSpeaking={localParticipant.isSpeaking || speakingUserId === 'local'}
          />
        </div>
      </div>
    );
  }

  // For 2 participants - side by side
  if (totalParticipants === 2) {
    return (
      <div className="h-full w-full p-2 grid grid-cols-2 gap-4">
        <div className="w-full h-full min-h-0">
          <VideoTile
            stream={localParticipant.videoStream || localParticipant.stream}
            isMuted={localParticipant.isMuted}
            isLocal={true}
            userName={localParticipant.displayName}
            userAvatar={localParticipant.avatarUrl}
            isSpeaking={localParticipant.isSpeaking || speakingUserId === 'local'}
          />
        </div>
        {remoteParticipants[0] && (
          <div className="w-full h-full min-h-0">
            <VideoTile
              stream={remoteParticipants[0].videoStream || remoteParticipants[0].stream}
              isMuted={remoteParticipants[0].isMuted}
              isLocal={false}
              userName={remoteParticipants[0].displayName || 'Participant'}
              userAvatar={remoteParticipants[0].avatarUrl}
              isSpeaking={speakingUserId === remoteParticipants[0].userId}
            />
          </div>
        )}
      </div>
    );
  }

  // For 3 participants - all in one row, equal width
  if (totalParticipants === 3) {
    return (
      <div className="h-full w-full p-2 flex gap-2">
        <div className="flex-1 h-full">
          <VideoTile
            stream={localParticipant.videoStream || localParticipant.stream}
            isMuted={localParticipant.isMuted}
            isLocal={true}
            userName={localParticipant.displayName}
            userAvatar={localParticipant.avatarUrl}
            isSpeaking={localParticipant.isSpeaking || speakingUserId === 'local'}
          />
        </div>
        {remoteParticipants.map((participant) => (
          <div key={participant.userId} className="flex-1 h-full">
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

  // For 4 participants - 2x2 grid
  if (totalParticipants === 4) {
    return (
      <div className="h-full w-full p-2 flex flex-col gap-2">
        <div className="flex-1 flex gap-2">
          <div className="flex-1">
            <VideoTile
              stream={localParticipant.videoStream || localParticipant.stream}
              isMuted={localParticipant.isMuted}
              isLocal={true}
              userName={localParticipant.displayName}
              userAvatar={localParticipant.avatarUrl}
              isSpeaking={localParticipant.isSpeaking || speakingUserId === 'local'}
            />
          </div>
          {remoteParticipants[0] && (
            <div className="flex-1">
              <VideoTile
                stream={remoteParticipants[0].videoStream || remoteParticipants[0].stream}
                isMuted={remoteParticipants[0].isMuted}
                isLocal={false}
                userName={remoteParticipants[0].displayName || 'Participant'}
                userAvatar={remoteParticipants[0].avatarUrl}
                isSpeaking={speakingUserId === remoteParticipants[0].userId}
              />
            </div>
          )}
        </div>
        <div className="flex-1 flex gap-2">
          {remoteParticipants.slice(1, 3).map((participant) => (
            <div key={participant.userId} className="flex-1">
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
      </div>
    );
  }

  // For 5-6 participants - 3 columns, 2 rows with centering for incomplete rows
  if (totalParticipants >= 5 && totalParticipants <= 6) {
    const firstRowParticipants = allParticipants.slice(0, 3);
    const secondRowParticipants = allParticipants.slice(3);

    return (
      <div className="h-full w-full p-2 flex flex-col gap-2">
        {/* First row - 3 participants */}
        <div className="flex-1 flex gap-2">
          {firstRowParticipants.map((participant, idx) => (
            <div key={participant.isLocal ? 'local' : (participant as Participant).userId || idx} className="flex-1">
              <VideoTile
                stream={participant.videoStream || participant.stream}
                isMuted={participant.isMuted}
                isLocal={participant.isLocal}
                userName={participant.isLocal ? localParticipant.displayName : (participant as Participant).displayName || 'Participant'}
                userAvatar={participant.isLocal ? localParticipant.avatarUrl : (participant as Participant).avatarUrl}
                isSpeaking={participant.isLocal ? (localParticipant.isSpeaking || speakingUserId === 'local') : speakingUserId === (participant as Participant).userId}
              />
            </div>
          ))}
        </div>
        {/* Second row - centered if not full */}
        <div className="flex-1 flex gap-2 justify-center">
          {secondRowParticipants.map((participant, idx) => (
            <div
              key={participant.isLocal ? 'local' : (participant as Participant).userId || idx}
              className="flex-1 max-w-[calc(33.333%-0.333rem)]"
            >
              <VideoTile
                stream={participant.videoStream || participant.stream}
                isMuted={participant.isMuted}
                isLocal={participant.isLocal}
                userName={participant.isLocal ? localParticipant.displayName : (participant as Participant).displayName || 'Participant'}
                userAvatar={participant.isLocal ? localParticipant.avatarUrl : (participant as Participant).avatarUrl}
                isSpeaking={participant.isLocal ? (localParticipant.isSpeaking || speakingUserId === 'local') : speakingUserId === (participant as Participant).userId}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // For 7+ participants - dynamic grid with centered last row
  const rowsArray: typeof allParticipants[] = [];
  for (let i = 0; i < allParticipants.length; i += cols) {
    rowsArray.push(allParticipants.slice(i, i + cols));
  }

  return (
    <div className="h-full w-full p-2 flex flex-col gap-2">
      {rowsArray.map((row, rowIdx) => {
        const isLastRow = rowIdx === rowsArray.length - 1;
        const shouldCenter = isLastRow && row.length < cols;

        return (
          <div
            key={rowIdx}
            className={`flex-1 flex gap-2 ${shouldCenter ? 'justify-center' : ''}`}
          >
            {row.map((participant, idx) => (
              <div
                key={participant.isLocal ? 'local' : (participant as Participant).userId || idx}
                className={`flex-1 ${shouldCenter ? `max-w-[calc(${100 / cols}%-${(cols - 1) * 0.5 / cols}rem)]` : ''}`}
                style={shouldCenter ? { maxWidth: `calc(${100 / cols}% - ${(cols - 1) * 0.5 / cols}rem)` } : undefined}
              >
                <VideoTile
                  stream={participant.videoStream || participant.stream}
                  isMuted={participant.isMuted}
                  isLocal={participant.isLocal}
                  userName={participant.isLocal ? localParticipant.displayName : (participant as Participant).displayName || 'Participant'}
                  userAvatar={participant.isLocal ? localParticipant.avatarUrl : (participant as Participant).avatarUrl}
                  isSpeaking={participant.isLocal ? (localParticipant.isSpeaking || speakingUserId === 'local') : speakingUserId === (participant as Participant).userId}
                />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
