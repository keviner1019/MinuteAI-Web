'use client';

import { useState, useEffect } from 'react';

interface RecordingCountdownProps {
  onComplete: () => void;
}

export function RecordingCountdown({ onComplete }: RecordingCountdownProps) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count === 0) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setCount(count - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, onComplete]);

  if (count === 0) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-none">
      <div className="flex flex-col items-center gap-6 text-center animate-in fade-in duration-200">
        <div className="relative">
          <div className="absolute inset-0 rounded-full border-4 border-red-400/60 animate-ping" />
          <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-red-500 via-red-600 to-red-700 shadow-2xl">
            <span className="text-[5rem] font-black text-white drop-shadow-lg">{count}</span>
          </div>
          <div className="absolute -inset-3 rounded-full border border-white/30 opacity-70" />
        </div>
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-red-200">Recording</p>
          <p className="text-2xl font-semibold text-white">Starting in {count}...</p>
          <p className="text-sm text-white/70">Stay still — we capture video and audio together.</p>
        </div>
      </div>
    </div>
  );
}
