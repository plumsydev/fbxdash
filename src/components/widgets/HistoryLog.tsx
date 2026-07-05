import React from 'react';
import {
  RefreshCw,
  WifiOff,
  Plus,
  AlertCircle,
  CheckCircle,
  Info,
  Settings,
  Zap,
  Key
} from 'lucide-react';
import type { LogEntry } from '../../types';

interface HistoryLogProps {
  logs: LogEntry[];
}

const getLogIcon = (type: LogEntry['type'], icon?: string) => {
  // Map icon names to components
  if (icon) {
    switch (icon) {
      case 'wifi-off':
        return <WifiOff size={12} />;
      case 'refresh':
        return <RefreshCw size={12} />;
      case 'plus':
        return <Plus size={12} />;
      case 'settings':
        return <Settings size={12} />;
      case 'key':
        return <Key size={12} />;
      case 'zap':
        return <Zap size={12} />;
    }
  }

  // Default icons by type
  switch (type) {
    case 'success':
      return <CheckCircle size={12} />;
    case 'warning':
      return <AlertCircle size={12} />;
    case 'error':
      return <AlertCircle size={12} />;
    default:
      return <Info size={12} />;
  }
};

const getTypeColor = (type: LogEntry['type']) => {
  switch (type) {
    case 'success':
      return 'bg-success';
    case 'warning':
      return 'bg-warning';
    case 'error':
      return 'bg-destructive';
    default:
      return 'bg-primary';
  }
};

export const HistoryLog: React.FC<HistoryLogProps> = ({ logs }) => (
  <div className="space-y-0 relative">
    {/* Timeline line */}
    <div className="absolute top-0 bottom-0 left-[7px] w-[1px] bg-border" />

    {logs.map((log) => (
      <div key={log.id} className="pl-6 py-3 relative group">
        {/* Dot */}
        <div
          className={`absolute left-0 top-4 w-3.5 h-3.5 rounded-full border-2 border-card z-10 ${getTypeColor(log.type)}`}
        />

        {/* Content */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{getLogIcon(log.type, log.icon)}</span>
            <span className="font-medium">
              <span className="text-primary">Admin</span>
              <span className="text-foreground/80 group-hover:text-foreground transition-colors ml-1">
                {log.message}
              </span>
            </span>
          </div>
          <span className="text-xs text-muted-foreground/70 whitespace-nowrap ml-2">
            {log.timestamp}
          </span>
        </div>
      </div>
    ))}
  </div>
);