import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'completed' | 'processing' | 'failed' | 'scheduled' | 'default';
  className?: string;
}

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variants = {
    completed: 'badge-completed',
    processing: 'badge-processing',
    failed: 'badge-failed',
    scheduled: 'badge-scheduled',
    default:
      'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700',
  };

  return <span className={`${variants[variant]} ${className}`}>{children}</span>;
}
