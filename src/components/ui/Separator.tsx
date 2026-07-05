import React from 'react';
import { cn } from '../../lib/utils';

export const Separator: React.FC<{ className?: string; orientation?: 'horizontal' | 'vertical' }> = ({
  className,
  orientation = 'horizontal'
}) => (
  <div
    className={cn(
      orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
      'bg-border',
      className
    )}
  />
);
