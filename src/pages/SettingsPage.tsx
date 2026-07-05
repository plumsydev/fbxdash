import React, { useEffect, useState } from 'react';
import {
  Settings,
  Wifi,
  Network,
  HardDrive,
  Shield,
  Server,
  Monitor,
  ChevronLeft,
  AlertCircle,
  Save,
  RefreshCw,
  Globe,
  Lock,
  Power,
  Clock,
  Users,
  Share2,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Lightbulb
} from 'lucide-react';
import { api } from '../api/client';
import { API_ROUTES } from '../utils/constants';
import { ParentalControlModal } from '../components/modals/ParentalControlModal';
import { PortForwardingModal } from '../components/modals/PortForwardingModal';
import { VpnModal } from '../components/modals/VpnModal';
import { RebootScheduleModal } from '../components/modals/RebootScheduleModal';
import { useLanStore } from '../stores/lanStore';
import { useAuthStore } from '../stores/authStore';
import { useSystemStore } from '../stores/systemStore';
import { getPermissionErrorMessage, getPermissionShortError, getFreeboxSettingsUrl } from '../utils/permissions';
import {
  Toggle,
  Button,
  Badge,
  Loader,
  Separator,
  Input,
  Label,
  Dialog,
  DialogHeader,
  DialogContent,
  DialogFooter
} from '../components/ui';

interface SettingsPageProps {
  onBack: () => void;
}

type SettingsTab = 'network' | 'wifi' | 'dhcp' | 'storage' | 'security' | 'system';

// Setting row component
const SettingRow: React.FC<{
  label: string;
  description?: string;
  children: React.ReactNode;
}> = ({ label, description, children }) => (
  <div className="flex items-center justify-between py-4 border-b border-border last:border-b-0">
    <div className="flex-1">
      <h4 className="text-sm font-medium text-foreground">{label}</h4>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
    <div className="ml-4">{children}</div>
  </div>
);

