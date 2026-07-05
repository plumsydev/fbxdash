import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Clock, Wifi, Loader2, Check, AlertTriangle, Save, Plus, Trash2, ExternalLink, Timer, Users, Link2 } from 'lucide-react';
import { api } from '../../api/client';
import { API_ROUTES } from '../../utils/constants';
import { useAuthStore } from '../../stores/authStore';
import { useSystemStore } from '../../stores';
import { getPermissionErrorMessage, getFreeboxSettingsUrl } from '../../utils/permissions';
import { useWifiStore } from '../../stores/wifiStore';
import { Dialog, DialogHeader, DialogContent, Button, Toggle, Badge, Input, Label } from '../ui';

interface WifiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'filter' | 'planning' | 'wps' | 'temp-disable' | 'guest' | 'mlo';
}

type TabType = 'filter' | 'planning' | 'wps' | 'temp-disable' | 'guest' | 'mlo';

interface MacFilterRule {
  mac: string;
  comment?: string;
  type?: 'whitelist' | 'blacklist';
}

interface WifiPlanning {
  enabled: boolean;
  // 24x7 grid: each bit represents 1 hour slot
  // planning is a hex string representing 168 bits (21 bytes)
  planning?: string;
}

// Days of the week in French (starting from Monday for display)
const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
// Hours for display
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Convert hex string to boolean grid (7 days x 24 hours)
const hexToGrid = (hexString: string | undefined): boolean[][] => {
  const grid: boolean[][] = Array.from({ length: 7 }, () => Array(24).fill(true));

  if (!hexString) return grid;

  try {
    // Convert hex to binary string
    let binary = '';
    for (let i = 0; i < hexString.length; i++) {
      const byte = parseInt(hexString[i], 16);
      binary += byte.toString(2).padStart(4, '0');
    }

    // Fill grid from binary (168 bits = 7 days * 24 hours)
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const bitIndex = day * 24 + hour;
        if (bitIndex < binary.length) {
          grid[day][hour] = binary[bitIndex] === '1';
        }
      }
    }
  } catch {
    // Return default grid on error
  }

  return grid;
};

// Convert boolean grid back to hex string
const gridToHex = (grid: boolean[][]): string => {
  let binary = '';

  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      binary += grid[day]?.[hour] ? '1' : '0';
    }
  }

  // Pad to 168 bits (42 hex chars)
  while (binary.length < 168) {
    binary += '1';
  }

  // Convert binary to hex
  let hex = '';
  for (let i = 0; i < binary.length; i += 4) {
    const nibble = binary.substring(i, i + 4);
    hex += parseInt(nibble, 2).toString(16);
  }

  return hex;
};

