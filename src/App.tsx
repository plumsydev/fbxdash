import React, { useEffect, useState } from 'react';
import { Header, Footer, type PageType } from './components/layout';
import {
  Card,
  BarChart,
  WifiPanel,
  VmPanel,
  DevicesList,
  FilePanel,
  UptimeGrid,
  SpeedtestWidget,
  HistoryLog
} from './components/widgets';
import { ActionButton, UnsupportedFeature } from './components/ui';
import { LoginModal, TrafficHistoryModal, WifiSettingsModal, CreateVmModal } from './components/modals';
import { TvPage, PhonePage, FilesPage, VmsPage, AnalyticsPage, SettingsPage, NetworkPage } from './pages';
import { usePolling } from './hooks/usePolling';
import { useConnectionWebSocket } from './hooks/useConnectionWebSocket';
import {
  useAuthStore,
  useSystemStore,
  useConnectionStore,
  useWifiStore,
  useLanStore,
  useDownloadsStore,
  useVmStore,
  useHistoryStore
} from './stores';
import { startPermissionsRefresh, stopPermissionsRefresh } from './stores/authStore';
import { useCapabilitiesStore } from './stores/capabilitiesStore';
import { POLLING_INTERVALS, formatSpeed } from './utils/constants';
import {
  MoreHorizontal,
  Calendar,
  Sliders,
  Filter,
  Plus,
  Wifi as WifiIcon,
  HardDrive,
  Server,
  Download,
  History,
  Clock,
  ArrowDownWideNarrow
} from 'lucide-react';

/** Shared page chrome: dark canvas + bottom tab bar, used by every non-dashboard page. */
const PageShell: React.FC<{
  children: React.ReactNode;
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  onReboot: () => void;
  onLogout: () => void;
}> = ({ children, currentPage, onPageChange, onReboot, onLogout }) => (
  <div className="min-h-screen bg-background pb-20 font-sans text-foreground selection:bg-primary/30">
    {children}
    <Footer currentPage={currentPage} onPageChange={onPageChange} onReboot={onReboot} onLogout={onLogout} />
  </div>
);

const filterChipClasses = (active: boolean, tone: 'default' | 'success' | 'info' | 'purple' = 'default') => {
  if (!active) {
    return 'border-border bg-secondary/60 text-muted-foreground hover:bg-accent';
  }
  const tones = {
    default: 'border-border/80 bg-accent text-foreground',
    success: 'border-success/40 bg-success/10 text-success',
    info: 'border-primary/40 bg-primary/10 text-primary',
    purple: 'border-chart-5/40 bg-chart-5/10 text-chart-5'
  } as const;
  return tones[tone];
};

