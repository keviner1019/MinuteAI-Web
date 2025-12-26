'use client';

import { useState, useMemo, useCallback } from 'react';
import { VideoTile } from './VideoTile';
import { Participant } from '@/types';
import { Pin, PinOff, Maximize2, Minimize2, Grid, Users, ChevronLeft, ChevronRight } from 'lucide-react';

interface LocalParticipant {
  stream: MediaStream | null;
  videoStream: MediaStream | null;
  isMuted: boolean;
  displayName: string;
  avatarUrl: string | null;
  isSpeaking?: boolean;
  isRecording?: boolean;
}

interface VideoGridProps {
  localParticipant: LocalParticipant;
  remoteParticipants: Participant[];
  speakingUserId?: string | null;
  isRecording?: boolean;
  isRemoteRecording?: boolean;
}

type LayoutMode = 'gallery' | 'spotlight' | 'sidebar';

// Maximum videos to show per page to prevent too small tiles
const MAX_VIDEOS_PER_PAGE = 6;

export function VideoGrid({
  localParticipant,
  remoteParticipants,
  speakingUserId,
  isRecording = false,
  isRemoteRecording = false,
}: VideoGridProps) {
  const [pinnedUserId, setPinnedUserId] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('gallery');
  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const totalParticipants = remoteParticipants.length + 1; // +1 for local

  // Build array of all participants (local first)
  const allParticipants = useMemo(() => {
    const local = {
      oderId: 'local',
      userId: 'local',
      sessionId: 'local',
      displayName: localParticipant.displayName,
      avatarUrl: localParticipant.avatarUrl,
      isMuted: localParticipant.isMuted,
      isVideoEnabled: !!localParticipant.videoStream,
      isSpeaking: localParticipant.isSpeaking || speakingUserId === 'local',
      isRecording: isRecording,
      connectionState: 'connected' as const,
      stream: localParticipant.stream,
      videoStream: localParticipant.videoStream,
      isLocal: true,
    };

    // Note: Use each participant's individual isRecording flag
    // isRemoteRecording is a fallback for legacy single-user mode
    const remotes = remoteParticipants.map((p) => ({
      ...p,
      isLocal: false,
      // Only use isRemoteRecording fallback if there's exactly 1 remote participant
      // and they don't have their own isRecording state set
      isRecording: p.isRecording || (remoteParticipants.length === 1 && isRemoteRecording),
    }));

    return [local, ...remotes];
  }, [localParticipant, remoteParticipants, speakingUserId, isRecording, isRemoteRecording]);

  // Get the pinned participant
  const pinnedParticipant = useMemo(() => {
    if (!pinnedUserId) return null;
    return allParticipants.find(
      (p) => (p.isLocal ? 'local' : p.userId) === pinnedUserId
    );
  }, [pinnedUserId, allParticipants]);

  // Get participants for current page (excluding pinned in spotlight mode)
  const paginatedParticipants = useMemo(() => {
    let participants = allParticipants;

    // In spotlight mode with pinned user, exclude pinned from the grid
    if (layoutMode === 'spotlight' && pinnedParticipant) {
      participants = participants.filter(
        (p) => (p.isLocal ? 'local' : p.userId) !== pinnedUserId
      );
    }

    // Paginate if more than MAX_VIDEOS_PER_PAGE
    if (participants.length > MAX_VIDEOS_PER_PAGE) {
      const start = currentPage * MAX_VIDEOS_PER_PAGE;
      return participants.slice(start, start + MAX_VIDEOS_PER_PAGE);
    }

    return participants;
  }, [allParticipants, layoutMode, pinnedParticipant, pinnedUserId, currentPage]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    const participantsToShow =
      layoutMode === 'spotlight' && pinnedParticipant
        ? allParticipants.length - 1
        : allParticipants.length;
    return Math.ceil(participantsToShow / MAX_VIDEOS_PER_PAGE);
  }, [allParticipants.length, layoutMode, pinnedParticipant]);

  // Handle pin/unpin
  const handleTogglePin = useCallback((userId: string) => {
    setPinnedUserId((prev) => {
      if (prev === userId) {
        // Unpinning - go back to gallery
        setLayoutMode('gallery');
        return null;
      }
      // Pinning - switch to spotlight
      setLayoutMode('spotlight');
      return userId;
    });
  }, []);

  // Handle fullscreen toggle for a specific tile
  const handleToggleFullscreen = useCallback((userId: string) => {
    if (isFullscreen && pinnedUserId === userId) {
      setIsFullscreen(false);
      setLayoutMode('gallery');
      setPinnedUserId(null);
    } else {
      setPinnedUserId(userId);
      setLayoutMode('spotlight');
      setIsFullscreen(true);
    }
  }, [isFullscreen, pinnedUserId]);

  // Cycle layout modes
  const handleCycleLayout = useCallback(() => {
    setLayoutMode((prev) => {
      if (prev === 'gallery') return 'sidebar';
      if (prev === 'sidebar') return 'spotlight';
      return 'gallery';
    });
    // Reset pagination when changing layout
    setCurrentPage(0);
  }, []);

  // Render controls overlay
  const renderLayoutControls = () => (
    <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
      {/* Layout toggle button */}
      <button
        onClick={handleCycleLayout}
        className="p-2 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors backdrop-blur-sm"
        title={`Layout: ${layoutMode}`}
      >
        {layoutMode === 'gallery' ? (
          <Grid className="w-4 h-4" />
        ) : layoutMode === 'sidebar' ? (
          <Users className="w-4 h-4" />
        ) : (
          <Maximize2 className="w-4 h-4" />
        )}
      </button>

      {/* Participant count */}
      <div className="px-2 py-1 rounded-lg bg-black/50 text-white text-xs backdrop-blur-sm">
        {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}
      </div>
    </div>
  );

  // Render pagination controls
  const renderPaginationControls = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-2">
        <button
          onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
          disabled={currentPage === 0}
          className="p-2 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-3 py-1 rounded-lg bg-black/50 text-white text-xs backdrop-blur-sm">
          {currentPage + 1} / {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={currentPage === totalPages - 1}
          className="p-2 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  };

  // Render a video tile with overlay controls
  const renderVideoTile = (
    participant: (typeof allParticipants)[0],
    className: string = '',
    showControls: boolean = true
  ) => {
    // Use sessionId for key uniqueness - sessionId is unique per Twilio connection
    // This prevents duplicate key issues when the same user reconnects
    const participantId = participant.isLocal ? 'local' : participant.userId;
    const uniqueKey = participant.isLocal ? 'local' : `${participant.userId}-${participant.sessionId}`;
    const isPinned = pinnedUserId === participantId;

    return (
      <div key={uniqueKey} className={`relative group ${className}`}>
        <VideoTile
          stream={participant.videoStream || participant.stream}
          isMuted={participant.isMuted}
          isLocal={participant.isLocal}
          userName={participant.isLocal ? 'You' : participant.displayName || 'Participant'}
          userAvatar={participant.avatarUrl}
          isSpeaking={
            participant.isLocal
              ? localParticipant.isSpeaking || speakingUserId === 'local'
              : speakingUserId === participant.userId
          }
          isRecording={participant.isRecording}
          connectionState={participant.connectionState}
        />

        {/* Tile controls overlay */}
        {showControls && (
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Pin button */}
            <button
              onClick={() => handleTogglePin(participantId)}
              className={`p-1.5 rounded-lg transition-colors backdrop-blur-sm ${
                isPinned
                  ? 'bg-indigo-500 text-white'
                  : 'bg-black/50 hover:bg-black/70 text-white'
              }`}
              title={isPinned ? 'Unpin' : 'Pin'}
            >
              {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            </button>

            {/* Fullscreen button */}
            <button
              onClick={() => handleToggleFullscreen(participantId)}
              className="p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors backdrop-blur-sm"
              title={isFullscreen && isPinned ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen && isPinned ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  // Fullscreen mode - single participant takes the whole screen
  if (isFullscreen && pinnedParticipant) {
    return (
      <div className="relative h-full w-full overflow-hidden">
        {renderLayoutControls()}
        <div className="h-full w-full p-2 overflow-hidden">
          {renderVideoTile(pinnedParticipant, 'h-full w-full max-h-full max-w-full', true)}
        </div>
      </div>
    );
  }

  // Spotlight mode - one large, others in sidebar
  if (layoutMode === 'spotlight' && pinnedParticipant) {
    const otherParticipants = paginatedParticipants;

    return (
      <div className="relative h-full w-full overflow-hidden">
        {renderLayoutControls()}
        {renderPaginationControls()}

        <div className="h-full w-full p-2 flex gap-2 overflow-hidden">
          {/* Main spotlight */}
          <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
            {renderVideoTile(pinnedParticipant, 'h-full w-full max-h-full max-w-full', true)}
          </div>

          {/* Sidebar with other participants */}
          {otherParticipants.length > 0 && (
            <div className="w-48 flex flex-col gap-2 overflow-y-auto flex-shrink-0">
              {otherParticipants.map((participant) =>
                renderVideoTile(participant, 'h-32 w-full flex-shrink-0', true)
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Sidebar mode - active speaker large, others in vertical sidebar
  if (layoutMode === 'sidebar') {
    // Find the active speaker or use the first participant
    const activeSpeaker =
      allParticipants.find((p) => {
        const id = p.isLocal ? 'local' : p.userId;
        return speakingUserId === id;
      }) || allParticipants[0];

    const otherParticipants = paginatedParticipants.filter((p) => {
      const id = p.isLocal ? 'local' : p.userId;
      const activeId = activeSpeaker.isLocal ? 'local' : activeSpeaker.userId;
      return id !== activeId;
    });

    return (
      <div className="relative h-full w-full overflow-hidden">
        {renderLayoutControls()}
        {renderPaginationControls()}

        <div className="h-full w-full p-2 flex gap-2 overflow-hidden">
          {/* Main speaker */}
          <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
            {renderVideoTile(activeSpeaker, 'h-full w-full max-h-full max-w-full', true)}
          </div>

          {/* Sidebar */}
          {otherParticipants.length > 0 && (
            <div className="w-48 flex flex-col gap-2 overflow-y-auto flex-shrink-0">
              {otherParticipants.map((participant) =>
                renderVideoTile(participant, 'h-32 w-full flex-shrink-0', true)
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Gallery mode - grid layout with optimal sizing
  // For 1 participant - full screen
  if (totalParticipants === 1) {
    return (
      <div className="relative h-full w-full overflow-hidden">
        {renderLayoutControls()}
        <div className="h-full w-full p-2 overflow-hidden">
          {renderVideoTile(allParticipants[0], 'h-full w-full max-h-full max-w-full', true)}
        </div>
      </div>
    );
  }

  // For 2 participants - side by side
  if (totalParticipants === 2) {
    return (
      <div className="relative h-full w-full overflow-hidden">
        {renderLayoutControls()}
        <div className="h-full w-full p-2 grid grid-cols-2 gap-3 overflow-hidden">
          {allParticipants.map((participant) =>
            renderVideoTile(participant, 'w-full h-full overflow-hidden', true)
          )}
        </div>
      </div>
    );
  }

  // For 3 participants - 2 top, 1 centered bottom
  if (totalParticipants === 3) {
    return (
      <div className="relative h-full w-full overflow-hidden">
        {renderLayoutControls()}
        <div className="h-full w-full p-2 flex flex-col gap-3 overflow-hidden">
          <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
            {renderVideoTile(allParticipants[0], 'flex-1 overflow-hidden', true)}
            {renderVideoTile(allParticipants[1], 'flex-1 overflow-hidden', true)}
          </div>
          <div className="flex-1 flex justify-center min-h-0 overflow-hidden">
            {renderVideoTile(allParticipants[2], 'w-1/2 overflow-hidden', true)}
          </div>
        </div>
      </div>
    );
  }

  // For 4 participants - 2x2 grid
  if (totalParticipants === 4) {
    return (
      <div className="relative h-full w-full overflow-hidden">
        {renderLayoutControls()}
        <div className="h-full w-full p-2 grid grid-cols-2 grid-rows-2 gap-3 overflow-hidden">
          {allParticipants.map((participant) =>
            renderVideoTile(participant, 'w-full h-full overflow-hidden', true)
          )}
        </div>
      </div>
    );
  }

  // For 5-6 participants - 3x2 grid
  if (totalParticipants <= 6) {
    const topRow = paginatedParticipants.slice(0, 3);
    const bottomRow = paginatedParticipants.slice(3);

    return (
      <div className="relative h-full w-full overflow-hidden">
        {renderLayoutControls()}
        {renderPaginationControls()}
        <div className="h-full w-full p-2 flex flex-col gap-3 overflow-hidden">
          {/* Top row - 3 participants */}
          <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
            {topRow.map((participant) =>
              renderVideoTile(participant, 'flex-1 overflow-hidden', true)
            )}
          </div>
          {/* Bottom row - centered */}
          <div className="flex-1 flex gap-3 justify-center min-h-0 overflow-hidden">
            {bottomRow.map((participant) =>
              renderVideoTile(participant, 'flex-1 max-w-[calc(33.333%-0.5rem)] overflow-hidden', true)
            )}
          </div>
        </div>
      </div>
    );
  }

  // For 7+ participants - paginated grid with max 6 per page
  const cols = Math.min(3, Math.ceil(Math.sqrt(paginatedParticipants.length)));
  const rows = Math.ceil(paginatedParticipants.length / cols);

  // Create rows array
  const rowsArray: (typeof paginatedParticipants)[] = [];
  for (let i = 0; i < paginatedParticipants.length; i += cols) {
    rowsArray.push(paginatedParticipants.slice(i, i + cols));
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {renderLayoutControls()}
      {renderPaginationControls()}
      <div className="h-full w-full p-2 flex flex-col gap-3 overflow-hidden">
        {rowsArray.map((row, rowIdx) => {
          const isLastRow = rowIdx === rowsArray.length - 1;
          const shouldCenter = isLastRow && row.length < cols;

          return (
            <div
              key={rowIdx}
              className={`flex-1 flex gap-3 min-h-0 overflow-hidden ${shouldCenter ? 'justify-center' : ''}`}
            >
              {row.map((participant) =>
                renderVideoTile(
                  participant,
                  `flex-1 overflow-hidden ${shouldCenter ? `max-w-[calc(${100 / cols}%-0.5rem)]` : ''}`,
                  true
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
