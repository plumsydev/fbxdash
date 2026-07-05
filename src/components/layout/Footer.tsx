import React, { useMemo } from 'react';
import {
  Settings,
  Tv,
  Phone,
  BarChart2,
  Folder,
  Server,
  Power,
  LogOut,
  Home,
  Network
} from 'lucide-react';
import { useCapabilitiesStore } from '../../stores/capabilitiesStore';

export type PageType = 'dashboard' | 'network' | 'tv' | 'phone' | 'files' | 'vms' | 'analytics' | 'settings';

interface FooterProps {
  currentPage?: PageType;
  onPageChange?: (page: PageType) => void;
  onReboot?: () => void;
  onLogout?: () => void;
}

// Internal pages (handled within the dashboard)
const allTabs: { id: PageType; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Accueil', icon: Home },
  { id: 'network', label: 'Réseau', icon: Network },
  { id: 'tv', label: 'Télévision', icon: Tv },
  { id: 'phone', label: 'Téléphone', icon: Phone },
  { id: 'files', label: 'Fichiers', icon: Folder },
  { id: 'vms', label: 'VMs', icon: Server },
  { id: 'analytics', label: 'Analytique', icon: BarChart2 },
  { id: 'settings', label: 'Paramètres', icon: Settings }
];

export const Footer: React.FC<FooterProps> = ({
  currentPage = 'dashboard',
  onPageChange,
  onReboot,
  onLogout
}) => {
  const { capabilities } = useCapabilitiesStore();

  // Filter tabs based on capabilities
  // Only hide VMs tab for models that explicitly don't support VMs (Pop, Revolution)
  // Show VMs tab by default if capabilities not yet loaded
  const visibleTabs = useMemo(() => {
    return allTabs.filter(tab => {
      // Hide VMs tab only if we know the model doesn't support VMs
      if (tab.id === 'vms' && capabilities?.vmSupport === 'none') {
        return false;
      }
      return true;
    });
  }, [capabilities?.vmSupport]);

  const handleTabClick = (tabId: PageType) => {
    onPageChange?.(tabId);
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/90 p-3 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1920px] items-center justify-between px-2">
        {/* Navigation tabs */}
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentPage === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-all ${
                  isActive
                    ? 'border-border bg-accent text-foreground'
                    : 'border-transparent bg-secondary/40 text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                }`}
              >
                <Icon size={18} />
                <span className="whitespace-nowrap text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pl-4">
          <button
            onClick={onReboot}
            className="flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-4 py-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Power size={18} />
            <span className="hidden text-sm font-medium sm:inline">Reboot</span>
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-4 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut size={18} />
            <span className="hidden text-sm font-medium sm:inline">Déconnexion</span>
          </button>
        </div>
      </div>
    </footer>
  );
};