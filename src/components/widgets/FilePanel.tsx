import React from 'react';
import { FileText, Download, Upload, ChevronRight, Clock, Users } from 'lucide-react';
import { formatBytes, formatSpeed, formatDuration } from '../../utils/constants';
import { Progress } from '../ui/Progress';
import type { DownloadTask } from '../../types';

interface FilePanelProps {
  tasks: DownloadTask[];
  onTaskClick?: (task: DownloadTask) => void;
}

export const FilePanel: React.FC<FilePanelProps> = ({ tasks, onTaskClick }) => {
  const activeTasks = tasks.filter(t => t.status === 'downloading' || t.status === 'seeding');
  const completedTasks = tasks.filter(t => t.status === 'done');

  return (
    <div className="space-y-3">
      {/* Active downloads */}
      {activeTasks.map((task) => (
        <div
          key={task.id}
          onClick={() => onTaskClick?.(task)}
          tabIndex={0}
          className="bg-card rounded-xl p-4 border border-border cursor-pointer hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {/* File name */}
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-secondary rounded-lg">
              <FileText size={16} className="text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground truncate flex-1">
              {task.name}
            </span>
          </div>

          {/* Progress bar */}
          <Progress
            value={task.progress}
            className="mb-3"
            indicatorClassName="bg-primary"
          />

          {/* Stats row */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground font-data">
                {formatBytes(task.downloaded)} / {formatBytes(task.size)}
              </span>
              <span className="text-primary font-medium font-data">{task.progress}%</span>
            </div>
            <div className="flex items-center gap-3">
              {task.peers != null && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Users size={10} /> {task.peers}
                </span>
              )}
              {task.eta > 0 && (
                <span className="flex items-center gap-1 text-success font-data">
                  <Clock size={10} /> {formatDuration(task.eta)}
                </span>
              )}
            </div>
          </div>

          {/* Speed row */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
            <div className="flex items-center gap-1 text-xs">
              <Download size={12} className="text-primary" />
              <span className="text-primary font-mono font-data">{formatSpeed(task.downloadSpeed)}</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Upload size={12} className="text-success" />
              <span className="text-success font-mono font-data">{formatSpeed(task.uploadSpeed)}</span>
            </div>
          </div>
        </div>
      ))}

      {/* Completed files */}
      {completedTasks.length > 0 && (
        <div className="space-y-2">
          {activeTasks.length > 0 && (
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider px-1 mt-4">
              Terminés
            </div>
          )}
          {completedTasks.slice(0, 3).map((task) => (
            <div
              key={task.id}
              onClick={() => onTaskClick?.(task)}
              tabIndex={0}
              className="flex items-center justify-between p-3 bg-secondary/40 rounded-xl border border-border/50 hover:bg-accent/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-secondary rounded-lg shrink-0">
                  <FileText size={14} className="text-muted-foreground" />
                </div>
                <span className="text-xs text-muted-foreground truncate">{task.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-foreground font-medium font-data">{formatBytes(task.size)}</span>
                <ChevronRight size={14} className="text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      )}

      {tasks.length > 5 && (
        <button className="w-full text-center text-xs text-primary hover:text-primary/80 py-2 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          Voir tout ({tasks.length} fichiers)
        </button>
      )}

      {tasks.length === 0 && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          Aucun téléchargement
        </div>
      )}
    </div>
  );
};
