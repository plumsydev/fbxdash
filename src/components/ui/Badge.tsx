import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-sm border font-semibold uppercase tracking-wide',
  {
    variants: {
      variant: {
        default: 'border-border bg-secondary text-muted-foreground',
        success: 'border-success/40 bg-success/10 text-success',
        warning: 'border-warning/40 bg-warning/10 text-warning',
        error: 'border-destructive/40 bg-destructive/10 text-destructive',
        info: 'border-primary/40 bg-primary/10 text-primary'
      },
      size: {
        sm: 'px-1.5 py-0.5 text-[10px]',
        md: 'px-2 py-1 text-xs'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm'
    }
  }
);

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
  <div className="flex items-center gap-2 whitespace-nowrap rounded border border-border bg-secondary/60 px-3 py-2">
    {label && <span className="mr-1 text-xs uppercase tracking-wide text-muted-foreground">{label}</span>}
    <span className={color}>{icon}</span>
    <span className="font-data text-sm font-medium text-foreground">{value}</span>
  </div>
);
