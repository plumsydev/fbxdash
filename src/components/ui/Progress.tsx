import React from 'react';
import { cn } from '../../lib/utils';

interface ProgressProps {
  value: number;
  className?: string;
  indicatorClassName?: string;
}

export const Progress: React.FC<ProgressProps> = ({ value, className, indicatorClassName }) => (
  <div className={cn('h-2 w-full overflow-hidden rounded-sm border border-border bg-muted', className)}>
    <div
      className={cn('h-full bg-primary transition-all duration-300', indicatorClassName)}
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);
