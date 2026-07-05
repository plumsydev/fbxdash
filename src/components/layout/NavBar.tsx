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
import { Tooltip } from '../ui/Tooltip';

export type PageType = 'dashboard' | 'network' | 'tv' | 'phone' | 'files' | 'vms' | 'analytics' | 'settings';

interface NavBarProps {
  currentPage?: PageType;
  onPageChange?: (page: PageType) => void;
  onReboot?: () => void;
  onLogout?: () => void;
}

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

/** Top navigation strip: flat underline tabs, not rounded pill buttons. */
export const NavBar: React.FC<NavBarProps> = ({
  currentPage = 'dashboard',
  onPageChange,
  onReboot,
  onLogout
}) => {
  const { capabilities } = useCapabilitiesStore();

  const visibleTabs = useMemo(() => {
    return allTabs.filter(tab => {
      if (tab.id === 'vms' && capabilities?.vmSupport === 'none') {
        return false;
      }
      return true;
    });
  }, [capabilities?.vmSupport]);

  return (
    <nav className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-[1920px] items-stretch justify-between px-2">
        <div className="no-scrollbar flex items-stretch overflow-x-auto">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentPage === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onPageChange?.(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 pl-2">
          <Tooltip content="Redémarrer">
            <button
              onClick={onReboot}
              className="flex h-9 w-9 items-center justify-center rounded border border-transparent text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            >
              <Power size={16} />
            </button>
          </Tooltip>
          <Tooltip content="Déconnexion">
            <button
              onClick={onLogout}
              className="flex h-9 w-9 items-center justify-center rounded border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground"
            >
              <LogOut size={16} />
            </button>
          </Tooltip>
        </div>
      </div>
    </nav>
  );
};
