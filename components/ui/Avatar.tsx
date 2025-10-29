'use client';

import { User } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isSpeaking?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32',
};

const iconSizes = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export function Avatar({
  src,
  alt = 'User',
  size = 'md',
  isSpeaking = false,
  className = '',
}: AvatarProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Speaking Animation Rings */}
      {isSpeaking && (
        <>
          <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping opacity-75" />
          <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-pulse" />
        </>
      )}

      {/* Avatar */}
      <div
        className={`${
          sizeClasses[size]
        } rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center transition-all duration-300 ${
          isSpeaking
            ? 'ring-4 ring-green-400 ring-offset-2 ring-offset-white scale-105'
            : 'ring-2 ring-gray-200'
        }`}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className="w-full h-full object-cover" />
        ) : (
          <User className={`${iconSizes[size]} text-blue-600`} />
        )}
      </div>
    </div>
  );
}
