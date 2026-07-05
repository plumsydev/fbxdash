import React, { useEffect, useState, useCallback } from 'react';
import {
  Folder,
  File,
  ChevronLeft,
  ChevronRight,
  Home,
  FolderPlus,
  Trash2,
  Download,
  HardDrive,
  Search,
  Grid,
  List,
  RefreshCw,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  Loader2,
  AlertCircle,
  CheckSquare,
  Square,
  ArrowUp,
  Play,
  Pause,
  X,
  MoreVertical,
  Edit3,
  Copy,
  Move,
  Share2,
  Link,
  Check,
  Clock,
  Plus,
  Upload,
  RotateCcw,
  LinkIcon
} from 'lucide-react';
import { useFsStore, type FsFile, type ShareLink } from '../stores/fsStore';
import { useDownloadsStore, useSystemStore } from '../stores';
import { useAuthStore } from '../stores/authStore';
import { PermissionBanner } from '../components/ui/PermissionBanner';
import { ToastContainer, type ToastData } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input, Label } from '../components/ui/Input';
import { Progress } from '../components/ui/Progress';
import { Loader } from '../components/ui/Loader';
import { Tooltip } from '../components/ui/Tooltip';
import { Separator } from '../components/ui/Separator';
import { DownloadDetails } from '../components/downloads/DownloadDetails';
import type { DownloadTask } from '../types';

// Map model to display name
const getDisplayName = (model: string): string => {
  switch (model) {
    case 'ultra': return 'Freebox Ultra';
    case 'delta': return 'Freebox Delta';
    case 'pop': return 'Freebox Pop';
    case 'revolution': return 'Freebox Revolution';
    default: return 'Freebox';
  }
};

