import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  headerColor?: string;
  onTitleClick?: () => void;
}

/** A labeled panel, not a soft floating card — flat surface, hard border, header reads like an instrument-panel label. */
export const Card: React.FC<CardProps> = ({
  title,
  children,
  className,
  actions,
  headerColor = 'text-foreground',
  onTitleClick
}) => (
  <div className={cn('flex flex-col rounded border border-border bg-card', className)}>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
      {onTitleClick ? (
        <h3
          className={cn(
            'cursor-pointer text-xs font-semibold uppercase tracking-wider transition-colors hover:text-primary',
            headerColor
          )}
          onClick={onTitleClick}
        >
          {title}
        </h3>
      ) : (
        <h3 className={cn('text-xs font-semibold uppercase tracking-wider', headerColor)}>{title}</h3>
      )}
      {actions && <div>{actions}</div>}
    </div>
    <div className="flex flex-1 flex-col overflow-hidden p-4 sm:p-5">{children}</div>
  </div>
);
