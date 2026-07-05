import React, { useState } from 'react';
import { Server, Cpu, HardDrive, AlertTriangle } from 'lucide-react';
import { useVmStore } from '../../stores';
import { Dialog, DialogHeader, DialogContent, DialogFooter, Button, Input, Label, Loader } from '../ui';

interface CreateVmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OS_OPTIONS = [
  { value: 'debian', label: 'Debian', icon: '🐧' },
  { value: 'ubuntu', label: 'Ubuntu', icon: '🟠' },
  { value: 'alpine', label: 'Alpine Linux', icon: '🏔️' },
  { value: 'fedora', label: 'Fedora', icon: '🎩' },
  { value: 'centos', label: 'CentOS', icon: '🔴' },
  { value: 'windows', label: 'Windows', icon: '🪟' },
  { value: 'other', label: 'Autre', icon: '💻' }
];

const RAM_OPTIONS = [
  { value: 512, label: '512 Mo' },
  { value: 1024, label: '1 Go' },
  { value: 2048, label: '2 Go' },
  { value: 4096, label: '4 Go' },
  { value: 8192, label: '8 Go' },
  { value: 16384, label: '16 Go' }
];

const CPU_OPTIONS = [
  { value: 1, label: '1 vCPU' },
  { value: 2, label: '2 vCPUs' },
  { value: 4, label: '4 vCPUs' },
  { value: 8, label: '8 vCPUs' }
];

export const CreateVmModal: React.FC<CreateVmModalProps> = ({ isOpen, onClose }) => {
  const { createVm, isLoading, error } = useVmStore();

  const [name, setName] = useState('');
  const [os, setOs] = useState('debian');
  const [memory, setMemory] = useState(2048);
  const [vcpus, setVcpus] = useState(2);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError('Le nom de la VM est requis');
      return;
    }

    if (name.length < 2 || name.length > 32) {
      setLocalError('Le nom doit contenir entre 2 et 32 caractères');
      return;
    }

    const success = await createVm({
      name: name.trim(),
      os,
      memory,
      vcpus,
      disk_type: 'qcow2',
      enable_screen: true
    });

    if (success) {
      setName('');
      setOs('debian');
      setMemory(2048);
      setVcpus(2);
      onClose();
    }
  };

  const displayError = localError || error;

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <DialogHeader
          title="Créer une VM"
          description="Configuration de la machine virtuelle"
          icon={<Server size={20} className="text-primary" />}
          onClose={onClose}
        />

        <DialogContent>
          {displayError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle size={16} />
              {displayError}
            </div>
          )}

          {/* Name */}
          <div>
            <Label className="mb-2 block">Nom de la VM</Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ma-vm"
              disabled={isLoading}
            />
          </div>

          {/* OS Selection */}
          <div>
            <Label className="mb-2 block">Système d'exploitation</Label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {OS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setOs(option.value)}
                  className={`rounded-lg border p-2 text-center transition-colors sm:p-3 ${
                    os === option.value
                      ? 'border-primary bg-primary/20 text-foreground'
                      : 'border-border bg-secondary/60 text-muted-foreground hover:border-accent'
                  }`}
                  disabled={isLoading}
                >
                  <span className="mb-1 block text-lg sm:text-xl">{option.icon}</span>
                  <span className="text-[10px] sm:text-xs">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* RAM */}
          <div>
            <Label className="mb-2 flex items-center gap-2">
              <Cpu size={14} />
              Mémoire RAM
            </Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {RAM_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMemory(option.value)}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                    memory === option.value
                      ? 'border-success bg-success/20 text-success'
                      : 'border-border bg-secondary/60 text-muted-foreground hover:border-accent'
                  }`}
                  disabled={isLoading}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* vCPUs */}
          <div>
            <Label className="mb-2 flex items-center gap-2">
              <HardDrive size={14} />
              Processeurs virtuels
            </Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CPU_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setVcpus(option.value)}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                    vcpus === option.value
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-border bg-secondary/60 text-muted-foreground hover:border-accent'
                  }`}
                  disabled={isLoading}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg border border-border bg-secondary/60 p-4">
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">Récapitulatif</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">OS</span>
                <p className="font-medium text-foreground">{OS_OPTIONS.find(o => o.value === os)?.label}</p>
              </div>
              <div>
                <span className="text-muted-foreground">RAM</span>
                <p className="font-medium text-foreground">{RAM_OPTIONS.find(r => r.value === memory)?.label}</p>
              </div>
              <div>
                <span className="text-muted-foreground">CPU</span>
                <p className="font-medium text-foreground">{vcpus} vCPU{vcpus > 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>
        </DialogContent>

        <DialogFooter>
          <Button type="button" onClick={onClose} disabled={isLoading} className="flex-1 justify-center">
            Annuler
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading} className="flex-1 justify-center">
            {isLoading ? (
              <>
                <Loader size="sm" />
                Création...
              </>
            ) : (
              <>
                <Server size={18} />
                Créer la VM
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};
