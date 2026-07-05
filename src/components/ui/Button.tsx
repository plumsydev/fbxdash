import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-border bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground',
        primary: 'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
        danger: 'border-border bg-secondary text-secondary-foreground hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive',
        ghost: 'border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      },
      size: {
        sm: 'px-2.5 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm'
    }
  }
);

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  children?: React.ReactNode;
  icon?: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  icon: Icon,
  onClick,
  variant,
  size,
  disabled = false,
  className,
  type = 'button'
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={cn(buttonVariants({ variant, size }), className)}
  >
    {Icon && <Icon size={size === 'md' ? 16 : 12} />}
    {children}
  </button>
);

interface ActionButtonProps {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  className?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({ label, icon: Icon, onClick, className }) => (
  <button
    onClick={onClick}
    className={cn(buttonVariants({ variant: 'default', size: 'sm' }), className)}
  >
    <Icon size={12} />
    {label}
  </button>
);