// Format file size
const formatSize = (bytes: number | undefined | null): string => {
  if (bytes === undefined || bytes === null || bytes === 0 || isNaN(bytes)) return '0 B';
  if (bytes < 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0 || i >= sizes.length) return '0 B';
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format timestamp
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Decode base64 path to readable string
const decodeBase64Path = (encoded: string): string => {
  try {
    return decodeURIComponent(escape(atob(encoded)));
  } catch {
    return encoded;
  }
};

// Get file icon based on mimetype
const getFileIcon = (file: FsFile) => {
  if (file.type === 'dir') return Folder;

  const mime = file.mimetype || '';
  if (mime.startsWith('image/')) return FileImage;
  if (mime.startsWith('video/')) return FileVideo;
  if (mime.startsWith('audio/')) return FileAudio;
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar') || mime.includes('7z')) return FileArchive;
  if (mime.startsWith('text/') || mime.includes('document')) return FileText;

  return File;
};

// Get file icon color
const getFileIconColor = (file: FsFile): string => {
  if (file.type === 'dir') return 'text-warning';

  const mime = file.mimetype || '';
  if (mime.startsWith('image/')) return 'text-primary';
  if (mime.startsWith('video/')) return 'text-chart-5';
  if (mime.startsWith('audio/')) return 'text-chart-3';
  if (mime.includes('zip') || mime.includes('rar')) return 'text-chart-4';

  return 'text-muted-foreground';
};

// File item component
const FileItem: React.FC<{
  file: FsFile;
  isSelected: boolean;
  isShared: boolean;
  isRootFolder: boolean;
  isParentDir: boolean;
  viewMode: 'grid' | 'list';
  onSelect: () => void;
  onOpen: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onRename: () => void;
  onCopy: () => void;
  onMove: () => void;
  onShare: () => void;
  onDelete: () => void;
}> = ({ file, isSelected, isShared, isRootFolder, isParentDir, viewMode, onSelect, onOpen, onContextMenu, onRename, onCopy, onMove, onShare, onDelete }) => {
  const Icon = getFileIcon(file);
  const iconColor = getFileIconColor(file);
  const [showMenu, setShowMenu] = useState(false);

  if (viewMode === 'grid') {
    return (
      <div
        className={`group relative cursor-pointer rounded-xl border p-4 transition-all ${
          isSelected
            ? 'border-primary bg-primary/10'
            : 'border-transparent bg-card hover:border-border hover:bg-accent'
        }`}
        onClick={(e) => {
          if ((e.ctrlKey || e.metaKey) && !isParentDir) {
            onSelect();
          } else {
            onOpen();
          }
        }}
        onContextMenu={isParentDir ? undefined : onContextMenu}
      >
        {!isParentDir && (
          <button
            className={`absolute left-2 top-2 rounded p-1 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            {isSelected ? (
              <CheckSquare size={16} className="text-primary" />
            ) : (
              <Square size={16} className="text-muted-foreground" />
            )}
          </button>
        )}
        {/* Ellipsis menu button */}
        {!isParentDir && (
          <div className="absolute right-2 top-2">
            <button
              className={`rounded p-1 transition-opacity hover:bg-accent ${
                showMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
            >
              <MoreVertical size={16} className="text-muted-foreground" />
            </button>
            {showMenu && (
              <div
                className="absolute right-0 top-8 z-50 min-w-[160px] rounded-lg border border-border bg-popover py-1 shadow-hard-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { if (!isRootFolder) { onRename(); setShowMenu(false); } }}
                  disabled={isRootFolder}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm focus:outline-none focus:bg-accent ${isRootFolder ? 'cursor-not-allowed text-muted-foreground/50' : 'text-foreground hover:bg-accent'}`}
                >
                  <Edit3 size={14} /> Renommer
                </button>
                <button onClick={() => { onCopy(); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-accent focus:outline-none focus:bg-accent">
                  <Copy size={14} /> Copier
                </button>
                <button onClick={() => { onMove(); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-accent focus:outline-none focus:bg-accent">
                  <Move size={14} /> Déplacer
                </button>
                <button onClick={() => { onShare(); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-chart-5 hover:bg-accent focus:outline-none focus:bg-accent">
                  <Share2 size={14} /> Partager
                </button>
                <Separator className="my-1" />
                <button onClick={() => { onDelete(); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-accent focus:outline-none focus:bg-accent">
                  <Trash2 size={14} /> Supprimer
                </button>
              </div>
            )}
          </div>
        )}
        {/* Shared indicator */}
        {isShared && !isParentDir && (
          <div className="absolute right-8 top-2 p-1" title="Partagé">
            <Link size={14} className="text-chart-5" />
          </div>
        )}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <Icon size={40} className={iconColor} />
          </div>
          <span className="w-full truncate text-center text-sm text-foreground" title={file.name}>
            {file.name}
          </span>
          {file.type !== 'dir' && (
            <span className="font-data text-xs text-muted-foreground">{formatSize(file.size)}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-all ${
        isSelected
          ? 'bg-primary/10'
          : 'hover:bg-accent'
      }`}
      onClick={(e) => {
        if ((e.ctrlKey || e.metaKey) && !isParentDir) {
          onSelect();
        } else {
          onOpen();
        }
      }}
      onContextMenu={isParentDir ? undefined : onContextMenu}
    >
      {!isParentDir ? (
        <button
          className={`rounded p-1 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          {isSelected ? (
            <CheckSquare size={16} className="text-primary" />
          ) : (
            <Square size={16} className="text-muted-foreground" />
          )}
        </button>
      ) : (
        <div className="w-6" />
      )}
      <div className="relative">
        <Icon size={20} className={iconColor} />
        {isShared && !isParentDir && (
          <div className="absolute -right-1 -top-1 rounded-sm bg-chart-5 p-0.5" title="Partagé">
            <Link size={8} className="text-primary-foreground" />
          </div>
        )}
      </div>
      <span className="flex-1 truncate text-sm text-foreground" title={file.name}>
        {file.name}
      </span>
      {isShared && !isParentDir && (
        <Badge variant="info" size="sm" className="hidden bg-chart-5/10 text-chart-5 sm:inline-flex">
          Partagé
        </Badge>
      )}
      {!isParentDir && (
        <span className="font-data w-24 text-right text-xs text-muted-foreground">
          {file.type === 'dir' ? `${file.filecount || 0} fichiers` : formatSize(file.size)}
        </span>
      )}
      {!isParentDir && (
        <span className="font-data hidden w-32 text-right text-xs text-muted-foreground md:block">
          {formatDate(file.modification)}
        </span>
      )}
      {/* Ellipsis menu */}
      {!isParentDir ? (
        <div className="relative">
          <button
            className={`rounded p-1 transition-opacity hover:bg-accent ${
              showMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            <MoreVertical size={16} className="text-muted-foreground" />
          </button>
          {showMenu && (
            <div
              className="absolute right-0 top-8 z-50 min-w-[160px] rounded-lg border border-border bg-popover py-1 shadow-hard-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { if (!isRootFolder) { onRename(); setShowMenu(false); } }}
                disabled={isRootFolder}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm focus:outline-none focus:bg-accent ${isRootFolder ? 'cursor-not-allowed text-muted-foreground/50' : 'text-foreground hover:bg-accent'}`}
              >
                <Edit3 size={14} /> Renommer
              </button>
              <button onClick={() => { onCopy(); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-accent focus:outline-none focus:bg-accent">
                <Copy size={14} /> Copier
              </button>
              <button onClick={() => { onMove(); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-accent focus:outline-none focus:bg-accent">
                <Move size={14} /> Déplacer
              </button>
              <button onClick={() => { onShare(); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-chart-5 hover:bg-accent focus:outline-none focus:bg-accent">
                <Share2 size={14} /> Partager
              </button>
              <Separator className="my-1" />
              <button onClick={() => { onDelete(); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-accent focus:outline-none focus:bg-accent">
                <Trash2 size={14} /> Supprimer
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="w-6" />
      )}
    </div>
  );
};

// Download item component
const DownloadItem: React.FC<{
  task: DownloadTask;
  isSelected: boolean;
  onSelect: () => void;
  onPause: () => void;
  onResume: () => void;
  onRetry: () => void;
  onDelete: () => void;
}> = ({ task, isSelected, onSelect, onPause, onResume, onRetry, onDelete }) => {
  const isActive = task.status === 'downloading' || task.status === 'seeding';
  const isPaused = task.status === 'paused';
  const isDone = task.status === 'done';
  const isError = task.status === 'error';
  const isQueued = task.status === 'queued';

  const getStatusColor = () => {
    if (isDone) return 'bg-success/10';
    if (isError) return 'bg-destructive/10';
    if (isPaused || isQueued) return 'bg-muted';
    return 'bg-primary/10';
  };

  const getIconColor = () => {
    if (isDone) return 'text-success';
    if (isError) return 'text-destructive';
    if (isPaused || isQueued) return 'text-muted-foreground';
    return 'text-primary';
  };

  const getProgressColor = () => {
    if (isDone) return 'bg-success';
    if (isError) return 'bg-destructive';
    return 'bg-primary';
  };

  const getStatusText = () => {
    if (isError) return <span className="text-destructive">Erreur</span>;
    if (isQueued) return <span className="text-muted-foreground">En attente</span>;
    if (isPaused) return <span className="text-muted-foreground">En pause</span>;
    if (isDone) return <span className="text-success">Terminé</span>;
    if (task.status === 'seeding') return <span className="text-chart-5">Seeding</span>;
    return null;
  };

  return (
    <div
      className={`cursor-pointer rounded-lg border p-3 transition-all ${
        isSelected
          ? 'border-primary bg-primary/10'
          : 'border-transparent bg-card hover:border-border'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${getStatusColor()}`}>
          {isError ? (
            <AlertCircle size={16} className={getIconColor()} />
          ) : (
            <Download size={16} className={getIconColor()} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm text-foreground">{task.name}</h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-data">{formatSize(task.downloaded)} / {formatSize(task.size)}</span>
            {isActive && (
              <>
                <span>-</span>
                <span className="font-data text-primary">{formatSize(task.downloadSpeed)}/s</span>
              </>
            )}
            {task.eta && task.eta > 0 && isActive && (
              <>
                <span>-</span>
                <span className="font-data">{Math.floor(task.eta / 60)}min restantes</span>
              </>
            )}
            {getStatusText() && (
              <>
                <span>-</span>
                {getStatusText()}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {isActive && (
            <Tooltip content="Pause">
              <button
                onClick={onPause}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Pause size={16} />
              </button>
            </Tooltip>
          )}
          {(isPaused || isQueued) && (
            <Tooltip content="Reprendre">
              <button
                onClick={onResume}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-success/10 hover:text-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Play size={16} />
              </button>
            </Tooltip>
          )}
          {isError && (
            <Tooltip content="Réessayer">
              <button
                onClick={onRetry}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-warning/10 hover:text-warning focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <RotateCcw size={16} />
              </button>
            </Tooltip>
          )}
          <Tooltip content="Supprimer">
            <button
              onClick={onDelete}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <X size={16} />
            </button>
          </Tooltip>
        </div>
      </div>
      {!isDone && (
        <div className="mt-2">
          <Progress value={task.progress} className="h-1.5" indicatorClassName={getProgressColor()} />
        </div>
      )}
    </div>
  );
};

interface FilesPageProps {
  onBack: () => void;
  initialTab?: 'files' | 'downloads' | 'shares';
  initialDownloadId?: string;
}

export const FilesPage: React.FC<FilesPageProps> = ({ onBack, initialTab, initialDownloadId }) => {
  const {
    files,
    currentPath,
    disks,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    selectedFiles,
    shareLinks,
    listFiles,
    loadMore,
    navigateTo,
    navigateUp,
    createDirectory,
    deleteFiles,
    copyFiles,
    moveFiles,
    rename,
    fetchDisks,
    fetchShareLinks,
    createShareLink,
    deleteShareLink,
    toggleSelectFile,
    clearSelection,
    selectAll
  } = useFsStore();

  const {
    tasks: downloads,
    fetchDownloads,
    addDownload,
    addDownloadFromFile,
    pauseDownload,
    resumeDownload,
    deleteDownload
  } = useDownloadsStore();

  // Get permissions from auth store
  const { permissions, freeboxUrl } = useAuthStore();
  const hasExplorerPermission = permissions.explorer === true;
  const hasDownloaderPermission = permissions.downloader === true;

  // Get box name from system store
  const { info: systemInfo } = useSystemStore();
  const boxName = getDisplayName(systemInfo?.board_name || '');

  const [activeTab, setActiveTab] = useState<'files' | 'downloads' | 'shares'>(initialTab || 'files');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Modal states for file operations
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FsFile | null>(null);
  const [newName, setNewName] = useState('');

  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [destinationPath, setDestinationPath] = useState('');
  const [browserPath, setBrowserPath] = useState('/');
  const [browserFiles, setBrowserFiles] = useState<FsFile[]>([]);
  const [browserLoading, setBrowserLoading] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTarget, setShareTarget] = useState<FsFile | null>(null);
  const [shareExpireDays, setShareExpireDays] = useState<number>(7);
  const [createdShareLink, setCreatedShareLink] = useState<ShareLink | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FsFile } | null>(null);

  // Add download modal state
  const [showAddDownloadModal, setShowAddDownloadModal] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [torrentFile, setTorrentFile] = useState<File | null>(null);
  const [isAddingDownload, setIsAddingDownload] = useState(false);

  // Selected download for details view
  const [selectedDownload, setSelectedDownload] = useState<DownloadTask | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = (type: ToastData['type'], message: string, id?: string, progress?: number) => {
    const toastId = id || Date.now().toString();
    setToasts(prev => {
      // Update existing toast if id matches
      const existing = prev.find(t => t.id === toastId);
      if (existing) {
        return prev.map(t => t.id === toastId ? { ...t, type, message, progress } : t);
      }
      return [...prev, { id: toastId, type, message, progress }];
    });
    return toastId;
  };

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Fetch data on mount
  useEffect(() => {
    fetchDisks();
    fetchDownloads();
    fetchShareLinks();
    // Always try to list files on mount - the API will handle errors gracefully
    listFiles('/');
  }, [fetchDisks, fetchDownloads, fetchShareLinks, listFiles]);

  // Select initial download when downloads are loaded
  useEffect(() => {
    if (initialDownloadId && downloads.length > 0 && !selectedDownload) {
      const download = downloads.find(d => d.id === initialDownloadId);
      if (download) {
        setSelectedDownload(download);
      }
    }
  }, [initialDownloadId, downloads, selectedDownload]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Check if we have a disk available
  const hasDisk = disks.length > 0;

  // Calculate total storage from disks partitions
  const totalStorage = disks.reduce((acc, disk) => {
    const partitionTotal = disk.partitions?.reduce((sum, p) => sum + (p.total_bytes || 0), 0) || 0;
    return acc + partitionTotal;
  }, 0);

  const usedStorage = disks.reduce((acc, disk) => {
    const partitionUsed = disk.partitions?.reduce((sum, p) => sum + (p.used_bytes || 0), 0) || 0;
    return acc + partitionUsed;
  }, 0);

  // Filter files by search (exclude . directory, keep .. for navigation except at root)
  const filteredFiles = files.filter(file =>
    file.name !== '.' &&
    !(file.name === '..' && currentPath === '/') &&
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Path breadcrumbs - decode base64 path and split into parts
  const pathParts: { name: string; encodedPath: string }[] = (() => {
    if (currentPath === '/') return [];
    try {
      const decodedPath = decodeBase64Path(currentPath);
      const parts = decodedPath.split('/').filter(Boolean);
      return parts.map((name, i) => {
        // Build the path up to this point and encode it
        const pathUpToHere = '/' + parts.slice(0, i + 1).join('/');
        const encodedPath = btoa(unescape(encodeURIComponent(pathUpToHere)));
        return { name, encodedPath };
      });
    } catch {
      return [];
    }
  })();

  // Handle file/folder open
  const handleOpen = (file: FsFile) => {
    if (file.type === 'dir') {
      if (file.name === '..') {
        navigateUp();
      } else {
        navigateTo(file.path);
      }
    }
    // For files, could open preview or download
  };

  // Check if a file is shared
  const isFileShared = useCallback((filePath: string): boolean => {
    return shareLinks.some(link => link.path === filePath);
  }, [shareLinks]);

  // Check if file is a root level folder (disk)
  const isRootLevelFolder = (filePath: string): boolean => {
    try {
      const decodedPath = decodeBase64Path(filePath);
      // Root level folders have only one segment (e.g., "/Disque 1")
      const parts = decodedPath.split('/').filter(Boolean);
      return parts.length === 1;
    } catch {
      return false;
    }
  };

  // Single file actions
  const handleSingleFileRename = (file: FsFile) => {
    if (isRootLevelFolder(file.path)) {
      addToast('warning', 'Impossible de renommer un disque');
      return;
    }
    setRenameTarget(file);
    setNewName(file.name);
    setShowRenameModal(true);
  };

  const handleSingleFileCopy = (file: FsFile) => {
    clearSelection();
    toggleSelectFile(file.path);
    openCopyModal();
  };

  const handleSingleFileMove = (file: FsFile) => {
    clearSelection();
    toggleSelectFile(file.path);
    openMoveModal();
  };

  const handleSingleFileShare = (file: FsFile) => {
    setShareTarget(file);
    setCreatedShareLink(null);
    setShowShareModal(true);
  };

  const handleSingleFileDelete = async (file: FsFile) => {
    if (confirm(`Supprimer "${file.name}" ?`)) {
      const toastId = addToast('loading', `Suppression de "${file.name}"...`);
      const success = await deleteFiles([file.path]);
      removeToast(toastId);
      if (success) {
        addToast('success', `"${file.name}" supprimé`);
      } else {
        addToast('error', 'Erreur lors de la suppression');
      }
    }
  };

  // Handle create folder
  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      const toastId = addToast('loading', 'Création du dossier...');
      const success = await createDirectory(newFolderName.trim());
      removeToast(toastId);
      if (success) {
        addToast('success', `Dossier "${newFolderName.trim()}" créé`);
      } else {
        addToast('error', 'Erreur lors de la création du dossier');
      }
      setNewFolderName('');
      setShowNewFolderModal(false);
    }
  };

  // Handle add download
  const handleAddDownload = async () => {
    setIsAddingDownload(true);
    const toastId = addToast('loading', 'Ajout du téléchargement...');
    let success = false;

    try {
      if (torrentFile) {
        // Upload torrent file
        const reader = new FileReader();
        const fileBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data:application/x-bittorrent;base64, prefix
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(torrentFile);
        });
        success = await addDownloadFromFile(fileBase64, torrentFile.name);
      } else if (downloadUrl.trim()) {
        // Add by URL
        success = await addDownload(downloadUrl.trim());
      }
    } catch {
      success = false;
    }

    removeToast(toastId);
    setIsAddingDownload(false);

    if (success) {
      addToast('success', 'Téléchargement ajouté');
      setDownloadUrl('');
      setTorrentFile(null);
      setShowAddDownloadModal(false);
    } else {
      addToast('error', 'Erreur lors de l\'ajout du téléchargement');
    }
  };

  // Handle torrent file selection
  const handleTorrentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.torrent')) {
      setTorrentFile(file);
      setDownloadUrl(''); // Clear URL when file is selected
    }
  };

  // Handle retry download (restart a failed download)
  const handleRetryDownload = async (id: string) => {
    const toastId = addToast('loading', 'Relance du téléchargement...');
    await resumeDownload(id);
    removeToast(toastId);
    addToast('success', 'Téléchargement relancé');
  };

  // Handle delete selected
  const handleDeleteSelected = async () => {
    const count = selectedFiles.length;
    if (count > 0 && confirm(`Supprimer ${count} élément(s) ?`)) {
      const toastId = addToast('loading', `Suppression de ${count} élément(s)...`);
      const success = await deleteFiles(selectedFiles);
      removeToast(toastId);
      if (success) {
        addToast('success', `${count} élément(s) supprimé(s)`);
      } else {
        addToast('error', 'Erreur lors de la suppression');
      }
    }
  };

  // Handle rename
  const handleRename = async () => {
    if (renameTarget && newName.trim()) {
      const toastId = addToast('loading', 'Renommage en cours...');
      const success = await rename(renameTarget.path, newName.trim());
      removeToast(toastId);
      if (success) {
        addToast('success', `"${renameTarget.name}" renommé en "${newName.trim()}"`);
      } else {
        addToast('error', 'Erreur lors du renommage');
      }
      setRenameTarget(null);
      setNewName('');
      setShowRenameModal(false);
    }
  };

  // Handle copy
  const handleCopy = async () => {
    // browserPath must be a valid base64 path (not '/' which is just a UI marker for root listing)
    if (selectedFiles.length > 0 && browserPath && browserPath !== '/') {
      const count = selectedFiles.length;
      const dest = destinationPath;
      const filesToCopy = [...selectedFiles];
      const destPath = browserPath;

      setShowCopyModal(false);
      setDestinationPath('');
      setBrowserPath('/');
      clearSelection();

      const toastId = addToast('loading', `Copie de ${count} élément(s) en cours...`);
      // Use destPath (base64 encoded) for the API
      const success = await copyFiles(filesToCopy, destPath);
      removeToast(toastId);
      if (success) {
        addToast('success', `${count} élément(s) copié(s) vers ${dest}`);
      } else {
        addToast('error', 'Erreur lors de la copie');
      }
    }
  };

  // Handle move
  const handleMove = async () => {
    // browserPath must be a valid base64 path (not '/' which is just a UI marker for root listing)
    if (selectedFiles.length > 0 && browserPath && browserPath !== '/') {
      const count = selectedFiles.length;
      const dest = destinationPath;
      const filesToMove = [...selectedFiles];
      const destPath = browserPath;

      setShowMoveModal(false);
      setDestinationPath('');
      setBrowserPath('/');
      clearSelection();

      const toastId = addToast('loading', `Déplacement de ${count} élément(s) en cours...`);
      // Use browserPath (base64 encoded) for the API
      const success = await moveFiles(filesToMove, destPath);
      removeToast(toastId);
      if (success) {
        addToast('success', `${count} élément(s) déplacé(s) vers ${dest}`);
      } else {
        addToast('error', 'Erreur lors du déplacement');
      }
    }
  };

  // Handle share
  const handleShare = async () => {
    if (shareTarget) {
      const link = await createShareLink(shareTarget.path, shareExpireDays || undefined);
      if (link) {
        setCreatedShareLink(link);
      }
    }
  };

  // Copy link to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  // Open context menu
  const handleContextMenu = (e: React.MouseEvent, file: FsFile) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 180;
    const menuHeight = 250;

    // Adjust position to stay within viewport
    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    setContextMenu({ x, y, file });
  };

  // Browser for destination selection
  const loadBrowserFiles = async (path: string) => {
    setBrowserLoading(true);
    try {
      const url = (path === '/' || path === '')
        ? '/api/fs/list'
        : `/api/fs/list?path=${encodeURIComponent(path)}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success && data.result) {
        // Only show directories
        const dirs = data.result.filter((f: FsFile) => f.type === 'dir');
        setBrowserFiles(dirs);
        // For root, we store '/' as a marker, but for operations we'll need to select a subfolder
        setBrowserPath(path);
        // Set destination path (decoded for display)
        if (path === '/') {
          setDestinationPath('/');
        } else {
          setDestinationPath(decodeBase64Path(path));
        }
      }
    } catch {
      setBrowserFiles([]);
    }
    setBrowserLoading(false);
  };

  const browserNavigateUp = async () => {
    if (browserPath === '/') return;
    try {
      const decodedPath = decodeBase64Path(browserPath);
      const parts = decodedPath.split('/').filter(Boolean);
      parts.pop();
      if (parts.length === 0) {
        await loadBrowserFiles('/');
      } else {
        const parentPath = '/' + parts.join('/');
        const encodedParentPath = btoa(unescape(encodeURIComponent(parentPath)));
        await loadBrowserFiles(encodedParentPath);
      }
    } catch {
      await loadBrowserFiles('/');
    }
  };

  const openCopyModal = () => {
    setShowCopyModal(true);
    loadBrowserFiles('/');
  };

  const openMoveModal = () => {
    setShowMoveModal(true);
    loadBrowserFiles('/');
  };

  // Active downloads count
  const activeDownloads = downloads.filter(d => d.status === 'downloading' || d.status === 'seeding').length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto max-w-[1920px] px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Folder size={24} className="text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Fichiers</h1>
                  <p className="text-sm text-muted-foreground">Explorateur &amp; Téléchargements</p>
                </div>
              </div>
            </div>

            {/* Storage info */}
            {hasDisk && totalStorage > 0 ? (
              <div className="hidden items-center gap-3 rounded-lg border border-border bg-secondary/60 px-4 py-2 md:flex">
                <HardDrive size={16} className="text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Espace utilisé</div>
                  <div className="font-data text-sm text-foreground">
                    {formatSize(usedStorage)} / {formatSize(totalStorage)}
                  </div>
                </div>
                <Progress
                  value={totalStorage > 0 ? (usedStorage / totalStorage) * 100 : 0}
                  className="h-2 w-24"
                />
              </div>
            ) : (
              <div className="hidden items-center gap-3 rounded-lg border border-border bg-secondary/60 px-4 py-2 md:flex">
                <HardDrive size={16} className="text-muted-foreground" />
                <div className="text-sm text-muted-foreground">Aucun disque</div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1920px] px-4 py-6 pb-24">
        {/* Tabs */}
        <div className="mb-6 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('files')}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                activeTab === 'files'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Folder size={16} />
              Explorateur
            </button>
            <button
              onClick={() => setActiveTab('downloads')}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                activeTab === 'downloads'
                  ? 'border-success text-success'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Download size={16} />
              Téléchargements ({downloads.length})
              {activeDownloads > 0 && (
                <Badge variant="success" size="sm" className="bg-success px-1.5 py-0.5 text-[10px] text-success-foreground">
                  {activeDownloads}
                </Badge>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('shares');
                fetchShareLinks();
              }}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                activeTab === 'shares'
                  ? 'border-chart-5 text-chart-5'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Link size={16} />
              Partages ({shareLinks.length})
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
            <AlertCircle className="flex-shrink-0 text-destructive" />
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <>
            {/* Permission warning */}
            {!hasExplorerPermission && (
              <PermissionBanner permission="explorer" freeboxUrl={freeboxUrl} />
            )}

            {/* No disk warning */}
            {!hasDisk && hasExplorerPermission && (
              <div className="flex flex-col items-center justify-center py-16">
                <HardDrive size={48} className="mb-4 text-muted-foreground/60" />
                <h2 className="mb-1 text-sm font-medium text-muted-foreground">Aucun disque détecté</h2>
                <p className="max-w-md text-center text-xs text-muted-foreground/70">
                  Connectez un disque dur à votre Freebox pour accéder à l'explorateur de fichiers.
                </p>
              </div>
            )}

            {/* File explorer (only show if disk available) */}
            {hasDisk && (
              <>
                {/* Toolbar */}
                <div className="mb-4 flex items-center justify-between gap-4">
                  {/* Breadcrumbs */}
                  <div className="flex flex-grow items-center gap-1 overflow-x-auto">
                    <button
                      onClick={() => navigateTo('/')}
                      className="flex flex-shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <Home size={16} />
                      <span className="text-sm">{boxName}</span>
                    </button>
                    {pathParts.map((part, i) => {
                      const isPartShared = isFileShared(part.encodedPath);
                      return (
                        <React.Fragment key={i}>
                          <ChevronRight size={14} className="flex-shrink-0 text-muted-foreground/50" />
                          <button
                            onClick={() => navigateTo(part.encodedPath)}
                            className={`flex max-w-48 items-center gap-1 truncate rounded px-2 py-1 text-sm transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                              isPartShared ? 'text-chart-5' : 'text-muted-foreground'
                            }`}
                          >
                            {part.name}
                            {isPartShared && <Link size={12} className="flex-shrink-0" />}
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Rechercher..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-40 py-1.5 pl-8 pr-3 text-sm"
                      />
                    </div>
                    <Tooltip content={viewMode === 'grid' ? 'Vue liste' : 'Vue grille'}>
                      <button
                        onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        {viewMode === 'grid' ? <List size={16} /> : <Grid size={16} />}
                      </button>
                    </Tooltip>
                    <Tooltip content="Actualiser">
                      <button
                        onClick={() => listFiles()}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <RefreshCw size={16} />
                      </button>
                    </Tooltip>
                  </div>
                </div>

                {/* Selection toolbar */}
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Button icon={ArrowUp} onClick={navigateUp} disabled={currentPath === '/'}>
                      Dossier parent
                    </Button>
                    <Tooltip content={currentPath === '/' ? 'Impossible de créer un dossier à la racine' : 'Nouveau dossier'}>
                      <Button
                        variant="primary"
                        icon={FolderPlus}
                        onClick={() => setShowNewFolderModal(true)}
                        disabled={currentPath === '/'}
                      >
                        Nouveau dossier
                      </Button>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedFiles.length > 0 ? (
                      <>
                        <span className="text-xs text-muted-foreground">{selectedFiles.length} sélectionné(s)</span>
                        <Button variant="ghost" onClick={clearSelection}>
                          Annuler
                        </Button>
                        {selectedFiles.length === 1 && !isRootLevelFolder(selectedFiles[0]) && (
                          <Button
                            icon={Edit3}
                            onClick={() => {
                              const file = files.find(f => f.path === selectedFiles[0]);
                              if (file) {
                                setRenameTarget(file);
                                setNewName(file.name);
                                setShowRenameModal(true);
                              }
                            }}
                          >
                            Renommer
                          </Button>
                        )}
                        <Button icon={Copy} onClick={openCopyModal}>
                          Copier
                        </Button>
                        <Button icon={Move} onClick={openMoveModal}>
                          Déplacer
                        </Button>
                        {selectedFiles.length === 1 && (
                          <Button
                            icon={Share2}
                            onClick={() => {
                              const file = files.find(f => f.path === selectedFiles[0]);
                              if (file) {
                                setShareTarget(file);
                                setCreatedShareLink(null);
                                setShowShareModal(true);
                              }
                            }}
                            className="border-transparent bg-chart-5/10 text-chart-5 hover:bg-chart-5/20"
                          >
                            Partager
                          </Button>
                        )}
                        <Button variant="danger" icon={Trash2} onClick={handleDeleteSelected}>
                          Supprimer
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" onClick={selectAll}>
                        Tout sélectionner
                      </Button>
                    )}
                  </div>
                </div>

                {/* File list */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader size="lg" className="text-primary" />
                  </div>
                ) : filteredFiles.length > 0 ? (
                  <>
                    <div className={viewMode === 'grid'
                      ? 'grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8'
                      : 'space-y-1'
                    }>
                      {filteredFiles.map((file) => (
                        <FileItem
                          key={file.path}
                          file={file}
                          isSelected={selectedFiles.includes(file.path)}
                          isShared={isFileShared(file.path)}
                          isRootFolder={isRootLevelFolder(file.path)}
                          isParentDir={file.name === '..'}
                          viewMode={viewMode}
                          onSelect={() => toggleSelectFile(file.path)}
                          onOpen={() => handleOpen(file)}
                          onContextMenu={(e) => handleContextMenu(e, file)}
                          onRename={() => handleSingleFileRename(file)}
                          onCopy={() => handleSingleFileCopy(file)}
                          onMove={() => handleSingleFileMove(file)}
                          onShare={() => handleSingleFileShare(file)}
                          onDelete={() => handleSingleFileDelete(file)}
                        />
                      ))}
                    </div>

                    {/* Load More button for v15 pagination */}
                    {hasMore && (
                      <div className="mt-6 flex justify-center">
                        <Button onClick={loadMore} disabled={isLoadingMore} size="md" className="px-6">
                          {isLoadingMore ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Chargement...
                            </>
                          ) : (
                            <>
                              <RefreshCw size={16} />
                              Charger plus de fichiers
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Folder size={48} className="mb-4 text-muted-foreground/60" />
                    <h3 className="mb-1 text-sm font-medium text-muted-foreground">Dossier vide</h3>
                    <p className="max-w-md text-center text-xs text-muted-foreground/70">
                      {searchQuery ? 'Aucun fichier ne correspond à votre recherche.' : 'Ce dossier ne contient aucun fichier.'}
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Downloads Tab */}
        {activeTab === 'downloads' && (
          <>
            {/* Permission warning */}
            {!hasDownloaderPermission && (
              <PermissionBanner permission="downloader" freeboxUrl={freeboxUrl} />
            )}

            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="primary" icon={Plus} onClick={() => setShowAddDownloadModal(true)}>
                  Ajouter
                </Button>
                {activeDownloads > 0 && (
                  <span className="text-sm text-success">{activeDownloads} téléchargement(s) en cours</span>
                )}
              </div>
              <Tooltip content="Actualiser">
                <button
                  onClick={() => fetchDownloads()}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <RefreshCw size={16} />
                </button>
              </Tooltip>
            </div>

            {downloads.length > 0 ? (
              <div className="space-y-2">
                {downloads.map((task) => (
                  <DownloadItem
                    key={task.id}
                    task={task}
                    isSelected={selectedDownload?.id === task.id}
                    onSelect={() => setSelectedDownload(selectedDownload?.id === task.id ? null : task)}
                    onPause={() => pauseDownload(task.id)}
                    onResume={() => resumeDownload(task.id)}
                    onRetry={() => handleRetryDownload(task.id)}
                    onDelete={() => {
                      if (confirm('Supprimer ce téléchargement ?')) {
                        // Close details panel first if this is the selected download
                        if (selectedDownload?.id === task.id) {
                          setSelectedDownload(null);
                        }
                        deleteDownload(task.id, false);
                      }
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <Download size={48} className="mb-4 text-muted-foreground/60" />
                <h3 className="mb-1 text-sm font-medium text-muted-foreground">Aucun téléchargement</h3>
                <p className="max-w-md text-center text-xs text-muted-foreground/70">
                  Vos téléchargements actifs et terminés apparaîtront ici.
                </p>
                <Button variant="primary" icon={Plus} size="md" className="mt-4" onClick={() => setShowAddDownloadModal(true)}>
                  Ajouter un téléchargement
                </Button>
              </div>
            )}

            {/* Download Details Panel */}
            {selectedDownload && (
              <div className="mt-6">
                <DownloadDetails
                  task={selectedDownload}
                  onClose={() => setSelectedDownload(null)}
                />
              </div>
            )}
          </>
        )}

        {/* Shares Tab */}
        {activeTab === 'shares' && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {shareLinks.length > 0 && (
                  <span>{shareLinks.length} lien(s) de partage actif(s)</span>
                )}
              </div>
              <Tooltip content="Actualiser">
                <button
                  onClick={() => fetchShareLinks()}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <RefreshCw size={16} />
                </button>
              </Tooltip>
            </div>

            {shareLinks.length > 0 ? (
              <div className="space-y-2">
                {shareLinks.map((link) => (
                  <div key={link.token} className="rounded-lg bg-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-chart-5/10 p-2">
                        <Link size={16} className="text-chart-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm text-foreground">{link.name}</h4>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          {link.expire > 0 ? (
                            <>
                              <Clock size={12} />
                              <span>Expire le <span className="font-data">{formatDate(link.expire)}</span></span>
                            </>
                          ) : (
                            <span>Pas d'expiration</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          icon={linkCopied ? Check : Copy}
                          onClick={() => copyToClipboard(link.fullurl)}
                          className="border-transparent bg-chart-5/10 text-chart-5 hover:bg-chart-5/20"
                        >
                          {linkCopied ? 'Copié !' : 'Copier le lien'}
                        </Button>
                        <Tooltip content="Supprimer">
                          <button
                            onClick={async () => {
                              if (confirm('Supprimer ce lien de partage ?')) {
                                await deleteShareLink(link.token);
                              }
                            }}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          >
                            <Trash2 size={16} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                    {link.fullurl && (
                      <div className="mt-3 rounded-lg bg-secondary/60 p-2">
                        <p className="truncate font-mono text-xs text-muted-foreground">{link.fullurl}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <Link size={48} className="mb-4 text-muted-foreground/60" />
                <h3 className="mb-1 text-sm font-medium text-muted-foreground">Aucun lien de partage</h3>
                <p className="max-w-md text-center text-xs text-muted-foreground/70">
                  Sélectionnez un fichier ou dossier dans l'explorateur et cliquez sur "Partager" pour créer un lien.
                </p>
              </div>
            )}
          </>
        )}

        {/* New Folder Modal */}
        {showNewFolderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-hard">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Nouveau dossier</h3>
              <Input
                type="text"
                placeholder="Nom du dossier"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                autoFocus
              />
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setNewFolderName('');
                    setShowNewFolderModal(false);
                  }}
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                >
                  Créer
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Rename Modal */}
        {showRenameModal && renameTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-hard">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Renommer</h3>
              <p className="mb-4 text-sm text-muted-foreground">Renommer "{renameTarget.name}"</p>
              <Input
                type="text"
                placeholder="Nouveau nom"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                autoFocus
              />
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setRenameTarget(null);
                    setNewName('');
                    setShowRenameModal(false);
                  }}
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleRename}
                  disabled={!newName.trim() || newName === renameTarget.name}
                >
                  Renommer
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Copy Modal */}
        {showCopyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
            <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-hard">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Copy size={20} className="text-primary" />
                Copier {selectedFiles.length} élément(s)
              </h3>

              {/* Destination path display */}
              <div className="mb-4 rounded-lg bg-secondary/60 p-3">
                <p className="mb-1 text-xs text-muted-foreground">Destination :</p>
                <p className="font-mono text-sm text-foreground">{destinationPath || '/'}</p>
              </div>

              {/* Folder browser */}
              <div className="mb-4">
                <div className="mb-2 flex items-center gap-2">
                  <Tooltip content="Racine">
                    <button
                      onClick={() => loadBrowserFiles('/')}
                      className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <Home size={14} />
                    </button>
                  </Tooltip>
                  <Tooltip content="Dossier parent">
                    <button
                      onClick={browserNavigateUp}
                      disabled={browserPath === '/'}
                      className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
                    >
                      <ArrowUp size={14} />
                    </button>
                  </Tooltip>
                  <span className="flex-1 truncate text-xs text-muted-foreground">
                    {browserPath === '/' ? '/' : decodeBase64Path(browserPath)}
                  </span>
                </div>
                <div className="h-48 overflow-y-auto rounded-lg border border-border bg-background">
                  {browserLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader className="text-primary" />
                    </div>
                  ) : browserFiles.length > 0 ? (
                    <div className="p-1">
                      {browserFiles.map((file) => (
                        <button
                          key={file.path}
                          onClick={() => loadBrowserFiles(file.path)}
                          className="flex w-full items-center gap-2 rounded p-2 text-left transition-colors hover:bg-accent focus:outline-none focus:bg-accent"
                        >
                          <Folder size={16} className="flex-shrink-0 text-warning" />
                          <span className="truncate text-sm text-foreground">{file.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Aucun sous-dossier
                    </div>
                  )}
                </div>
              </div>

              {browserPath === '/' && (
                <p className="mb-3 text-xs text-warning">Sélectionnez un dossier de destination</p>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setDestinationPath('');
                    setShowCopyModal(false);
                  }}
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleCopy}
                  disabled={browserPath === '/'}
                >
                  Copier ici
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Move Modal */}
        {showMoveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
            <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-hard">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Move size={20} className="text-primary" />
                Déplacer {selectedFiles.length} élément(s)
              </h3>

              {/* Destination path display */}
              <div className="mb-4 rounded-lg bg-secondary/60 p-3">
                <p className="mb-1 text-xs text-muted-foreground">Destination :</p>
                <p className="font-mono text-sm text-foreground">{destinationPath || '/'}</p>
              </div>

              {/* Folder browser */}
              <div className="mb-4">
                <div className="mb-2 flex items-center gap-2">
                  <Tooltip content="Racine">
                    <button
                      onClick={() => loadBrowserFiles('/')}
                      className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <Home size={14} />
                    </button>
                  </Tooltip>
                  <Tooltip content="Dossier parent">
                    <button
                      onClick={browserNavigateUp}
                      disabled={browserPath === '/'}
                      className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
                    >
                      <ArrowUp size={14} />
                    </button>
                  </Tooltip>
                  <span className="flex-1 truncate text-xs text-muted-foreground">
                    {browserPath === '/' ? '/' : decodeBase64Path(browserPath)}
                  </span>
                </div>
                <div className="h-48 overflow-y-auto rounded-lg border border-border bg-background">
                  {browserLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader className="text-primary" />
                    </div>
                  ) : browserFiles.length > 0 ? (
                    <div className="p-1">
                      {browserFiles.map((file) => (
                        <button
                          key={file.path}
                          onClick={() => loadBrowserFiles(file.path)}
                          className="flex w-full items-center gap-2 rounded p-2 text-left transition-colors hover:bg-accent focus:outline-none focus:bg-accent"
                        >
                          <Folder size={16} className="flex-shrink-0 text-warning" />
                          <span className="truncate text-sm text-foreground">{file.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Aucun sous-dossier
                    </div>
                  )}
                </div>
              </div>

              {browserPath === '/' && (
                <p className="mb-3 text-xs text-warning">Sélectionnez un dossier de destination</p>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setDestinationPath('');
                    setShowMoveModal(false);
                  }}
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleMove}
                  disabled={browserPath === '/'}
                >
                  Déplacer ici
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && shareTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-hard">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Share2 size={20} className="text-chart-5" />
                Partager "{shareTarget.name}"
              </h3>

              {!createdShareLink ? (
                <>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Créez un lien de partage public pour ce {shareTarget.type === 'dir' ? 'dossier' : 'fichier'}.
                  </p>

                  <div className="mb-4">
                    <Label className="mb-2 block">Expiration du lien :</Label>
                    <select
                      value={shareExpireDays}
                      onChange={(e) => setShareExpireDays(Number(e.target.value))}
                      className="w-full rounded-lg border border-input bg-secondary/50 px-4 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value={0}>Jamais</option>
                      <option value={1}>1 jour</option>
                      <option value={7}>7 jours</option>
                      <option value={30}>30 jours</option>
                      <option value={90}>90 jours</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={() => {
                        setShareTarget(null);
                        setCreatedShareLink(null);
                        setShowShareModal(false);
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      size="md"
                      onClick={handleShare}
                      className="border-transparent bg-chart-5 text-primary-foreground hover:bg-chart-5/90"
                    >
                      Créer le lien
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4 rounded-lg border border-success/30 bg-success/10 p-4">
                    <div className="flex items-center gap-2 text-success">
                      <Check size={16} />
                      <span className="text-sm font-medium">Lien créé avec succès !</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <Label className="mb-2 block">Lien de partage :</Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={createdShareLink.fullurl}
                        readOnly
                        className="flex-1 font-mono text-sm"
                      />
                      <Button
                        size="md"
                        onClick={() => copyToClipboard(createdShareLink.fullurl)}
                        className="border-transparent bg-chart-5 text-primary-foreground hover:bg-chart-5/90"
                      >
                        {linkCopied ? <Check size={16} /> : <Copy size={16} />}
                      </Button>
                    </div>
                  </div>

                  {createdShareLink.expire > 0 && (
                    <p className="mb-4 text-xs text-muted-foreground">
                      Expire le <span className="font-data">{formatDate(createdShareLink.expire)}</span>
                    </p>
                  )}

                  <div className="flex justify-end">
                    <Button
                      size="md"
                      onClick={() => {
                        setShareTarget(null);
                        setCreatedShareLink(null);
                        setShowShareModal(false);
                        clearSelection();
                      }}
                    >
                      Fermer
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Add Download Modal */}
        {showAddDownloadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
            <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-hard">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Download size={20} className="text-primary" />
                Ajouter un téléchargement
              </h3>

              <div className="space-y-4">
                {/* URL Input */}
                <div>
                  <Label className="mb-2 block">
                    URL du fichier ou lien magnet
                  </Label>
                  <div className="relative flex-1">
                    <LinkIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="https://... ou magnet:?xt=..."
                      value={downloadUrl}
                      onChange={(e) => {
                        setDownloadUrl(e.target.value);
                        if (e.target.value) setTorrentFile(null);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && (downloadUrl.trim() || torrentFile) && handleAddDownload()}
                      disabled={!!torrentFile}
                      className="pl-10"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Separator */}
                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground">ou</span>
                  <Separator className="flex-1" />
                </div>

                {/* File Upload */}
                <div>
                  <Label className="mb-2 block">
                    Fichier torrent
                  </Label>
                  {torrentFile ? (
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/60 p-3">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <FileArchive size={20} className="text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{torrentFile.name}</p>
                        <p className="font-data text-xs text-muted-foreground">{formatSize(torrentFile.size)}</p>
                      </div>
                      <button
                        onClick={() => setTorrentFile(null)}
                        className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-muted-foreground/40 hover:bg-accent/50">
                      <Upload size={24} className="text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Cliquez ou déposez un fichier .torrent</span>
                      <input
                        type="file"
                        accept=".torrent"
                        onChange={handleTorrentFileSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Formats supportés : HTTP, HTTPS, FTP, Magnet, fichiers .torrent
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setDownloadUrl('');
                    setTorrentFile(null);
                    setShowAddDownloadModal(false);
                  }}
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleAddDownload}
                  disabled={(!downloadUrl.trim() && !torrentFile) || isAddingDownload}
                >
                  {isAddingDownload ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Ajout...
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      Télécharger
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-[200] min-w-[180px] rounded-lg border border-border bg-popover py-1 shadow-hard-sm"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-border px-3 py-2">
            <p className="max-w-[160px] truncate text-xs text-muted-foreground">{contextMenu.file.name}</p>
          </div>
          <button
            onClick={() => { if (!isRootLevelFolder(contextMenu.file.path)) { handleSingleFileRename(contextMenu.file); setContextMenu(null); } }}
            disabled={isRootLevelFolder(contextMenu.file.path)}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm focus:outline-none focus:bg-accent ${isRootLevelFolder(contextMenu.file.path) ? 'cursor-not-allowed text-muted-foreground/50' : 'text-foreground hover:bg-accent'}`}
          >
            <Edit3 size={14} /> Renommer
          </button>
          <button
            onClick={() => { handleSingleFileCopy(contextMenu.file); setContextMenu(null); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-accent focus:outline-none focus:bg-accent"
          >
            <Copy size={14} /> Copier
          </button>
          <button
            onClick={() => { handleSingleFileMove(contextMenu.file); setContextMenu(null); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-accent focus:outline-none focus:bg-accent"
          >
            <Move size={14} /> Déplacer
          </button>
          <button
            onClick={() => { handleSingleFileShare(contextMenu.file); setContextMenu(null); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-chart-5 hover:bg-accent focus:outline-none focus:bg-accent"
          >
            <Share2 size={14} /> Partager
          </button>
          <Separator className="my-1" />
          <button
            onClick={() => { handleSingleFileDelete(contextMenu.file); setContextMenu(null); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-accent focus:outline-none focus:bg-accent"
          >
            <Trash2 size={14} /> Supprimer
          </button>
        </div>
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default FilesPage;
