'use client';

interface ParticipantCountProps {
  count: number;
}

export function ParticipantCount({ count }: ParticipantCountProps) {
  return (
    <div className="absolute top-20 left-4 z-40">
      <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md border border-gray-200">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-sm font-medium text-gray-700">
          {count} participant{count !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
