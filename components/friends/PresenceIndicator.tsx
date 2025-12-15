'use client';

import { PresenceStatus } from '@/types';

interface PresenceIndicatorProps {
  status: PresenceStatus;
  lastSeenAt?: string | null;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusColors: Record<PresenceStatus, string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-orange-500',
  offline: 'bg-red-500',
};

const statusText: Record<PresenceStatus, string> = {
  online: 'Online',
  away: 'Away',
  busy: 'Busy',
  offline: 'Offline',
};

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function PresenceIndicator({
  status,
  lastSeenAt,
  showText = false,
  size = 'md',
}: PresenceIndicatorProps) {
  const isOnline = status === 'online';

  return (
    <div className="flex items-center gap-1.5">
      <span className="relative">
        <span
          className={`block ${sizeClasses[size]} ${statusColors[status]} rounded-full`}
        />
        {/* Wave effect for online status */}
        {isOnline && (
          <>
            <span
              className={`absolute inset-0 ${sizeClasses[size]} bg-green-500 rounded-full animate-ping opacity-75`}
            />
            <span
              className={`absolute inset-0 ${sizeClasses[size]} bg-green-400 rounded-full animate-pulse`}
            />
          </>
        )}
      </span>
      {showText && (
        <span className="text-xs text-gray-500">
          {status === 'offline' && lastSeenAt
            ? `Last seen ${getRelativeTime(lastSeenAt)}`
            : statusText[status]}
        </span>
      )}
    </div>
  );
}