// Section component
const Section: React.FC<{
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  permissionError?: string | null;
  freeboxSettingsUrl?: string | null;
}> = ({ title, icon: Icon, children, permissionError, freeboxSettingsUrl }) => (
  <div className={`bg-card rounded-xl border border-border overflow-hidden ${permissionError ? 'opacity-60' : ''}`}>
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon size={18} className="text-muted-foreground" />
      <h3 className="font-medium text-card-foreground">{title}</h3>
    </div>
    <Separator />
    {permissionError && (
      <div className="px-4 py-3 bg-warning/10 border-b border-warning/30">
        <p className="text-warning text-xs">
          {permissionError}
          {freeboxSettingsUrl && (
            <>
              {' '}
              <a
                href={freeboxSettingsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-warning underline hover:text-warning/80"
              >
                Ouvrir les paramètres Freebox
                <ExternalLink size={12} />
              </a>
            </>
          )}
        </p>
      </div>
    )}
    <div className={`px-4 ${permissionError ? 'pointer-events-none' : ''}`}>{children}</div>
  </div>
);

export const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('network');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [showParentalModal, setShowParentalModal] = useState(false);
  const [showFirewallModal, setShowFirewallModal] = useState(false);
  const [showVpnModal, setShowVpnModal] = useState(false);
  const [showRebootScheduleModal, setShowRebootScheduleModal] = useState(false);

  // Get devices from LAN store for parental control
  const { devices } = useLanStore();
  const { reboot } = useSystemStore();

  // Get permissions and freebox URL from auth store
  const { permissions, freeboxUrl } = useAuthStore();

  // Helper to check if a permission is granted (defaults to false if not present)
  const hasPermission = (permission: keyof typeof permissions): boolean => {
    return permissions[permission] === true;
  };

  // Connection settings
  const [connectionConfig, setConnectionConfig] = useState<{
    remote_access: boolean;
    remote_access_port: number;
    ping: boolean;
    wol: boolean;
    adblock: boolean;
  } | null>(null);

  // Original config for diff comparison
  const [originalConnectionConfig, setOriginalConnectionConfig] = useState<typeof connectionConfig>(null);

  // DHCP settings
  const [dhcpConfig, setDhcpConfig] = useState<{
    enabled: boolean;
    ip_range_start: string;
    ip_range_end: string;
    netmask: string;
    gateway: string;
    dns: string[];  // Array of DNS servers
    sticky_assign: boolean;
    always_broadcast: boolean;
  } | null>(null);

  // DHCP static leases
  const [staticLeases, setStaticLeases] = useState<Array<{
    id: string;
    mac: string;
    ip: string;
    comment: string;
    hostname?: string;
  }>>([]);
  const [showLeaseModal, setShowLeaseModal] = useState(false);
  const [editingLease, setEditingLease] = useState<{
    id?: string;
    mac: string;
    ip: string;
    comment: string;
  } | null>(null);

  // FTP settings
  const [ftpConfig, setFtpConfig] = useState<{
    enabled: boolean;
    allow_anonymous: boolean;
    allow_anonymous_write: boolean;
    port_ctrl: number;
  } | null>(null);

  // LCD settings (includes LED strip for Ultra 25 ans edition)
  const [lcdConfig, setLcdConfig] = useState<{
    brightness: number;
    orientation: number;
    orientation_forced: boolean;
    hide_wifi_key?: boolean;
    hide_status_led?: boolean;
    // LED Strip (Ultra 25 ans edition only)
    led_strip_enabled?: boolean;
    led_strip_brightness?: number;
    led_strip_animation?: string;
    available_led_strip_animations?: string[];
  } | null>(null);

  // WiFi planning
  const [wifiPlanning, setWifiPlanning] = useState<{
    enabled: boolean;
  } | null>(null);

  // Parental control profiles
  const [parentalProfiles, setParentalProfiles] = useState<Array<{
    id: number;
    name: string;
  }>>([]);

  // Port forwarding rules (firewall)
  const [portForwardingRules, setPortForwardingRules] = useState<Array<{
    id: number;
    enabled: boolean;
    comment?: string;
    lan_port: number;
    wan_port_start: number;
    wan_port_end?: number;
    lan_ip: string;
    ip_proto: string;
  }>>([]);

  // VPN server config
  const [vpnServerConfig, setVpnServerConfig] = useState<{
    enabled: boolean;
  } | null>(null);

  const [vpnUsers, setVpnUsers] = useState<Array<{
    login: string;
    ip_reservation?: string;
  }>>([]);

  // Fetch settings based on active tab
  useEffect(() => {
    fetchSettings();
  }, [activeTab]);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      switch (activeTab) {
        case 'network': {
          const response = await api.get<typeof connectionConfig>(API_ROUTES.CONNECTION_CONFIG);
          if (response.success && response.result) {
            setConnectionConfig(response.result);
            setOriginalConnectionConfig(response.result);
          }
          break;
        }
        case 'dhcp': {
          const response = await api.get<typeof dhcpConfig>(API_ROUTES.SETTINGS_DHCP);
          if (response.success && response.result) {
            setDhcpConfig(response.result);
          }
          // Fetch static leases
          const leasesResponse = await api.get<typeof staticLeases>(API_ROUTES.DHCP_STATIC_LEASES);
          if (leasesResponse.success && leasesResponse.result) {
            setStaticLeases(Array.isArray(leasesResponse.result) ? leasesResponse.result : []);
          }
          break;
        }
        case 'storage': {
          const response = await api.get<typeof ftpConfig>(API_ROUTES.SETTINGS_FTP);
          if (response.success && response.result) {
            setFtpConfig(response.result);
          }
          break;
        }
        case 'system': {
          const response = await api.get<typeof lcdConfig>(API_ROUTES.SETTINGS_LCD);
          if (response.success && response.result) {
            setLcdConfig(response.result);
          }
          break;
        }
        case 'wifi': {
          const response = await api.get<typeof wifiPlanning>(API_ROUTES.WIFI_PLANNING);
          if (response.success && response.result) {
            setWifiPlanning(response.result);
          }
          break;
        }
        case 'security': {
          // Fetch parental profiles
          try {
            const profilesRes = await api.get<Array<{ id: number; name: string }>>(API_ROUTES.PROFILES);
            if (profilesRes.success && profilesRes.result) {
              setParentalProfiles(profilesRes.result);
            }
          } catch {
            // Silently fail - parental control may not be available
          }

          // Fetch port forwarding rules
          try {
            const natRes = await api.get<Array<typeof portForwardingRules[0]>>(`${API_ROUTES.SETTINGS_NAT}/redirections`);
            if (natRes.success && natRes.result) {
              setPortForwardingRules(natRes.result);
            }
          } catch {
            // Silently fail - NAT may not be available
          }

          // Fetch VPN server config
          try {
            const vpnRes = await api.get<{ enabled: boolean }>(API_ROUTES.SETTINGS_VPN_SERVER);
            if (vpnRes.success && vpnRes.result) {
              setVpnServerConfig(vpnRes.result);
            }
          } catch {
            // Silently fail - VPN may not be available
          }

          // Fetch VPN users
          try {
            const vpnUsersRes = await api.get<Array<{ login: string; ip_reservation?: string }>>(`${API_ROUTES.SETTINGS_VPN_SERVER.replace('/server', '/users')}`);
            if (vpnUsersRes.success && vpnUsersRes.result) {
              setVpnUsers(vpnUsersRes.result);
            }
          } catch {
            // Silently fail
          }
          break;
        }
      }
    } catch {
      setError('Erreur lors du chargement des paramètres');
    } finally {
      setIsLoading(false);
    }
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const saveConnectionConfig = async () => {
    if (!connectionConfig || !originalConnectionConfig) return;

    // Build payload with only modified fields
    const changedFields: Partial<typeof connectionConfig> = {};
    for (const key of Object.keys(connectionConfig) as Array<keyof typeof connectionConfig>) {
      if (connectionConfig[key] !== originalConnectionConfig[key]) {
        changedFields[key] = connectionConfig[key] as never;
      }
    }

    // If nothing changed, don't send request
    if (Object.keys(changedFields).length === 0) {
      showSuccess('Aucune modification à enregistrer');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.put(API_ROUTES.CONNECTION_CONFIG, changedFields);
      if (response.success) {
        showSuccess('Paramètres réseau enregistrés');
        // Update original config to reflect saved state
        setOriginalConnectionConfig({ ...connectionConfig });
      } else {
        setError(response.error?.message || 'Erreur lors de la sauvegarde');
      }
    } catch {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  const saveDhcpConfig = async () => {
    if (!dhcpConfig) return;
    setIsLoading(true);
    try {
      const response = await api.put(API_ROUTES.SETTINGS_DHCP, dhcpConfig);
      if (response.success) {
        showSuccess('Paramètres DHCP enregistrés');
      } else {
        setError(response.error?.message || 'Erreur lors de la sauvegarde');
      }
    } catch {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  // DHCP Static Leases management
  const addStaticLease = () => {
    setEditingLease({ mac: '', ip: '', comment: '' });
    setShowLeaseModal(true);
  };

  const editStaticLease = (lease: typeof staticLeases[0]) => {
    setEditingLease({ id: lease.id, mac: lease.mac, ip: lease.ip, comment: lease.comment });
    setShowLeaseModal(true);
  };

  const saveStaticLease = async () => {
    if (!editingLease) return;
    setIsLoading(true);
    try {
      let response;
      if (editingLease.id) {
        // Update existing lease
        response = await api.put(`${API_ROUTES.DHCP_STATIC_LEASES}/${editingLease.id}`, {
          mac: editingLease.mac,
          ip: editingLease.ip,
          comment: editingLease.comment
        });
      } else {
        // Create new lease
        response = await api.post(API_ROUTES.DHCP_STATIC_LEASES, {
          mac: editingLease.mac,
          ip: editingLease.ip,
          comment: editingLease.comment
        });
      }

      if (response.success) {
        showSuccess(editingLease.id ? 'Bail statique modifié' : 'Bail statique ajouté');
        setShowLeaseModal(false);
        setEditingLease(null);
        // Refresh leases
        fetchSettings();
      } else {
        setError(response.error?.message || 'Erreur lors de la sauvegarde');
      }
    } catch {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteStaticLease = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce bail statique ?')) return;
    setIsLoading(true);
    try {
      const response = await api.delete(`${API_ROUTES.DHCP_STATIC_LEASES}/${id}`);
      if (response.success) {
        showSuccess('Bail statique supprimé');
        // Refresh leases
        fetchSettings();
      } else {
        setError(response.error?.message || 'Erreur lors de la suppression');
      }
    } catch {
      setError('Erreur lors de la suppression');
    } finally {
      setIsLoading(false);
    }
  };

  const saveFtpConfig = async () => {
    if (!ftpConfig) return;
    setIsLoading(true);
    try {
      const response = await api.put(API_ROUTES.SETTINGS_FTP, ftpConfig);
      if (response.success) {
        showSuccess('Paramètres FTP enregistrés');
      } else {
        setError(response.error?.message || 'Erreur lors de la sauvegarde');
      }
    } catch {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  const saveLcdConfig = async () => {
    if (!lcdConfig) return;
    setIsLoading(true);
    try {
      const response = await api.put(API_ROUTES.SETTINGS_LCD, lcdConfig);
      if (response.success) {
        showSuccess('Paramètres écran enregistrés');
      } else {
        setError(response.error?.message || 'Erreur lors de la sauvegarde');
      }
    } catch {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  const saveWifiPlanning = async () => {
    if (!wifiPlanning) return;
    setIsLoading(true);
    try {
      const response = await api.put(API_ROUTES.WIFI_PLANNING, wifiPlanning);
      if (response.success) {
        showSuccess('Planification WiFi enregistrée');
      } else {
        setError(response.error?.message || 'Erreur lors de la sauvegarde');
      }
    } catch {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReboot = async () => {
    if (confirm('Êtes-vous sûr de vouloir redémarrer la Freebox ?')) {
      setIsLoading(true);
      const success = await reboot();
      setIsLoading(false);

      if (success) {
        showSuccess('Redémarrage en cours...');
      } else {
        setError('Échec du redémarrage');
      }
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'network', label: 'Réseau', icon: Globe },
    { id: 'wifi', label: 'WiFi', icon: Wifi },
    { id: 'dhcp', label: 'DHCP', icon: Network },
    { id: 'storage', label: 'Stockage', icon: HardDrive },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'system', label: 'Système', icon: Server }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
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
                <div className="p-2 bg-secondary rounded-lg">
                  <Settings size={24} className="text-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Paramètres</h1>
                  <p className="text-sm text-muted-foreground">Configuration de la Freebox</p>
                </div>
              </div>
            </div>

            <button
              onClick={fetchSettings}
              className="p-2 hover:bg-accent rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              title="Actualiser"
            >
              <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto px-4 py-6 pb-24">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  activeTab === tab.id
                    ? 'bg-secondary border-border text-foreground'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'
                }`}
              >
                <Icon size={16} />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Success message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-success/10 border border-success/30 border-l-4 border-l-success rounded flex items-center gap-3">
            <Save className="text-success" size={18} />
            <p className="text-success">{successMessage}</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 border-l-4 border-l-destructive rounded flex items-center gap-3">
            <AlertCircle className="text-destructive" />
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader size="lg" />
          </div>
        )}

        {/* Network settings */}
        {!isLoading && activeTab === 'network' && connectionConfig && (
          <div className="space-y-6">
            <Section title="Accès distant" icon={Globe} permissionError={!hasPermission('settings') ? getPermissionErrorMessage('settings') : null} freeboxSettingsUrl={!hasPermission('settings') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
              <SettingRow
                label="Accès distant"
                description="Permet l'accès à la Freebox depuis Internet"
              >
                <Toggle
                  checked={connectionConfig.remote_access}
                  onChange={(v) => setConnectionConfig({ ...connectionConfig, remote_access: v })}
                />
              </SettingRow>
              <SettingRow
                label="Port d'accès distant"
                description="Port HTTP pour l'accès distant à la Freebox"
              >
                <Input
                  type="number"
                  value={connectionConfig.remote_access_port}
                  onChange={(e) => setConnectionConfig({ ...connectionConfig, remote_access_port: parseInt(e.target.value) })}
                  className="w-24 font-data"
                />
              </SettingRow>
            </Section>

            <Section title="Options réseau" icon={Network} permissionError={!hasPermission('settings') ? getPermissionErrorMessage('settings') : null} freeboxSettingsUrl={!hasPermission('settings') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
              <SettingRow
                label="Réponse au ping"
                description="Répond aux requêtes ping depuis Internet"
              >
                <Toggle
                  checked={connectionConfig.ping}
                  onChange={(v) => setConnectionConfig({ ...connectionConfig, ping: v })}
                />
              </SettingRow>
              <SettingRow
                label="Wake on LAN"
                description="Permet de réveiller les appareils depuis Internet"
              >
                <Toggle
                  checked={connectionConfig.wol}
                  onChange={(v) => setConnectionConfig({ ...connectionConfig, wol: v })}
                />
              </SettingRow>
              <SettingRow
                label="Blocage de publicités"
                description="Active le blocage DNS des publicités"
              >
                <Toggle
                  checked={connectionConfig.adblock}
                  onChange={(v) => setConnectionConfig({ ...connectionConfig, adblock: v })}
                />
              </SettingRow>
            </Section>

            <Button
              icon={Save}
              variant="primary"
              onClick={saveConnectionConfig}
              disabled={!hasPermission('settings')}
            >
              Enregistrer
            </Button>
          </div>
        )}

        {/* WiFi settings */}
        {!isLoading && activeTab === 'wifi' && (
          <div className="space-y-6">
            <Section title="Planification WiFi" icon={Clock} permissionError={!hasPermission('settings') ? getPermissionErrorMessage('settings') : null} freeboxSettingsUrl={!hasPermission('settings') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
              <SettingRow
                label="Planification active"
                description="Active les horaires d'extinction automatique du WiFi"
              >
                <Toggle
                  checked={wifiPlanning?.enabled || false}
                  onChange={(v) => setWifiPlanning({ ...wifiPlanning, enabled: v })}
                />
              </SettingRow>
              <div className="py-4 text-sm text-muted-foreground">
                <p>Configurez les plages horaires dans l'interface détaillée.</p>
                <p className="mt-2">Le WiFi peut être automatiquement désactivé la nuit pour économiser l'énergie.</p>
              </div>
            </Section>

            <Section title="Filtrage MAC" icon={Shield} permissionError={!hasPermission('settings') ? getPermissionErrorMessage('settings') : null} freeboxSettingsUrl={!hasPermission('settings') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
              <div className="py-4 text-sm text-muted-foreground">
                <p>Le filtrage MAC permet de restreindre l'accès au WiFi à des appareils spécifiques.</p>
                <p className="mt-2">Mode liste blanche : seuls les appareils autorisés peuvent se connecter.</p>
                <p>Mode liste noire : les appareils listés sont bloqués.</p>
              </div>
            </Section>

            {wifiPlanning && (
              <Button
                icon={Save}
                variant="primary"
                onClick={saveWifiPlanning}
                disabled={!hasPermission('settings')}
              >
                Enregistrer
              </Button>
            )}
          </div>
        )}

        {/* DHCP settings */}
        {!isLoading && activeTab === 'dhcp' && dhcpConfig && (
          <div className="space-y-6">
            <Section title="Serveur DHCP" icon={Network} permissionError={!hasPermission('settings') ? getPermissionErrorMessage('settings') : null} freeboxSettingsUrl={!hasPermission('settings') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
              <SettingRow
                label="DHCP activé"
                description="Attribution automatique des adresses IP"
              >
                <Toggle
                  checked={dhcpConfig.enabled}
                  onChange={(v) => setDhcpConfig({ ...dhcpConfig, enabled: v })}
                />
              </SettingRow>
              <SettingRow label="Début de plage IP">
                <Input
                  type="text"
                  value={dhcpConfig.ip_range_start}
                  onChange={(e) => setDhcpConfig({ ...dhcpConfig, ip_range_start: e.target.value })}
                  className="w-40 font-data"
                />
              </SettingRow>
              <SettingRow label="Fin de plage IP">
                <Input
                  type="text"
                  value={dhcpConfig.ip_range_end}
                  onChange={(e) => setDhcpConfig({ ...dhcpConfig, ip_range_end: e.target.value })}
                  className="w-40 font-data"
                />
              </SettingRow>
              <SettingRow
                label="Serveurs DNS"
                description="Serveurs DNS distribués aux clients DHCP"
              >
                <div className="flex flex-col gap-2">
                  {(dhcpConfig.dns || []).map((dns, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={dns}
                        onChange={(e) => {
                          const newDns = [...(dhcpConfig.dns || [])];
                          newDns[index] = e.target.value;
                          setDhcpConfig({ ...dhcpConfig, dns: newDns });
                        }}
                        placeholder="192.168.1.254"
                        className="w-40 font-data"
                      />
                      <Button
                        icon={Trash2}
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newDns = (dhcpConfig.dns || []).filter((_, i) => i !== index);
                          setDhcpConfig({ ...dhcpConfig, dns: newDns });
                        }}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      />
                    </div>
                  ))}
                  {(dhcpConfig.dns || []).length < 3 && (
                    <Button
                      icon={Plus}
                      variant="default"
                      size="sm"
                      onClick={() => {
                        const newDns = [...(dhcpConfig.dns || []), ''];
                        setDhcpConfig({ ...dhcpConfig, dns: newDns });
                      }}
                      className="w-fit"
                    >
                      Ajouter DNS
                    </Button>
                  )}
                </div>
              </SettingRow>
              <SettingRow
                label="Attribution persistante"
                description="Conserver l'attribution IP entre les redémarrages"
              >
                <Toggle
                  checked={dhcpConfig.sticky_assign}
                  onChange={(v) => setDhcpConfig({ ...dhcpConfig, sticky_assign: v })}
                />
              </SettingRow>
            </Section>

            <Button
              icon={Save}
              variant="primary"
              onClick={saveDhcpConfig}
              disabled={!hasPermission('settings')}
            >
              Enregistrer
            </Button>

            {/* Static Leases Section */}
            <Section title="Baux DHCP statiques" icon={Network} permissionError={!hasPermission('settings') ? getPermissionErrorMessage('settings') : null} freeboxSettingsUrl={!hasPermission('settings') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
              <div className="flex items-center justify-between py-3">
                <span className="text-xs text-muted-foreground">(<span className="font-data">{staticLeases.length}</span> bail{staticLeases.length !== 1 ? 'x' : ''})</span>
                <Button
                  icon={Plus}
                  variant="primary"
                  size="sm"
                  onClick={addStaticLease}
                  disabled={!hasPermission('settings')}
                >
                  Ajouter
                </Button>
              </div>
              <div className="overflow-x-auto">
                {staticLeases.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-secondary/40 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Adresse MAC</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">IP</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Commentaire</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Hostname</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {staticLeases.map((lease) => (
                        <tr key={lease.id} className="hover:bg-accent/50 transition-colors">
                          <td className="px-4 py-3 text-sm font-data text-foreground">{lease.mac}</td>
                          <td className="px-4 py-3 text-sm font-data text-foreground">{lease.ip}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{lease.comment || '-'}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{lease.hostname || '-'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                icon={Edit2}
                                variant="ghost"
                                size="sm"
                                onClick={() => editStaticLease(lease)}
                                className="text-primary hover:bg-primary/10 hover:text-primary"
                              />
                              <Button
                                icon={Trash2}
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteStaticLease(lease.id)}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <Network size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucun bail statique configuré</p>
                    <p className="text-xs mt-1">Cliquez sur "Ajouter" pour en créer un</p>
                  </div>
                )}
              </div>
            </Section>
          </div>
        )}

        {/* Storage (FTP) settings */}
        {!isLoading && activeTab === 'storage' && ftpConfig && (
          <div className="space-y-6">
            <Section title="Serveur FTP" icon={Share2} permissionError={!hasPermission('settings') ? getPermissionErrorMessage('settings') : null} freeboxSettingsUrl={!hasPermission('settings') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
              <SettingRow
                label="FTP activé"
                description="Permet l'accès aux fichiers via FTP"
              >
                <Toggle
                  checked={ftpConfig.enabled}
                  onChange={(v) => setFtpConfig({ ...ftpConfig, enabled: v })}
                />
              </SettingRow>
              <SettingRow
                label="Accès anonyme"
                description="Permet l'accès sans authentification"
              >
                <Toggle
                  checked={ftpConfig.allow_anonymous}
                  onChange={(v) => setFtpConfig({ ...ftpConfig, allow_anonymous: v })}
                />
              </SettingRow>
              <SettingRow
                label="Écriture anonyme"
                description="Permet aux anonymes de créer/modifier des fichiers"
              >
                <Toggle
                  checked={ftpConfig.allow_anonymous_write}
                  onChange={(v) => setFtpConfig({ ...ftpConfig, allow_anonymous_write: v })}
                />
              </SettingRow>
              <SettingRow label="Port FTP">
                <Input
                  type="number"
                  value={ftpConfig.port_ctrl}
                  onChange={(e) => setFtpConfig({ ...ftpConfig, port_ctrl: parseInt(e.target.value) })}
                  className="w-24 font-data"
                />
              </SettingRow>
            </Section>

            <Button
              icon={Save}
              variant="primary"
              onClick={saveFtpConfig}
              disabled={!hasPermission('settings')}
            >
              Enregistrer
            </Button>
          </div>
        )}

        {/* Security settings */}
        {!isLoading && activeTab === 'security' && (
          <div className="space-y-6">
            <Section title="Contrôle parental" icon={Users} permissionError={!hasPermission('parental') ? getPermissionErrorMessage('parental') : null} freeboxSettingsUrl={!hasPermission('parental') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
              <SettingRow
                label="Règles de filtrage"
                description="Règles de contrôle parental pour limiter l'accès Internet"
              >
                <Button
                  icon={ExternalLink}
                  variant="primary"
                  size="sm"
                  onClick={() => setShowParentalModal(true)}
                  disabled={!hasPermission('parental')}
                >
                  Gérer
                </Button>
              </SettingRow>
              {parentalProfiles.length > 0 && (
                <div className="py-2 space-y-2">
                  {parentalProfiles.map((profile) => (
                    <div key={profile.id} className="flex items-center justify-between p-3 bg-secondary/60 rounded-lg">
                      <span className="text-sm text-foreground">{profile.name}</span>
                      <span className="text-xs text-muted-foreground">ID: {profile.id}</span>
                    </div>
                  ))}
                </div>
              )}
              {parentalProfiles.length === 0 && (
                <div className="py-4 text-sm text-muted-foreground">
                  <p>Cliquez sur "Gérer" pour configurer les règles de contrôle parental.</p>
                  <p className="mt-2">Limitez l'accès Internet pour certains appareils par horaires ou de façon permanente.</p>
                </div>
              )}
            </Section>

            <Section title="Pare-feu - Redirection de ports" icon={Shield} permissionError={!hasPermission('settings') ? getPermissionErrorMessage('settings') : null} freeboxSettingsUrl={!hasPermission('settings') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
              <SettingRow
                label="Règles actives"
                description="Redirections de ports configurées sur la Freebox"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="success" className="font-data">
                    {portForwardingRules.filter(r => r.enabled).length} / {portForwardingRules.length}
                  </Badge>
                  <Button
                    icon={ExternalLink}
                    variant="primary"
                    size="sm"
                    onClick={() => setShowFirewallModal(true)}
                    disabled={!hasPermission('settings')}
                  >
                    Gérer
                  </Button>
                </div>
              </SettingRow>
              {portForwardingRules.length > 0 && (
                <div className="py-2 space-y-2">
                  {portForwardingRules.slice(0, 5).map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between p-3 bg-secondary/60 rounded-lg">
                      <div className="flex-1">
                        <span className="text-sm text-foreground">{rule.comment || `Port ${rule.wan_port_start}`}</span>
                        <p className="text-xs text-muted-foreground mt-0.5 font-data">
                          {rule.ip_proto.toUpperCase()} {rule.wan_port_start}{rule.wan_port_end ? `-${rule.wan_port_end}` : ''} → {rule.lan_ip}:{rule.lan_port}
                        </p>
                      </div>
                      <Badge variant={rule.enabled ? 'success' : 'default'}>
                        {rule.enabled ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                  ))}
                  {portForwardingRules.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      + {portForwardingRules.length - 5} autres règles
                    </p>
                  )}
                </div>
              )}
              {portForwardingRules.length === 0 && (
                <div className="py-4 text-sm text-muted-foreground">
                  <p>Aucune redirection de port configurée.</p>
                  <p className="mt-2">Les redirections permettent d'exposer des services internes sur Internet.</p>
                </div>
              )}
            </Section>

            <Section title="Serveur VPN" icon={Lock} permissionError={!hasPermission('settings') ? getPermissionErrorMessage('settings') : null} freeboxSettingsUrl={!hasPermission('settings') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
              <SettingRow
                label="Serveur VPN"
                description="Permet de se connecter au réseau local depuis l'extérieur"
              >
                <div className="flex items-center gap-3">
                  <Badge variant={vpnServerConfig?.enabled ? 'success' : 'default'}>
                    {vpnServerConfig?.enabled ? 'Activé' : 'Désactivé'}
                  </Badge>
                  <Button
                    icon={ExternalLink}
                    variant="primary"
                    size="sm"
                    onClick={() => setShowVpnModal(true)}
                    disabled={!hasPermission('settings')}
                  >
                    Gérer
                  </Button>
                </div>
              </SettingRow>
              {vpnUsers.length > 0 && (
                <SettingRow
                  label="Utilisateurs VPN"
                  description="Comptes configurés pour l'accès VPN"
                >
                  <Badge variant="info">
                    <span className="font-data">{vpnUsers.length}</span> utilisateur{vpnUsers.length !== 1 ? 's' : ''}
                  </Badge>
                </SettingRow>
              )}
              {vpnUsers.length > 0 && (
                <div className="py-2 space-y-2">
                  {vpnUsers.map((user) => (
                    <div key={user.login} className="flex items-center justify-between p-3 bg-secondary/60 rounded-lg">
                      <span className="text-sm text-foreground">{user.login}</span>
                      {user.ip_reservation && (
                        <span className="text-xs text-muted-foreground font-data">{user.ip_reservation}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!vpnServerConfig && vpnUsers.length === 0 && (
                <div className="py-4 text-sm text-muted-foreground">
                  <p>Le serveur VPN n'est pas configuré.</p>
                  <p className="mt-2">Protocoles supportés : OpenVPN, WireGuard, PPTP.</p>
                </div>
              )}
            </Section>
          </div>
        )}

        {/* System settings */}
        {!isLoading && activeTab === 'system' && lcdConfig && (
          <div className="space-y-6">
            <Section title="Écran LCD" icon={Monitor} permissionError={!hasPermission('settings') ? getPermissionErrorMessage('settings') : null} freeboxSettingsUrl={!hasPermission('settings') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
              <SettingRow label="Luminosité">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={lcdConfig.brightness}
                    onChange={(e) => setLcdConfig({ ...lcdConfig, brightness: parseInt(e.target.value) })}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground w-12">{lcdConfig.brightness}%</span>
                </div>
              </SettingRow>
              <SettingRow label="Orientation">
                <select
                  value={lcdConfig.orientation}
                  onChange={(e) => setLcdConfig({ ...lcdConfig, orientation: parseInt(e.target.value) })}
                  className="px-3 py-1.5 bg-secondary/50 border border-input rounded-lg text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                >
                  <option value={0}>Normal</option>
                  <option value={90}>90°</option>
                  <option value={180}>180°</option>
                  <option value={270}>270°</option>
                </select>
              </SettingRow>
              <SettingRow
                label="Forcer l'orientation"
                description="Empêche la rotation automatique"
              >
                <Toggle
                  checked={lcdConfig.orientation_forced}
                  onChange={(v) => setLcdConfig({ ...lcdConfig, orientation_forced: v })}
                />
              </SettingRow>
            </Section>

            {/* LED Strip section - Only shown for Ultra 25 ans edition */}
            {lcdConfig.led_strip_enabled !== undefined && (
              <Section title="Bandeau LED" icon={Lightbulb} permissionError={!hasPermission('settings') ? getPermissionErrorMessage('settings') : null} freeboxSettingsUrl={!hasPermission('settings') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
                <SettingRow
                  label="Bandeau LED activé"
                  description="Active ou désactive le bandeau LED"
                >
                  <Toggle
                    checked={lcdConfig.led_strip_enabled ?? false}
                    onChange={(v) => setLcdConfig({ ...lcdConfig, led_strip_enabled: v })}
                  />
                </SettingRow>
                {lcdConfig.led_strip_enabled && (
                  <>
                    <SettingRow label="Luminosité LED">
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={lcdConfig.led_strip_brightness ?? 50}
                          onChange={(e) => setLcdConfig({ ...lcdConfig, led_strip_brightness: parseInt(e.target.value) })}
                          className="w-32"
                        />
                        <span className="text-sm text-muted-foreground w-12">{lcdConfig.led_strip_brightness ?? 50}%</span>
                      </div>
                    </SettingRow>
                    <SettingRow label="Animation">
                      <select
                        value={lcdConfig.led_strip_animation ?? 'breathing'}
                        onChange={(e) => setLcdConfig({ ...lcdConfig, led_strip_animation: e.target.value })}
                        className="px-3 py-1.5 bg-secondary/50 border border-input rounded-lg text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                      >
                        {(lcdConfig.available_led_strip_animations || ['organic', 'static', 'breathing', 'rain', 'trail', 'wave']).map((anim) => (
                          <option key={anim} value={anim}>
                            {anim.charAt(0).toUpperCase() + anim.slice(1)}
                          </option>
                        ))}
                      </select>
                    </SettingRow>
                  </>
                )}
              </Section>
            )}

            <Section title="Actions système" icon={Power} permissionError={!hasPermission('settings') ? getPermissionErrorMessage('settings') : null} freeboxSettingsUrl={!hasPermission('settings') ? getFreeboxSettingsUrl(freeboxUrl) : null}>
              <div className="py-4 space-y-3">
                <button
                  onClick={handleReboot}
                  disabled={!hasPermission('settings')}
                  className={`w-full flex items-center justify-between px-4 py-3 bg-secondary/60 hover:bg-accent border border-border rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${!hasPermission('settings') ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="text-sm text-foreground">Redémarrer la Freebox</span>
                  <Power size={16} className="text-warning" />
                </button>
                <button
                  onClick={() => setShowRebootScheduleModal(true)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-secondary/60 hover:bg-accent border border-border rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <span className="text-sm text-foreground">Programmer le redémarrage</span>
                  <Calendar size={16} className="text-primary" />
                </button>
                <p className="text-xs text-muted-foreground px-1">
                  Le redémarrage prend environ 2-3 minutes. Toutes les connexions seront interrompues.
                </p>
              </div>
            </Section>

            <Button
              icon={Save}
              variant="primary"
              onClick={saveLcdConfig}
              disabled={!hasPermission('settings')}
            >
              Enregistrer
            </Button>
          </div>
        )}

        {/* No disk placeholder for some tabs */}
        {!isLoading && (activeTab === 'network' && !connectionConfig) && (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertCircle size={48} className="text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Paramètres non disponibles</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Impossible de charger les paramètres. Vérifiez que vous êtes connecté à la Freebox.
            </p>
          </div>
        )}

        {!isLoading && (activeTab === 'dhcp' && !dhcpConfig) && (
          <div className="flex flex-col items-center justify-center py-16">
            <Network size={48} className="text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">DHCP non disponible</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Impossible de charger la configuration DHCP.
            </p>
          </div>
        )}

        {!isLoading && (activeTab === 'storage' && !ftpConfig) && (
          <div className="flex flex-col items-center justify-center py-16">
            <HardDrive size={48} className="text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Stockage non disponible</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Aucun disque n'est connecté à la Freebox.
            </p>
          </div>
        )}

        {!isLoading && (activeTab === 'system' && !lcdConfig) && (
          <div className="flex flex-col items-center justify-center py-16">
            <Monitor size={48} className="text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Paramètres système</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Impossible de charger les paramètres de l'écran LCD.
            </p>
          </div>
        )}
      </main>

      {/* Parental Control Modal */}
      <ParentalControlModal
        isOpen={showParentalModal}
        onClose={() => setShowParentalModal(false)}
        devices={devices}
      />

      {/* Port Forwarding Modal */}
      <PortForwardingModal
        isOpen={showFirewallModal}
        onClose={() => setShowFirewallModal(false)}
        devices={devices}
      />

      {/* VPN Modal */}
      <VpnModal
        isOpen={showVpnModal}
        onClose={() => setShowVpnModal(false)}
      />

      {/* Reboot Schedule Modal */}
      <RebootScheduleModal
        isOpen={showRebootScheduleModal}
        onClose={() => setShowRebootScheduleModal(false)}
      />

      {/* DHCP Static Lease Modal */}
      {showLeaseModal && editingLease && (
        <Dialog
          open={showLeaseModal}
          onClose={() => {
            setShowLeaseModal(false);
            setEditingLease(null);
          }}
        >
          <DialogHeader
            title={`${editingLease.id ? 'Modifier' : 'Ajouter'} un bail statique`}
            onClose={() => {
              setShowLeaseModal(false);
              setEditingLease(null);
            }}
          />
          <DialogContent>
            <div>
              <Label className="block mb-2">Adresse MAC *</Label>
              <Input
                type="text"
                value={editingLease.mac}
                onChange={(e) => setEditingLease({ ...editingLease, mac: e.target.value })}
                placeholder="AA:BB:CC:DD:EE:FF"
                className="font-data"
              />
              <p className="text-xs text-muted-foreground mt-1">Format: XX:XX:XX:XX:XX:XX</p>
            </div>

            <div>
              <Label className="block mb-2">Adresse IP *</Label>
              <Input
                type="text"
                value={editingLease.ip}
                onChange={(e) => setEditingLease({ ...editingLease, ip: e.target.value })}
                placeholder="192.168.1.100"
                className="font-data"
              />
              <p className="text-xs text-muted-foreground mt-1">Doit être dans la plage DHCP</p>
            </div>

            <div>
              <Label className="block mb-2">Commentaire</Label>
              <Input
                type="text"
                value={editingLease.comment}
                onChange={(e) => setEditingLease({ ...editingLease, comment: e.target.value })}
                placeholder="Ex: PC Bureau, NAS, Imprimante..."
              />
            </div>
          </DialogContent>

          <DialogFooter>
            <Button
              variant="default"
              onClick={() => {
                setShowLeaseModal(false);
                setEditingLease(null);
              }}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={saveStaticLease}
              disabled={!editingLease.mac || !editingLease.ip || isLoading}
            >
              {isLoading ? <Loader size="sm" /> : <Save size={16} />}
              {editingLease.id ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
};

export default SettingsPage;
