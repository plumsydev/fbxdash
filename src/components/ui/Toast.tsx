import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, X, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'loading';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  progress?: number;
}

interface ToastProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeProgress, setTimeProgress] = useState(100);
  const duration = toast.duration || 3000;

  useEffect(() => {
    const animTimer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(animTimer);
  }, []);

  useEffect(() => {
    if (toast.type !== 'loading' && toast.duration !== 0) {
      const timer = setTimeout(() => {
        onClose(toast.id);
      }, duration);

      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setTimeProgress(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 50);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [toast.id, toast.type, toast.duration, duration, onClose]);

  const icons = {
    success: <CheckCircle size={18} className="text-success" />,
    error: <XCircle size={18} className="text-destructive" />,
    warning: <AlertCircle size={18} className="text-warning" />,
    loading: <Loader2 size={18} className="animate-spin text-primary" />
  };

  const borders = {
    success: 'border-success/30 bg-success/10',
    error: 'border-destructive/30 bg-destructive/10',
    warning: 'border-warning/30 bg-warning/10',
    loading: 'border-primary/30 bg-primary/10'
  };

  const progressColors = {
    success: 'bg-success',
    error: 'bg-destructive',
    warning: 'bg-warning',
    loading: 'bg-primary'
  };

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded border shadow-hard-sm transition-all duration-300',
        borders[toast.type]
      )}
      style={{
        transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
        opacity: isVisible ? 1 : 0
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {icons[toast.type]}
        <span className="flex-1 text-sm text-foreground">{toast.message}</span>
        {toast.type !== 'loading' && (
          <button
            onClick={() => onClose(toast.id)}
            className="rounded p-1 transition-colors hover:bg-foreground/10"
          >
            <X size={14} className="text-muted-foreground" />
          </button>
        )}
      </div>
      {toast.type === 'loading' && toast.progress !== undefined ? (
        <div className="h-1 w-full bg-muted">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${toast.progress}%` }} />
        </div>
      ) : (
        toast.type !== 'loading' && (
          <div className="h-0.5 w-full bg-muted/50">
            <div
              className={cn('h-full transition-none', progressColors[toast.type])}
              style={{ width: `${timeProgress}%` }}
            />
          </div>
        )
      )}
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastData[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[100] flex max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};
