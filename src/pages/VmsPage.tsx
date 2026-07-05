import React, { useEffect, useState } from 'react';
import {
  Server,
  ChevronLeft,
  Plus,
  Play,
  Square,
  RefreshCw,
  Terminal,
  Settings,
  Trash2,
  Cpu,
  HardDrive,
  MemoryStick,
  Loader2,
  AlertCircle,
  Power,
  ExternalLink
} from 'lucide-react';
import { useVmStore } from '../stores/vmStore';
import { useCapabilitiesStore } from '../stores/capabilitiesStore';
import { useAuthStore } from '../stores/authStore';
import { PermissionBanner } from '../components/ui/PermissionBanner';
import { Badge } from '../components/ui';
import { ResourceBar } from '../components/widgets';
import type { VM } from '../types';

// VM Status badge
const VmStatusBadge: React.FC<{ status: VM['status'] }> = ({ status }) => {
  const statusConfig: Record<VM['status'], { label: string; variant: 'success' | 'default' | 'warning' | 'error' }> = {
    running: { label: 'Active', variant: 'success' },
    stopped: { label: 'Arrêtée', variant: 'default' },
    starting: { label: 'Démarrage', variant: 'warning' },
    stopping: { label: 'Arrêt', variant: 'warning' }
  };

  const config = statusConfig[status] || statusConfig.stopped;

  return (
    <Badge variant={config.variant} size="sm">
      {config.label}
    </Badge>
  );
};

