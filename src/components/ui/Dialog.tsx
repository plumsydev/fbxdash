import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DialogProps {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
}

/** Shadcn-style dialog shell: centered card over a blurred overlay. */
export const Dialog: React.FC<DialogProps> = ({ open, onClose, children, className }) => {
  useEffect(() => {
    if (!open || !onClose) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={cn(
          'w-full max-w-md overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl animate-in fade-in slide-in-from-bottom',
          className
        )}
      >
        {children}
      </div>
    </div>
  );
};

export const DialogHeader: React.FC<{
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}> = ({ title, description, icon, onClose, className }) => (
  <div className={cn('flex items-start justify-between gap-3 border-b border-border p-5', className)}>
    <div className="flex items-start gap-3">
      {icon && (
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-border bg-secondary">
          {icon}
        </div>
      )}
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
    {onClose && (
      <button
        onClick={onClose}
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X size={18} />
      </button>
    )}
  </div>
);

export const DialogContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className
}) => <div className={cn('max-h-[75vh] space-y-4 overflow-y-auto p-5', className)}>{children}</div>;

export const DialogFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className
}) => <div className={cn('flex items-center justify-end gap-2 border-t border-border p-4', className)}>{children}</div>;
