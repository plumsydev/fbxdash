import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-full font-medium', {
  variants: {
    variant: {
      default: 'bg-secondary text-muted-foreground',
      success: 'bg-success/10 text-success',
      warning: 'bg-warning/10 text-warning',
      error: 'bg-destructive/10 text-destructive',
      info: 'bg-primary/10 text-primary'
    },
    size: {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm'
    }
  },
  defaultVariants: {
    variant: 'default',
    size: 'sm'
  }
});

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant, size, className }) => (
  <span className={cn(badgeVariants({ variant, size }), className)}>{children}</span>
);

interface StatusBadgeProps {
  icon: React.ReactNode;
  value: string;
  label?: string;
  color?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  icon,
  value,
  label,
  color = 'text-muted-foreground'
}) => (
  <div className="flex items-center gap-2 whitespace-nowrap rounded-lg border border-border bg-secondary/60 px-3 py-2">
    {label && <span className="mr-1 text-xs text-muted-foreground">{label}</span>}
    <span className={color}>{icon}</span>
    <span className="text-sm font-medium text-foreground">{value}</span>
  </div>
);
