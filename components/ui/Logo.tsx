'use client';

import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  href?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: { icon: 28, text: 'text-lg' },
  md: { icon: 36, text: 'text-xl' },
  lg: { icon: 48, text: 'text-2xl' },
};

export default function Logo({
  href = '/dashboard',
  showText = true,
  size = 'md',
  className = ''
}: LogoProps) {
  const { icon, text } = sizes[size];

  const content = (
    <div className={`flex items-center space-x-2.5 ${className}`}>
      <Image
        src="/logo-icon.svg"
        alt="MinuteAI"
        width={icon}
        height={icon}
        className="rounded-lg"
        priority
      />
      {showText && (
        <span className={`${text} font-bold`}>
          <span className="text-gray-900">Minute</span>
          <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">AI</span>
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}