// VM Card component
const VmCard: React.FC<{
  vm: VM;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onConsole: () => void;
  onSettings: () => void;
  onDelete: () => void;
}> = ({ vm, onStart, onStop, onRestart, onConsole, onSettings, onDelete }) => {
  const isRunning = vm.status === 'running';
  const isTransitioning = vm.status === 'starting' || vm.status === 'stopping';
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete();
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${isRunning ? 'bg-success/10' : 'bg-secondary'}`}>
              <Server size={24} className={isRunning ? 'text-success' : 'text-muted-foreground'} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{vm.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <VmStatusBadge status={vm.status} />
                <span className="text-xs text-muted-foreground">{vm.os}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isRunning && (
              <button
                onClick={onConsole}
                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                title="Console"
              >
                <Terminal size={18} />
              </button>
            )}
            <button
              onClick={onSettings}
              className="p-2 text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              title="Paramètres"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Resources - Note: Per-VM usage stats are NOT available in Freebox API */}
      <div className="p-4">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-muted-foreground" />
            <span className="text-muted-foreground">{vm.vcpus} vCPU</span>
          </div>
          <div className="flex items-center gap-2">
            <MemoryStick size={16} className="text-muted-foreground" />
            <span className="text-muted-foreground">{Math.round(vm.ramTotal * 10) / 10} Go</span>
          </div>
          {vm.diskTotal > 0 && (
            <div className="flex items-center gap-2">
              <HardDrive size={16} className="text-muted-foreground" />
              <span className="text-muted-foreground">{Math.round(vm.diskTotal)} Go</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 pt-0 flex items-center gap-2">
        {isRunning ? (
          <>
            <button
              onClick={onStop}
              disabled={isTransitioning}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-destructive/10 hover:bg-destructive/20 disabled:opacity-50 disabled:cursor-not-allowed text-destructive rounded-lg transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Square size={16} />
              Arrêter
            </button>
            <button
              onClick={onRestart}
              disabled={isTransitioning}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-warning/10 hover:bg-warning/20 disabled:opacity-50 disabled:cursor-not-allowed text-warning rounded-lg transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <RefreshCw size={16} />
              Redémarrer
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onStart}
              disabled={isTransitioning}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-success hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed text-success-foreground rounded-lg transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Play size={16} />
              Démarrer
            </button>
            <button
              onClick={handleDelete}
              disabled={isTransitioning}
              className={`px-3 py-2 rounded-lg transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                showDeleteConfirm
                  ? 'bg-destructive text-destructive-foreground'
                  : 'bg-destructive/10 hover:bg-destructive/20 text-destructive'
              }`}
              title={showDeleteConfirm ? 'Confirmer la suppression' : 'Supprimer'}
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// Create VM Modal
const CreateVmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, os: string, vcpus: number, memory: number, diskSize: number) => void;
}> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [os, setOs] = useState('debian');
  const [vcpus, setVcpus] = useState(2);
  const [memory, setMemory] = useState(2);
  const [diskSize, setDiskSize] = useState(20);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(
        name.trim(),
        os,
        vcpus,
        memory * 1024 * 1024 * 1024, // Convert to bytes
        diskSize * 1024 * 1024 * 1024 // Convert to bytes
      );
      setName('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-xl border border-border shadow-lg p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold text-foreground mb-6">Créer une VM</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Nom de la VM</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ma VM"
              className="w-full px-4 py-2.5 bg-secondary/60 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">Système d'exploitation</label>
            <select
              value={os}
              onChange={(e) => setOs(e.target.value)}
              className="w-full px-4 py-2.5 bg-secondary/60 border border-border rounded-lg text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <option value="debian">Debian</option>
              <option value="ubuntu">Ubuntu</option>
              <option value="alpine">Alpine Linux</option>
              <option value="centos">CentOS</option>
              <option value="windows">Windows</option>
              <option value="other">Autre</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">vCPUs</label>
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-muted-foreground" />
                <select
                  value={vcpus}
                  onChange={(e) => setVcpus(Number(e.target.value))}
                  className="flex-1 px-3 py-2 bg-secondary/60 border border-border rounded-lg text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {[1, 2, 4, 8].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-2">RAM (Go)</label>
              <div className="flex items-center gap-2">
                <MemoryStick size={16} className="text-muted-foreground" />
                <select
                  value={memory}
                  onChange={(e) => setMemory(Number(e.target.value))}
                  className="flex-1 px-3 py-2 bg-secondary/60 border border-border rounded-lg text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {[1, 2, 4, 8, 16].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-2">Disque (Go)</label>
              <div className="flex items-center gap-2">
                <HardDrive size={16} className="text-muted-foreground" />
                <select
                  value={diskSize}
                  onChange={(e) => setDiskSize(Number(e.target.value))}
                  className="flex-1 px-3 py-2 bg-secondary/60 border border-border rounded-lg text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {[10, 20, 50, 100, 200].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-6 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Créer la VM
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface VmsPageProps {
  onBack: () => void;
}

export const VmsPage: React.FC<VmsPageProps> = ({ onBack }) => {
  const {
    vms,
    systemInfo,
    isLoading,
    error,
    fetchVms,
    fetchSystemInfo,
    startVm,
    stopVm
  } = useVmStore();

  // Get capabilities to check VM support
  const { supportsVm, hasLimitedVmSupport, getMaxVms, getModelName } = useCapabilitiesStore();

  // Get permissions from auth store
  const { permissions, freeboxUrl } = useAuthStore();
  const hasVmPermission = permissions.vm === true;

  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch VMs and system info on mount (only if supported)
  useEffect(() => {
    if (supportsVm()) {
      fetchVms();
      fetchSystemInfo();
    }
  }, [fetchVms, fetchSystemInfo, supportsVm]);

  // VM actions
  const handleStartVm = async (id: string) => {
    await startVm(id);
  };

  const handleStopVm = async (id: string) => {
    await stopVm(id);
  };

  const handleRestartVm = async (id: string) => {
    await stopVm(id);
    // Wait a bit then start
    setTimeout(() => startVm(id), 2000);
  };

  const handleOpenConsole = (vm: VM) => {
    // Open VNC console in new tab
    // The actual URL would depend on Freebox API
    window.open(`https://mafreebox.freebox.fr/#Fbx.os.app.vm.app`, '_blank');
  };

  const handleOpenSettings = (vm: VM) => {
    // Open VM settings in Freebox OS
    window.open(`https://mafreebox.freebox.fr/#Fbx.os.app.vm.app`, '_blank');
  };

  const handleDeleteVm = async (id: string) => {
    // Would need to add delete endpoint to vmStore
    console.log('Delete VM:', id);
  };

  const handleCreateVm = (name: string, os: string, vcpus: number, memory: number, diskSize: number) => {
    // Would need to add create endpoint to vmStore
    console.log('Create VM:', { name, os, vcpus, memory, diskSize });
  };

  // Count running VMs
  const runningVms = vms.filter(vm => vm.status === 'running').length;

  // Check if VMs are not supported
  if (!supportsVm()) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-[1920px] mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-accent rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Server size={24} className="text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Machines Virtuelles</h1>
                  <p className="text-sm text-muted-foreground">Non disponible</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-[1920px] mx-auto px-4 py-6 pb-24">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center mb-6">
              <Server size={40} className="text-warning" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">VMs non disponibles</h2>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Les machines virtuelles ne sont pas supportees sur votre modele de Freebox.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Modele detecte : <span className="text-foreground">{getModelName()}</span>
            </p>
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-6 py-3 bg-secondary hover:bg-accent text-foreground rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ChevronLeft size={20} />
              Retour au dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-[1920px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-accent rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Server size={24} className="text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    Machines Virtuelles
                    {hasLimitedVmSupport() && <span className="text-sm font-normal text-muted-foreground ml-2">(max {getMaxVms()})</span>}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {vms.length} VM{vms.length !== 1 ? 's' : ''} • {runningVms} active{runningVms !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Plus size={18} />
              Créer une VM
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto px-4 py-6 pb-24">
        {/* Permission warning */}
        {!hasVmPermission && (
          <PermissionBanner permission="vm" freeboxUrl={freeboxUrl} />
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/50 rounded-xl flex items-center gap-3">
            <AlertCircle className="text-destructive flex-shrink-0" />
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && vms.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="text-primary animate-spin" />
          </div>
        )}

        {/* Global VM System Stats */}
        {systemInfo && (
          <div className="mb-6 p-4 bg-card rounded-xl border border-border shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Ressources VM globales</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Memory */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MemoryStick size={16} className="text-muted-foreground" />
                  <span>Mémoire</span>
                </div>
                <ResourceBar
                  label="RAM"
                  percent={systemInfo.total_memory > 0 ? (systemInfo.used_memory / systemInfo.total_memory) * 100 : 0}
                  text={`${Math.round(systemInfo.used_memory / 1024 * 10) / 10} / ${Math.round(systemInfo.total_memory / 1024 * 10) / 10} Go`}
                  color="bg-success"
                />
              </div>

              {/* CPUs */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Cpu size={16} className="text-muted-foreground" />
                  <span>vCPUs</span>
                </div>
                <ResourceBar
                  label="CPU"
                  percent={systemInfo.total_cpus > 0 ? (systemInfo.used_cpus / systemInfo.total_cpus) * 100 : 0}
                  text={`${systemInfo.used_cpus} / ${systemInfo.total_cpus} alloués`}
                  color="bg-primary"
                />
              </div>

              {/* USB Passthrough */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Power size={16} className="text-muted-foreground" />
                  <span>USB Passthrough</span>
                </div>
                <div className={`text-sm ${systemInfo.usb_used ? 'text-warning' : 'text-muted-foreground'}`}>
                  {systemInfo.usb_used ? 'En cours d\'utilisation' : 'Disponible'}
                </div>
                {systemInfo.usb_ports?.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {systemInfo.usb_ports.length} port(s) USB
                  </div>
                )}
              </div>

              {/* VM Count */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Server size={16} className="text-muted-foreground" />
                  <span>VMs</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {vms.filter(vm => vm.status === 'running').length}
                  <span className="text-sm font-normal text-muted-foreground ml-1">/ {vms.length}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  actives
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VMs Grid */}
        {vms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {vms.map((vm) => (
              <VmCard
                key={vm.id}
                vm={vm}
                onStart={() => handleStartVm(vm.id)}
                onStop={() => handleStopVm(vm.id)}
                onRestart={() => handleRestartVm(vm.id)}
                onConsole={() => handleOpenConsole(vm)}
                onSettings={() => handleOpenSettings(vm)}
                onDelete={() => handleDeleteVm(vm.id)}
              />
            ))}
          </div>
        ) : !isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Server size={64} className="text-muted-foreground mb-6" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Aucune VM</h2>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Vous n'avez pas encore de machine virtuelle. Créez-en une pour commencer à virtualiser vos serveurs.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Plus size={20} />
              Créer ma première VM
            </button>
          </div>
        )}

        {/* Info card */}
        {vms.length > 0 && (
          <div className="mt-8 p-6 bg-card rounded-xl border border-border shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4">Gestion avancée</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Pour des fonctionnalités avancées comme la console VNC, la création d'images ISO,
              ou la configuration réseau détaillée, utilisez l'interface Freebox OS.
            </p>
            <a
              href="https://mafreebox.freebox.fr/#Fbx.os.app.vm.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
            >
              Ouvrir Freebox OS
              <ExternalLink size={14} />
            </a>
          </div>
        )}
      </main>

      {/* Create VM Modal */}
      <CreateVmModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateVm}
      />
    </div>
  );
};

export default VmsPage;
