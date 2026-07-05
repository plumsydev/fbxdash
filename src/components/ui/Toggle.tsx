import React from 'react';
import { cn } from '../../lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled = false, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'w-8 h-4' : 'w-10 h-5';
  const dotSizeClasses = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const translateClass = size === 'sm' ? 'translate-x-4' : 'translate-x-5';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex items-center rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        checked ? 'bg-primary' : 'bg-muted',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        sizeClasses
      )}
    >
      <span
        className={cn(
          'rounded-full bg-background shadow-sm transition-transform',
          dotSizeClasses,
          checked ? translateClass : 'translate-x-0'
        )}
      />
    </button>
  );
};