const App: React.FC = () => {
  // Auth state
  const { isLoggedIn, isLoading: authLoading, checkAuth, logout } = useAuthStore();

  // Data stores
  const { info: systemInfo, temperatureHistory: systemTempHistory, fetchSystemInfo, reboot } = useSystemStore();
  const { status: connectionStatus, history: networkHistory, extendedHistory, temperatureHistory, fetchConnectionStatus, fetchExtendedHistory, fetchTemperatureHistory } = useConnectionStore();
  const { networks: wifiNetworks, isLoading: wifiLoading, fetchWifiStatus, toggleBss } = useWifiStore();
  const { devices, fetchDevices } = useLanStore();
  const { tasks: downloads, fetchDownloads } = useDownloadsStore();
  const { vms, isLoading: vmLoading, error: vmError, fetchVms, startVm, stopVm } = useVmStore();
  const { logs: historyLogs, isLoading: historyLoading, fetchHistory } = useHistoryStore();

  // Capabilities store for model-specific features
  const { capabilities, supportsVm, hasLimitedVmSupport, getMaxVms } = useCapabilitiesStore();

  // Local state
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [isTrafficModalOpen, setIsTrafficModalOpen] = useState(false);
  const [isWifiModalOpen, setIsWifiModalOpen] = useState(false);
  const [isCreateVmModalOpen, setIsCreateVmModalOpen] = useState(false);
  const [wifiModalTab, setWifiModalTab] = useState<'filter' | 'planning' | 'wps'>('filter');
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAllDevices, setShowAllDevices] = useState(false);

  // Filters for files/downloads
  const [downloadFilter, setDownloadFilter] = useState<'all' | 'active' | 'done'>('all');
  const [downloadSort, setDownloadSort] = useState<'recent' | 'name' | 'progress'>('recent');

  // Navigation state for FilesPage
  const [filesPageInitialTab, setFilesPageInitialTab] = useState<'files' | 'downloads' | 'shares'>('files');
  const [filesPageInitialDownloadId, setFilesPageInitialDownloadId] = useState<string | undefined>(undefined);

  // Filters for history
  const [historyFilter, setHistoryFilter] = useState<'all' | 'connection' | 'calls' | 'notifications'>('all');
  const [historyPeriod, setHistoryPeriod] = useState<'30d' | '7d' | '24h'>('30d');

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Start/stop periodic permissions refresh based on login state
  useEffect(() => {
    if (isLoggedIn) {
      startPermissionsRefresh();
    } else {
      stopPermissionsRefresh();
    }
    return () => stopPermissionsRefresh();
  }, [isLoggedIn]);

  // WebSocket for real-time connection status (replaces polling)
  useConnectionWebSocket({ enabled: isLoggedIn });

  usePolling(fetchSystemInfo, {
    enabled: isLoggedIn,
    interval: POLLING_INTERVALS.system
  });

  usePolling(fetchWifiStatus, {
    enabled: isLoggedIn,
    interval: POLLING_INTERVALS.wifi
  });

  usePolling(fetchDevices, {
    enabled: isLoggedIn,
    interval: POLLING_INTERVALS.devices
  });

  usePolling(fetchDownloads, {
    enabled: isLoggedIn,
    interval: POLLING_INTERVALS.downloads
  });

  // Only poll VMs if the model supports them
  usePolling(fetchVms, {
    enabled: isLoggedIn && supportsVm(),
    interval: POLLING_INTERVALS.vm
  });

  usePolling(fetchHistory, {
    enabled: isLoggedIn,
    interval: 60000 // Refresh history every minute
  });

  // Current speed values
  const currentDownload = connectionStatus
    ? formatSpeed(connectionStatus.rate_down)
    : '-- kb/s';
  const currentUpload = connectionStatus
    ? formatSpeed(connectionStatus.rate_up)
    : '-- kb/s';

  // Filter devices based on selection
  const filteredDevices = devices.filter(d => {
    if (deviceFilter === 'active') return d.active;
    if (deviceFilter === 'inactive') return !d.active;
    return true;
  });

  // Limit devices shown unless "show all" is enabled
  const displayedDevices = showAllDevices ? filteredDevices : filteredDevices.slice(0, 10);

  // Check if disk is available (for VMs and Downloads)
  const hasDisk = systemInfo?.disk_status === 'active' || systemInfo?.user_main_storage;

  // Filter downloads based on selection
  const filteredDownloads = downloads.filter(d => {
    if (downloadFilter === 'active') return d.status === 'downloading' || d.status === 'seeding' || d.status === 'queued';
    if (downloadFilter === 'done') return d.status === 'done';
    return true;
  }).sort((a, b) => {
    if (downloadSort === 'name') return a.name.localeCompare(b.name);
    if (downloadSort === 'progress') return b.progress - a.progress;
    // 'recent' - keep original order (most recent first from API)
    return 0;
  });

  // Filter history logs based on selection
  const filteredHistoryLogs = historyLogs.filter(log => {
    // Filter by type
    if (historyFilter === 'connection' && !log.id.startsWith('conn-')) return false;
    if (historyFilter === 'calls' && !log.id.startsWith('call-')) return false;
    if (historyFilter === 'notifications' && !log.id.startsWith('notif-')) return false;

    // Filter by period
    if (log.rawTimestamp) {
      const now = Date.now() / 1000;
      const diff = now - log.rawTimestamp;
      if (historyPeriod === '24h' && diff > 86400) return false;
      if (historyPeriod === '7d' && diff > 604800) return false;
      // '30d' - no additional filter needed
    }

    return true;
  });

  const handleReboot = async () => {
    if (confirm('Voulez-vous vraiment redémarrer la Freebox ?')) {
      await reboot();
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleVmToggle = async (id: string, start: boolean) => {
    if (start) {
      await startVm(id);
    } else {
      await stopVm(id);
    }
  };

  const handleWifiToggle = async (bssId: string, enabled: boolean) => {
    await toggleBss(bssId, enabled);
  };

  const handlePageChange = (page: PageType) => {
    setCurrentPage(page);
  };

  // Show login modal if not logged in
  if (!authLoading && !isLoggedIn) {
    return (
      <div className="min-h-screen bg-background">
        <LoginModal isOpen={true} />
      </div>
    );
  }

  const shellProps = {
    currentPage,
    onPageChange: handlePageChange,
    onReboot: handleReboot,
    onLogout: handleLogout
  };

  const goToDashboard = () => setCurrentPage('dashboard');

  switch (currentPage) {
    case 'network':
      return (
        <PageShell {...shellProps}>
          <NetworkPage onBack={goToDashboard} />
        </PageShell>
      );
    case 'tv':
      return (
        <PageShell {...shellProps}>
          <TvPage onBack={goToDashboard} />
        </PageShell>
      );
    case 'phone':
      return (
        <PageShell {...shellProps}>
          <PhonePage onBack={goToDashboard} />
        </PageShell>
      );
    case 'files':
      return (
        <PageShell {...shellProps}>
          <FilesPage
            onBack={() => {
              goToDashboard();
              setFilesPageInitialTab('files');
              setFilesPageInitialDownloadId(undefined);
            }}
            initialTab={filesPageInitialTab}
            initialDownloadId={filesPageInitialDownloadId}
          />
        </PageShell>
      );
    case 'vms':
      return (
        <PageShell {...shellProps}>
          <VmsPage onBack={goToDashboard} />
        </PageShell>
      );
    case 'analytics':
      return (
        <PageShell {...shellProps}>
          <AnalyticsPage onBack={goToDashboard} />
        </PageShell>
      );
    case 'settings':
      return (
        <PageShell {...shellProps}>
          <SettingsPage onBack={goToDashboard} />
        </PageShell>
      );
  }

  // Dashboard (default)
  return (
    <div className="min-h-screen bg-background pb-20 font-sans text-foreground selection:bg-primary/30">
      <Header systemInfo={systemInfo} connectionStatus={connectionStatus} />

      <main className="mx-auto max-w-[1920px] p-4 md:p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">

          {/* Column 1 - État de la Freebox */}
          <div className="flex flex-col gap-6">
            <Card
              title="État de la Freebox"
              actions={
                <ActionButton
                  label="Voir plus"
                  icon={MoreHorizontal}
                  onClick={() => setIsTrafficModalOpen(true)}
                />
              }
            >
              <div className="flex flex-col gap-4">
                <BarChart
                  data={networkHistory}
                  dataKey="download"
                  color="hsl(var(--chart-1))"
                  title="Descendant en temps réel"
                  currentValue={currentDownload.split(' ')[0]}
                  unit={currentDownload.split(' ')[1] || 'kb/s'}
                  trend="down"
                />
                <BarChart
                  data={networkHistory}
                  dataKey="upload"
                  color="hsl(var(--chart-2))"
                  title="Montant en temps réel"
                  currentValue={currentUpload.split(' ')[0]}
                  unit={currentUpload.split(' ')[1] || 'kb/s'}
                  trend="up"
                />
              </div>
            </Card>

            <Card title="Test de débits">
              <SpeedtestWidget
                downloadSpeed={undefined}
                uploadSpeed={undefined}
                ping={undefined}
                jitter={undefined}
                downloadHistory={[]}
                uploadHistory={[]}
              />
              <p className="mt-2 text-center text-xs text-muted-foreground">
                L'API Freebox ne permet pas de lancer des tests de débit via l'API.
                Utilisez l'interface Freebox OS pour effectuer un test.
              </p>
            </Card>

            <Card
              title="Uptime"
              actions={
                <button className="flex items-center gap-1 rounded-lg border border-border bg-secondary/60 px-2 py-1 text-xs text-muted-foreground">
                  <Calendar size={12} /> 30J
                </button>
              }
            >
              {systemInfo ? (
                <UptimeGrid
                  uptimeSeconds={systemInfo.uptime_val}
                />
              ) : (
                <div className="py-4 text-center text-muted-foreground">
                  Chargement...
                </div>
              )}
            </Card>
          </div>

          {/* Column 2 - WiFi & Local */}
          <div className="flex flex-col gap-6">
            <Card
              title="Wifi"
              actions={
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  <ActionButton label="Filtrage" icon={Sliders} onClick={() => { setWifiModalTab('filter'); setIsWifiModalOpen(true); }} />
                  <ActionButton label="Planif." icon={Calendar} onClick={() => { setWifiModalTab('planning'); setIsWifiModalOpen(true); }} />
                  <ActionButton label="WPS" icon={WifiIcon} onClick={() => { setWifiModalTab('wps'); setIsWifiModalOpen(true); }} />
                </div>
              }
            >
              {wifiLoading ? (
                <div className="py-4 text-center text-muted-foreground">Chargement...</div>
              ) : wifiNetworks.length > 0 ? (
                <WifiPanel networks={wifiNetworks} onToggle={handleWifiToggle} />
              ) : (
                <div className="py-4 text-center text-muted-foreground">
                  Aucun réseau WiFi configuré
                </div>
              )}
            </Card>

            <Card
              title="Local"
              actions={
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeviceFilter(deviceFilter === 'active' ? 'all' : 'active')}
                    className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${filterChipClasses(deviceFilter === 'active', 'success')}`}
                  >
                    <Filter size={12} /> Actifs
                  </button>
                  <button
                    onClick={() => setDeviceFilter(deviceFilter === 'inactive' ? 'all' : 'inactive')}
                    className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${filterChipClasses(deviceFilter === 'inactive')}`}
                  >
                    <Filter size={12} /> Hors-ligne
                  </button>
                </div>
              }
              className="flex-grow"
            >
              <DevicesList devices={displayedDevices} />
              {filteredDevices.length > 10 && !showAllDevices && (
                <button
                  onClick={() => setShowAllDevices(true)}
                  className="mt-2 w-full py-2 text-xs text-primary transition-colors hover:text-primary/80"
                >
                  Afficher tous les appareils ({filteredDevices.length})
                </button>
              )}
              {showAllDevices && filteredDevices.length > 10 && (
                <button
                  onClick={() => setShowAllDevices(false)}
                  className="mt-2 w-full py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Réduire la liste
                </button>
              )}
            </Card>
          </div>

          {/* Column 3 - VMs & Fichiers */}
          <div className="flex flex-col gap-6">
            <Card
              title={hasLimitedVmSupport() ? `VMs (max ${getMaxVms()})` : "VMs"}
              actions={supportsVm() && hasDisk && !vmError ? <ActionButton label="Créer" icon={Plus} onClick={() => setIsCreateVmModalOpen(true)} /> : undefined}
            >
              {!supportsVm() ? (
                <UnsupportedFeature
                  feature="Machines Virtuelles"
                  featureType="vm"
                />
              ) : !hasDisk ? (
                <div className="py-8 text-center">
                  <Server size={32} className="mx-auto mb-2 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">Aucun disque détecté</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Connectez un disque dur pour utiliser les VMs
                  </p>
                </div>
              ) : vmLoading ? (
                <div className="py-4 text-center text-muted-foreground">Chargement...</div>
              ) : vmError ? (
                <div className="py-8 text-center">
                  <Server size={32} className="mx-auto mb-2 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">VMs non disponibles</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Cette fonctionnalité n'est pas supportée sur votre modèle
                  </p>
                </div>
              ) : vms.length > 0 ? (
                <VmPanel vms={vms} onToggle={handleVmToggle} />
              ) : (
                <div className="py-8 text-center">
                  <Server size={32} className="mx-auto mb-2 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">Aucune VM configurée</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Créez une VM pour commencer
                  </p>
                </div>
              )}
            </Card>

            <Card
              title="Téléchargements"
              onTitleClick={() => {
                setFilesPageInitialTab('downloads');
                setFilesPageInitialDownloadId(undefined);
                setCurrentPage('files');
              }}
              actions={
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const next = downloadFilter === 'all' ? 'active' : downloadFilter === 'active' ? 'done' : 'all';
                      setDownloadFilter(next);
                    }}
                    className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${filterChipClasses(downloadFilter !== 'all', 'info')}`}
                  >
                    <Filter size={12} />
                    {downloadFilter === 'all' ? 'Tous' : downloadFilter === 'active' ? 'En cours' : 'Terminés'}
                  </button>
                  <button
                    onClick={() => {
                      const next = downloadSort === 'recent' ? 'name' : downloadSort === 'name' ? 'progress' : 'recent';
                      setDownloadSort(next);
                    }}
                    className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${filterChipClasses(downloadSort !== 'recent', 'info')}`}
                  >
                    <ArrowDownWideNarrow size={12} />
                    {downloadSort === 'recent' ? 'Récent' : downloadSort === 'name' ? 'Nom' : 'Progression'}
                  </button>
                </div>
              }
              className="flex-grow"
            >
              {!hasDisk ? (
                <div className="py-8 text-center">
                  <HardDrive size={32} className="mx-auto mb-2 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">Aucun disque détecté</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Connectez un disque dur pour télécharger des fichiers
                  </p>
                </div>
              ) : filteredDownloads.length > 0 ? (
                <FilePanel
                  tasks={filteredDownloads}
                  onTaskClick={(task) => {
                    setFilesPageInitialTab('downloads');
                    setFilesPageInitialDownloadId(task.id);
                    setCurrentPage('files');
                  }}
                />
              ) : downloads.length > 0 ? (
                <div className="py-8 text-center">
                  <Download size={32} className="mx-auto mb-2 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">Aucun téléchargement correspondant</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Modifiez les filtres pour voir plus de résultats
                  </p>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Download size={32} className="mx-auto mb-2 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">Aucun téléchargement</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Ajoutez un fichier pour commencer
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Column 4 - Historique */}
          <div className="flex flex-col gap-6">
            <Card
              title="Historique"
              actions={
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const next = historyFilter === 'all' ? 'connection' : historyFilter === 'connection' ? 'calls' : historyFilter === 'calls' ? 'notifications' : 'all';
                      setHistoryFilter(next);
                    }}
                    className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${filterChipClasses(historyFilter !== 'all', 'purple')}`}
                  >
                    <Filter size={12} />
                    {historyFilter === 'all' ? 'Toutes' : historyFilter === 'connection' ? 'Connexion' : historyFilter === 'calls' ? 'Appels' : 'Notifs'}
                  </button>
                  <button
                    onClick={() => {
                      const next = historyPeriod === '30d' ? '7d' : historyPeriod === '7d' ? '24h' : '30d';
                      setHistoryPeriod(next);
                    }}
                    className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${filterChipClasses(historyPeriod !== '30d', 'purple')}`}
                  >
                    <Clock size={12} />
                    {historyPeriod === '30d' ? '30J' : historyPeriod === '7d' ? '7J' : '24H'}
                  </button>
                </div>
              }
              className="h-full"
            >
              {historyLoading ? (
                <div className="py-4 text-center text-muted-foreground">Chargement...</div>
              ) : filteredHistoryLogs.length > 0 ? (
                <HistoryLog logs={filteredHistoryLogs} />
              ) : historyLogs.length > 0 ? (
                <div className="py-8 text-center">
                  <History size={32} className="mx-auto mb-2 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">Aucun événement correspondant</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Modifiez les filtres pour voir plus de résultats
                  </p>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <History size={32} className="mx-auto mb-2 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">Aucun événement récent</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Les logs de connexion et appels apparaîtront ici
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Traffic History Modal */}
        <TrafficHistoryModal
          isOpen={isTrafficModalOpen}
          onClose={() => setIsTrafficModalOpen(false)}
          data={extendedHistory.length > 0 ? extendedHistory : undefined}
          temperatureData={temperatureHistory}
          systemInfo={systemInfo}
          connectionStatus={connectionStatus}
          onFetchHistory={() => {
            fetchExtendedHistory();
            fetchTemperatureHistory();
          }}
        />

        {/* WiFi Settings Modal */}
        <WifiSettingsModal
          isOpen={isWifiModalOpen}
          onClose={() => setIsWifiModalOpen(false)}
          initialTab={wifiModalTab}
        />

        {/* Create VM Modal */}
        <CreateVmModal
          isOpen={isCreateVmModalOpen}
          onClose={() => setIsCreateVmModalOpen(false)}
        />
      </main>

      <Footer
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onReboot={handleReboot}
        onLogout={handleLogout}
      />
    </div>
  );
};

export default App;
