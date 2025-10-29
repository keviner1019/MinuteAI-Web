import { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'large';
  hoverable?: boolean;
}

export default function Card({
  children,
  variant = 'default',
  hoverable = true,
  className = '',
  ...props
}: CardProps) {
  const baseStyles = variant === 'large' ? 'card-lg' : 'card';
  const hoverStyles = hoverable ? '' : 'hover:shadow-none hover:translate-y-0';

  return (
    <div className={`${baseStyles} ${hoverStyles} ${className}`} {...props}>
      {children}
    </div>
  );
}
