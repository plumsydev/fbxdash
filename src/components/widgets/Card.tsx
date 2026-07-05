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

export const Card: React.FC<CardProps> = ({
  title,
  children,
  className,
  actions,
  headerColor = 'text-foreground',
  onTitleClick
}) => (
  <div className={cn('flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5', className)}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      {onTitleClick ? (
        <h3
          className={cn('cursor-pointer text-base font-semibold transition-colors hover:text-primary sm:text-lg', headerColor)}
          onClick={onTitleClick}
        >
          {title}
        </h3>
      ) : (
        <h3 className={cn('text-base font-semibold sm:text-lg', headerColor)}>{title}</h3>
      )}
      {actions && <div>{actions}</div>}
    </div>
    <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
  </div>
);