export const WifiSettingsModal: React.FC<WifiSettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'filter'
}) => {
  // Get permissions from auth store
  const { permissions, freeboxUrl } = useAuthStore();
  const hasSettingsPermission = permissions.settings === true;

  // Get system info to check model (MLO only available on Ultra/v9)
  const { info: systemInfo } = useSystemStore();
  // Ultra is fbxgw9 (v9) - check board_name (fbxgw9r) or box_model_name (Freebox v9)
  const isUltraModel =
    systemInfo?.board_name?.toLowerCase().includes('fbxgw9') ||
    systemInfo?.box_model_name?.toLowerCase().includes('v9') ||
    systemInfo?.box_model_name?.toLowerCase().includes('ultra');

  // Get WiFi store for v13/v14 features
  const {
    tempDisableStatus,
    guestConfig,
    mloConfig,
    fetchTempDisableStatus,
    setTempDisable,
    cancelTempDisable,
    fetchGuestConfig,
    updateGuestConfig,
    fetchMloConfig,
    updateMloConfig
  } = useWifiStore();

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // MAC Filter state
  const [macFilterRules, setMacFilterRules] = useState<MacFilterRule[]>([]);
  const [macFilterEnabled, setMacFilterEnabled] = useState(false);
  const [macFilterMode, setMacFilterMode] = useState<'whitelist' | 'blacklist'>('blacklist');
  const [newMacAddress, setNewMacAddress] = useState('');
  const [newMacComment, setNewMacComment] = useState('');
  const [savingMacFilter, setSavingMacFilter] = useState(false);

  // Planning state
  const [planning, setPlanning] = useState<WifiPlanning | null>(null);
  const [planningGrid, setPlanningGrid] = useState<boolean[][]>(() =>
    Array.from({ length: 7 }, () => Array(24).fill(true))
  );
  const [planningModified, setPlanningModified] = useState(false);
  const [savingPlanning, setSavingPlanning] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // v13+ Temp Disable state
  const [tempDisableDuration, setTempDisableDuration] = useState(30); // minutes
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // v14+ Guest Network state
  const [guestSsid, setGuestSsid] = useState('');
  const [guestKey, setGuestKey] = useState('');
  const [savingGuest, setSavingGuest] = useState(false);

  // v14+ MLO state
  const [savingMlo, setSavingMlo] = useState(false);


  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'filter') fetchMacFilter();
      if (activeTab === 'planning') fetchPlanning();
      if (activeTab === 'temp-disable') fetchTempDisableStatus();
      if (activeTab === 'guest') fetchGuestConfig();
      if (activeTab === 'mlo') fetchMloConfig();
    }
  }, [isOpen, activeTab, fetchTempDisableStatus, fetchGuestConfig, fetchMloConfig]);

  // Sync guest config to local state
  useEffect(() => {
    if (guestConfig) {
      setGuestSsid(guestConfig.ssid || '');
      setGuestKey(guestConfig.key || '');
    }
  }, [guestConfig]);

  // Countdown timer for temp disable
  useEffect(() => {
    if (tempDisableStatus?.enabled && tempDisableStatus.remaining_time && tempDisableStatus.remaining_time > 0) {
      setCountdown(tempDisableStatus.remaining_time);
    } else {
      setCountdown(null);
    }
  }, [tempDisableStatus]);

  // Countdown interval
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            fetchTempDisableStatus();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [countdown, fetchTempDisableStatus]);

  // Format countdown display
  const formatCountdown = useCallback((seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
    return `${s}s`;
  }, []);

  // Handle temp disable
  const handleTempDisable = async () => {
    setLoading(true);
    const success = await setTempDisable(tempDisableDuration * 60);
    if (success) {
      setSuccessMessage('WiFi désactivé temporairement');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
    setLoading(false);
  };

  // Handle cancel temp disable
  const handleCancelTempDisable = async () => {
    setLoading(true);
    const success = await cancelTempDisable();
    if (success) {
      setSuccessMessage('Désactivation annulée');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
    setLoading(false);
  };

  // Handle guest config save
  const handleSaveGuestConfig = async () => {
    setSavingGuest(true);
    const success = await updateGuestConfig({
      ssid: guestSsid,
      key: guestKey
    });
    if (success) {
      setSuccessMessage('Configuration invité enregistrée');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
    setSavingGuest(false);
  };

  // Handle MLO toggle
  const handleToggleMlo = async (enabled: boolean) => {
    setSavingMlo(true);
    const success = await updateMloConfig({ enabled });
    if (success) {
      setSuccessMessage(`MLO ${enabled ? 'activé' : 'désactivé'}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
    setSavingMlo(false);
  };

  const fetchMacFilter = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ enabled: boolean; rules?: MacFilterRule[] }>(API_ROUTES.WIFI_MAC_FILTER);
      if (response.success && response.result) {
        setMacFilterEnabled(response.result.enabled);
        setMacFilterRules(response.result.rules || []);
      } else {
        // Silently fail - may not be available
        setMacFilterEnabled(false);
        setMacFilterRules([]);
      }
    } catch {
      // Silently fail
      setMacFilterEnabled(false);
      setMacFilterRules([]);
    }
    setLoading(false);
  };

  const fetchPlanning = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<WifiPlanning>(API_ROUTES.WIFI_PLANNING);
      if (response.success && response.result) {
        setPlanning(response.result);
        // Parse planning string to grid
        if (response.result.planning) {
          setPlanningGrid(hexToGrid(response.result.planning));
        }
        setPlanningModified(false);
      } else {
        setPlanning({ enabled: false });
      }
    } catch {
      setPlanning({ enabled: false });
    }
    setLoading(false);
  };

  const togglePlanningEnabled = async (enabled: boolean) => {
    if (!planning) return;
    setSavingPlanning(true);
    setError(null);
    try {
      const response = await api.put<WifiPlanning>(API_ROUTES.WIFI_PLANNING, {
        ...planning,
        enabled
      });
      if (response.success && response.result) {
        setPlanning(response.result);
        setSuccessMessage('Planification ' + (enabled ? 'activée' : 'désactivée'));
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.error?.message || 'Erreur lors de la mise à jour');
      }
    } catch {
      setError('Erreur lors de la mise à jour');
    }
    setSavingPlanning(false);
  };

  const toggleGridCell = (day: number, hour: number) => {
    setPlanningGrid(prev => {
      const newGrid = prev.map(row => [...row]);
      newGrid[day][hour] = !newGrid[day][hour];
      return newGrid;
    });
    setPlanningModified(true);
  };

  const toggleRow = (day: number) => {
    setPlanningGrid(prev => {
      const newGrid = prev.map(row => [...row]);
      const allEnabled = newGrid[day].every(v => v);
      newGrid[day] = newGrid[day].map(() => !allEnabled);
      return newGrid;
    });
    setPlanningModified(true);
  };

  const toggleColumn = (hour: number) => {
    setPlanningGrid(prev => {
      const newGrid = prev.map(row => [...row]);
      const allEnabled = newGrid.every(row => row[hour]);
      for (let d = 0; d < 7; d++) {
        newGrid[d][hour] = !allEnabled;
      }
      return newGrid;
    });
    setPlanningModified(true);
  };

  const savePlanning = async () => {
    if (!planning) return;
    setSavingPlanning(true);
    setError(null);
    try {
      const planningHex = gridToHex(planningGrid);
      const response = await api.put<WifiPlanning>(API_ROUTES.WIFI_PLANNING, {
        ...planning,
        planning: planningHex
      });
      if (response.success && response.result) {
        setPlanning(response.result);
        setPlanningModified(false);
        setSuccessMessage('Planification enregistrée');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.error?.message || 'Erreur lors de la sauvegarde');
      }
    } catch {
      setError('Erreur lors de la sauvegarde');
    }
    setSavingPlanning(false);
  };

  const setAllGrid = (enabled: boolean) => {
    setPlanningGrid(Array.from({ length: 7 }, () => Array(24).fill(enabled)));
    setPlanningModified(true);
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'temp-disable', label: 'Pause', icon: <Timer size={16} /> },
    { id: 'guest', label: 'Invité', icon: <Users size={16} /> },
    // MLO tab - only visible on Freebox Ultra (WiFi 7)
    ...(isUltraModel ? [{ id: 'mlo' as TabType, label: 'MLO', icon: <Link2 size={16} /> }] : []),
    { id: 'filter', label: 'Filtrage', icon: <Shield size={16} /> },
    { id: 'planning', label: 'Planning', icon: <Clock size={16} /> },
    { id: 'wps', label: 'WPS', icon: <Wifi size={16} /> }
  ];

  return (
    <Dialog open={isOpen} onClose={onClose} className="max-w-3xl">
      <DialogHeader
        title="Paramètres WiFi"
        description="Configuration avancée du réseau sans fil"
        icon={<Wifi size={18} className="text-primary" />}
        onClose={onClose}
      />

      {/* Tabs - scrollable on mobile */}
      <div className="flex gap-1 overflow-x-auto border-b border-border bg-secondary/40 px-3 py-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-border bg-accent text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-accent/50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <DialogContent>
        {/* Permission warning */}
        {!hasSettingsPermission && (
          <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-warning flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-warning text-sm">{getPermissionErrorMessage('settings')}</p>
                <a
                  href={getFreeboxSettingsUrl(freeboxUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-warning hover:text-warning/80 text-sm underline"
                >
                  Ouvrir les paramètres Freebox
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm flex items-center gap-2">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="text-primary animate-spin" />
          </div>
        ) : (
          <>
              {/* Temp Disable Tab (v13+) */}
              {activeTab === 'temp-disable' && (
                <div className="space-y-4">
                  {/* Status card */}
                  <div className="p-6 bg-secondary/60 rounded-xl border border-border text-center">
                    <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
                      countdown !== null ? 'bg-destructive/20' : 'bg-muted'
                    }`}>
                      <Timer size={40} className={countdown !== null ? 'text-destructive' : 'text-muted-foreground'} />
                    </div>

                    {countdown !== null ? (
                      <>
                        <h3 className="text-lg font-medium text-destructive mb-2">
                          WiFi désactivé temporairement
                        </h3>
                        <div className="text-4xl font-bold text-foreground mb-4 font-mono">
                          {formatCountdown(countdown)}
                        </div>
                        <Button
                          variant="primary"
                          size="md"
                          onClick={handleCancelTempDisable}
                          className="bg-success border-success text-success-foreground hover:bg-success/90"
                        >
                          Réactiver maintenant
                        </Button>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-medium text-foreground mb-2">
                          Désactivation temporaire
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6">
                          Désactive le WiFi pendant une durée définie, puis le réactive automatiquement
                        </p>

                        {/* Duration selector */}
                        <div className="flex items-center justify-center gap-4 mb-6">
                          <Label>Durée :</Label>
                          <select
                            value={tempDisableDuration}
                            onChange={(e) => setTempDisableDuration(parseInt(e.target.value))}
                            className="px-4 py-2 bg-secondary/50 border border-input rounded-lg text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          >
                            <option value={5}>5 minutes</option>
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={60}>1 heure</option>
                            <option value={120}>2 heures</option>
                            <option value={240}>4 heures</option>
                            <option value={480}>8 heures</option>
                          </select>
                        </div>

                        <Button
                          variant="danger"
                          size="md"
                          onClick={handleTempDisable}
                          className="bg-destructive border-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Désactiver le WiFi
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Success message */}
                  {successMessage && (
                    <div className="p-3 bg-success/10 border border-success/30 rounded-lg text-success text-sm flex items-center gap-2">
                      <Check size={16} />
                      {successMessage}
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                    <p className="text-xs text-primary">
                      <strong>Astuce :</strong> Cette fonction est utile pour couper temporairement
                      le WiFi (ex: pendant la nuit, pour des enfants) sans avoir à le réactiver manuellement.
                    </p>
                  </div>
                </div>
              )}

              {/* Guest Network Tab (v14+) */}
              {activeTab === 'guest' && (
                <div className="space-y-4">
                  {/* Header with status */}
                  <div className="flex items-center justify-between p-4 bg-secondary/60 rounded-xl border border-border">
                    <div>
                      <h3 className="text-foreground font-medium">Réseau Invité</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Réseau WiFi séparé pour vos invités
                      </p>
                    </div>
                    <Badge variant={guestConfig?.enabled ? 'success' : 'default'}>
                      {guestConfig?.enabled ? 'Activé' : 'Désactivé'}
                    </Badge>
                  </div>

                  {/* Success message */}
                  {successMessage && (
                    <div className="p-3 bg-success/10 border border-success/30 rounded-lg text-success text-sm flex items-center gap-2">
                      <Check size={16} />
                      {successMessage}
                    </div>
                  )}

                  {/* Config form */}
                  <div className="p-4 bg-secondary/60 rounded-xl border border-border space-y-4">
                    <div>
                      <Label className="mb-1 block">Nom du réseau (SSID)</Label>
                      <Input
                        type="text"
                        placeholder="Ex: Freebox_Invités"
                        value={guestSsid}
                        onChange={(e) => setGuestSsid(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block">Mot de passe</Label>
                      <Input
                        type="text"
                        placeholder="Minimum 8 caractères"
                        value={guestKey}
                        onChange={(e) => setGuestKey(e.target.value)}
                        className="font-mono"
                      />
                      {guestKey.length > 0 && guestKey.length < 8 && (
                        <p className="text-xs text-warning mt-1">Le mot de passe doit contenir au moins 8 caractères</p>
                      )}
                    </div>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleSaveGuestConfig}
                      disabled={savingGuest || (guestKey.length > 0 && guestKey.length < 8)}
                      className="w-full justify-center"
                    >
                      {savingGuest ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Save size={18} />
                      )}
                      Enregistrer
                    </Button>
                  </div>

                  {/* Info */}
                  <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                    <p className="text-xs text-primary">
                      <strong>Note :</strong> Le réseau invité est isolé de votre réseau principal.
                      Les appareils connectés au réseau invité ne peuvent pas accéder à vos appareils personnels.
                    </p>
                  </div>
                </div>
              )}

              {/* MLO Tab (v14+ WiFi 7) - Only for Freebox Ultra */}
              {activeTab === 'mlo' && isUltraModel && (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="p-6 bg-secondary/60 rounded-xl border border-border text-center">
                    <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
                      mloConfig?.enabled ? 'bg-primary/20' : 'bg-muted'
                    }`}>
                      <Link2 size={40} className={mloConfig?.enabled ? 'text-primary' : 'text-muted-foreground'} />
                    </div>

                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Multi-Link Operation (MLO)
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Technologie WiFi 7 permettant aux appareils compatibles d'utiliser
                      plusieurs bandes simultanément pour des performances optimales.
                    </p>

                    {/* Success message */}
                    {successMessage && (
                      <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded-lg text-success text-sm flex items-center justify-center gap-2">
                        <Check size={16} />
                        {successMessage}
                      </div>
                    )}

                    {/* Toggle */}
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {mloConfig?.enabled ? 'Activé' : 'Désactivé'}
                      </span>
                      <Toggle
                        checked={!!mloConfig?.enabled}
                        onChange={handleToggleMlo}
                        disabled={savingMlo}
                      />
                      {savingMlo && <Loader2 size={16} className="animate-spin text-primary" />}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                    <p className="text-xs text-primary">
                      <strong>WiFi 7 uniquement :</strong> MLO (Multi-Link Operation) permet aux appareils
                      WiFi 7 compatibles d'agréger plusieurs liens radio (2.4GHz + 5GHz + 6GHz) pour
                      une bande passante accrue et une latence réduite.
                    </p>
                  </div>

                  <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                    <p className="text-xs text-warning">
                      <strong>Compatibilité :</strong> Seuls les appareils WiFi 7 (802.11be) peuvent
                      bénéficier du MLO. Les appareils plus anciens continueront à fonctionner normalement.
                    </p>
                  </div>
                </div>
              )}

              {/* MAC Filter Tab */}
              {activeTab === 'filter' && (
                <div className="space-y-4">
                  {/* Header with status */}
                  <div className="flex items-center justify-between p-4 bg-secondary/60 rounded-xl border border-border">
                    <div>
                      <h3 className="text-foreground font-medium">Filtrage MAC</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Autoriser ou bloquer des appareils spécifiques
                      </p>
                    </div>
                    <Badge variant={macFilterEnabled ? 'success' : 'default'}>
                      {macFilterEnabled ? 'Activé' : 'Désactivé'}
                    </Badge>
                  </div>

                  {/* Filter Mode */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMacFilterMode('whitelist')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-colors ${
                        macFilterMode === 'whitelist'
                          ? 'bg-success/15 text-success border-success/40'
                          : 'bg-secondary/60 text-muted-foreground border-border hover:text-foreground'
                      }`}
                    >
                      Liste blanche (autoriser)
                    </button>
                    <button
                      onClick={() => setMacFilterMode('blacklist')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-colors ${
                        macFilterMode === 'blacklist'
                          ? 'bg-destructive/15 text-destructive border-destructive/40'
                          : 'bg-secondary/60 text-muted-foreground border-border hover:text-foreground'
                      }`}
                    >
                      Liste noire (bloquer)
                    </button>
                  </div>

                  {/* Add new rule form */}
                  <div className="p-4 bg-secondary/60 rounded-xl border border-border space-y-3">
                    <h4 className="text-sm font-medium text-foreground">Ajouter une règle</h4>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Adresse MAC (ex: AA:BB:CC:DD:EE:FF)"
                        value={newMacAddress}
                        onChange={(e) => setNewMacAddress(e.target.value.toUpperCase())}
                        className="flex-1 font-mono"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Commentaire (optionnel)"
                        value={newMacComment}
                        onChange={(e) => setNewMacComment(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => {
                          if (newMacAddress.match(/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/)) {
                            setMacFilterRules(prev => [...prev, { mac: newMacAddress, comment: newMacComment || undefined, type: macFilterMode }]);
                            setNewMacAddress('');
                            setNewMacComment('');
                            setSuccessMessage('Règle ajoutée (non sauvegardée)');
                            setTimeout(() => setSuccessMessage(null), 2000);
                          } else {
                            setError('Format MAC invalide. Utilisez AA:BB:CC:DD:EE:FF');
                          }
                        }}
                        disabled={!newMacAddress || savingMacFilter}
                      >
                        <Plus size={16} />
                        Ajouter
                      </Button>
                    </div>
                  </div>

                  {/* Success message */}
                  {successMessage && activeTab === 'filter' && (
                    <div className="p-3 bg-success/10 border border-success/30 rounded-lg text-success text-sm flex items-center gap-2">
                      <Check size={16} />
                      {successMessage}
                    </div>
                  )}

                  {/* Rules list */}
                  {macFilterRules.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="text-sm text-muted-foreground">Règles ({macFilterRules.length})</h4>
                      {macFilterRules.map((rule, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-secondary/60 rounded-lg border border-border group">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              rule.type === 'whitelist' ? 'bg-success' : 'bg-destructive'
                            }`} />
                            <div>
                              <span className="font-mono text-sm text-foreground">{rule.mac}</span>
                              {rule.comment && (
                                <p className="text-xs text-muted-foreground mt-0.5">{rule.comment}</p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setMacFilterRules(prev => prev.filter((_, idx) => idx !== i));
                              setSuccessMessage('Règle supprimée (non sauvegardée)');
                              setTimeout(() => setSuccessMessage(null), 2000);
                            }}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Shield size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Aucune règle de filtrage configurée</p>
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                    <p className="text-xs text-primary">
                      <strong>Note :</strong> Le filtrage MAC permet de contrôler quels appareils
                      peuvent se connecter au WiFi. En mode liste blanche, seuls les appareils
                      listés peuvent se connecter. En mode liste noire, les appareils listés sont bloqués.
                    </p>
                  </div>
                </div>
              )}

              {/* Planning Tab */}
              {activeTab === 'planning' && (
                <div className="space-y-4">
                  {/* Header with toggle */}
                  <div className="flex items-center justify-between p-4 bg-secondary/60 rounded-xl border border-border">
                    <div>
                      <h3 className="text-foreground font-medium">Planification WiFi</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Programmer l'activation/désactivation du WiFi
                      </p>
                    </div>
                    <Toggle
                      checked={!!planning?.enabled}
                      onChange={togglePlanningEnabled}
                      disabled={savingPlanning}
                    />
                  </div>

                  {/* Success message */}
                  {successMessage && (
                    <div className="p-3 bg-success/10 border border-success/30 rounded-lg text-success text-sm flex items-center gap-2">
                      <Check size={16} />
                      {successMessage}
                    </div>
                  )}

                  {/* Quick actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAllGrid(true)}
                      className="flex-1 px-3 py-2 bg-success/10 hover:bg-success/20 text-success rounded-lg text-sm transition-colors"
                    >
                      Tout activer
                    </button>
                    <button
                      onClick={() => setAllGrid(false)}
                      className="flex-1 px-3 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg text-sm transition-colors"
                    >
                      Tout désactiver
                    </button>
                  </div>

                  {/* Planning Grid */}
                  <div className="bg-secondary/60 rounded-xl border border-border p-4 overflow-x-auto">
                    <div className="min-w-[600px]">
                      {/* Hours header */}
                      <div className="flex mb-1">
                        <div className="w-12 flex-shrink-0" />
                        {HOURS.map(hour => (
                          <button
                            key={hour}
                            onClick={() => toggleColumn(hour)}
                            className="flex-1 text-center text-[10px] text-muted-foreground hover:text-foreground transition-colors py-1"
                            title={`Basculer ${hour}h`}
                          >
                            {hour}
                          </button>
                        ))}
                      </div>

                      {/* Grid rows */}
                      {DAYS_FR.map((day, dayIndex) => (
                        <div key={day} className="flex items-center mb-0.5">
                          <button
                            onClick={() => toggleRow(dayIndex)}
                            className="w-12 flex-shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors text-left pr-2"
                            title={`Basculer ${day}`}
                          >
                            {day}
                          </button>
                          <div className="flex-1 flex gap-0.5">
                            {HOURS.map(hour => (
                              <button
                                key={hour}
                                onClick={() => toggleGridCell(dayIndex, hour)}
                                className={`flex-1 h-5 rounded-sm border border-border transition-all ${
                                  planningGrid[dayIndex]?.[hour]
                                    ? 'bg-primary/20 hover:bg-primary/30'
                                    : 'bg-muted hover:bg-accent'
                                }`}
                                title={`${day} ${hour}h-${hour + 1}h: ${planningGrid[dayIndex]?.[hour] ? 'WiFi actif' : 'WiFi inactif'}`}
                              />
                            ))}
                          </div>
                        </div>
                      ))}

                      {/* Legend */}
                      <div className="flex items-center justify-end gap-4 mt-3 pt-3 border-t border-border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-3 h-3 rounded-sm bg-primary/20 border border-border" />
                          <span>WiFi actif</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-3 h-3 rounded-sm bg-muted border border-border" />
                          <span>WiFi inactif</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save button */}
                  {planningModified && (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={savePlanning}
                      disabled={savingPlanning}
                      className="w-full justify-center"
                    >
                      {savingPlanning ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Save size={18} />
                      )}
                      Enregistrer les modifications
                    </Button>
                  )}

                  {/* Info */}
                  <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                    <p className="text-xs text-primary">
                      <strong>Astuce :</strong> Cliquez sur un créneau pour basculer son état.
                      Cliquez sur un jour ou une heure pour basculer toute la ligne/colonne.
                    </p>
                  </div>
                </div>
              )}

              {/* WPS Tab */}
              {activeTab === 'wps' && (
                <div className="space-y-4">
                  <div className="p-6 bg-secondary/60 rounded-xl border border-border text-center">
                    <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 bg-muted">
                      <Wifi size={40} className="text-muted-foreground" />
                    </div>

                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Wi-Fi Protected Setup
                    </h3>

                    <p className="text-sm text-muted-foreground mb-6">
                      Connectez rapidement un appareil sans mot de passe
                    </p>

                    <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg text-left mb-4">
                      <p className="text-sm text-primary mb-3">
                        <strong>Comment activer le WPS :</strong>
                      </p>
                      <ol className="text-xs text-primary/90 space-y-2 list-decimal list-inside">
                        <li>Sur l'écran LCD de votre Freebox Ultra, naviguez vers <strong>Paramètres &gt; WiFi &gt; WPS</strong></li>
                        <li>Ou utilisez l'application <strong>Freebox Connect</strong> sur votre téléphone</li>
                        <li>Ou accédez à <strong>mafreebox.freebox.fr</strong> &gt; Paramètres &gt; WiFi &gt; WPS</li>
                      </ol>
                    </div>
                  </div>

                  <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                    <p className="text-xs text-warning">
                      <strong>Note :</strong> L'API WPS n'est pas disponible via l'API Freebox OS.
                      Le WPS doit être activé directement depuis l'interface de la Freebox.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
      </DialogContent>
    </Dialog>
  );
};