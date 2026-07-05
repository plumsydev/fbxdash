import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  Clock,
  Globe,
  Ban,
  Wifi,
  Check,
  ChevronDown,
  ChevronRight,
  Users,
  Laptop,
  User,
  Power,
  PowerOff
} from 'lucide-react';
import { api } from '../../api/client';
import { API_ROUTES } from '../../utils/constants';
import type { Device } from '../../types';
import { Dialog, DialogHeader, DialogContent, DialogFooter, Button, Toggle, Badge, Input, Label } from '../ui';
import { cn } from '../../lib/utils';

interface ParentalControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices?: Device[];
}

// Network access mode types
type AccessMode = 'allowed' | 'denied' | 'webonly';

// Profile from API
interface Profile {
  id: number;
  name: string;
  url?: string;
}

// Network Control from API
interface NetworkControl {
  profile_id: number;
  next_change: number;
  override: boolean;
  override_mode: AccessMode;
  override_until: number;
  current_mode: AccessMode;
  rule_mode: AccessMode;
  macs: string[];
  hosts: string[];
  resolution: number;
  cdayranges: string[];
}

// Network Control Rule from API
interface NetworkControlRule {
  id: number;
  profile_id: number;
  name: string;
  mode: AccessMode;
  start_time: number;
  end_time: number;
  weekdays: boolean[];
  enabled: boolean;
}

export const ParentalControlModal: React.FC<ParentalControlModalProps> = ({
  isOpen,
  onClose,
  devices = []
}) => {
  const [activeTab, setActiveTab] = useState<'profiles' | 'rules'>('profiles');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Profiles state
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [networkControls, setNetworkControls] = useState<NetworkControl[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [selectedProfileRules, setSelectedProfileRules] = useState<NetworkControlRule[]>([]);
  const [expandedProfiles, setExpandedProfiles] = useState<Set<number>>(new Set());

  // Profile creation form
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  // Rule creation form
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleMode, setNewRuleMode] = useState<AccessMode>('denied');
  const [newRuleStartTime, setNewRuleStartTime] = useState('00:00');
  const [newRuleEndTime, setNewRuleEndTime] = useState('08:00');
  const [newRuleWeekdays, setNewRuleWeekdays] = useState<boolean[]>([true, true, true, true, true, false, false, false]);

  // Device assignment
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [assigningProfileId, setAssigningProfileId] = useState<number | null>(null);
  const [selectedMacs, setSelectedMacs] = useState<string[]>([]);

  // Override state
  const [overrideMode, setOverrideMode] = useState<AccessMode>('denied');
  const [overrideDuration, setOverrideDuration] = useState<number>(30); // minutes

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch profiles
      const profilesRes = await api.get<Profile[]>(API_ROUTES.PROFILES);
      if (profilesRes.success && profilesRes.result) {
        setProfiles(profilesRes.result);
      } else {
        // Check for permission error
        if (profilesRes.error?.code === 'INSUFFICIENT_RIGHTS') {
          setError('Droits insuffisants. Veuillez ajouter le droit "Gestion des profils utilisateur" à l\'application.');
          setIsLoading(false);
          return;
        }
        setError(profilesRes.error?.message || 'Erreur lors du chargement des profils');
        setIsLoading(false);
        return;
      }

      // Fetch network controls for all profiles
      const networkControlRes = await api.get<NetworkControl[]>(API_ROUTES.NETWORK_CONTROL);
      if (networkControlRes.success && networkControlRes.result) {
        setNetworkControls(networkControlRes.result);
      }
    } catch (err) {
      console.error('Error fetching parental data:', err);
      setError('Erreur lors du chargement du contrôle parental');
    } finally {
      setIsLoading(false);
    }
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  // Get network control for a profile
  const getNetworkControl = (profileId: number): NetworkControl | null => {
    return networkControls.find(nc => nc.profile_id === profileId) || null;
  };

  // Fetch rules for a profile
  const fetchRulesForProfile = async (profileId: number) => {
    try {
      const response = await api.get<NetworkControlRule[]>(`${API_ROUTES.NETWORK_CONTROL}/${profileId}/rules`);
      if (response.success && response.result) {
        setSelectedProfileRules(response.result);
      }
    } catch (err) {
      console.error('Error fetching rules:', err);
    }
  };

  // Toggle profile expansion
  const toggleProfileExpand = async (profileId: number) => {
    const newExpanded = new Set(expandedProfiles);
    if (newExpanded.has(profileId)) {
      newExpanded.delete(profileId);
    } else {
      newExpanded.add(profileId);
      // Fetch rules when expanding
      await fetchRulesForProfile(profileId);
    }
    setExpandedProfiles(newExpanded);
    setSelectedProfileId(profileId);
  };

  // Create new profile
  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) {
      setError('Veuillez entrer un nom de profil');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post<{ id: number }>(API_ROUTES.PROFILES, {
        name: newProfileName,
        url: '/resources/images/profile/profile_01.png'
      });

      if (response.success && response.result) {
        await fetchData();
        setIsCreatingProfile(false);
        setNewProfileName('');
        showSuccess('Profil créé avec succès');
      } else {
        setError(response.error?.message || 'Erreur lors de la création du profil');
      }
    } catch {
      setError('Erreur lors de la création du profil');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete profile
  const handleDeleteProfile = async (profileId: number) => {
    if (!confirm('Supprimer ce profil ?')) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.delete(`${API_ROUTES.PROFILES}/${profileId}`);
      if (response.success) {
        setProfiles(profiles.filter(p => p.id !== profileId));
        showSuccess('Profil supprimé');
      } else {
        setError(response.error?.message || 'Erreur lors de la suppression');
      }
    } catch {
      setError('Erreur lors de la suppression');
    } finally {
      setIsLoading(false);
    }
  };

  // Update network control (assign devices)
  const handleAssignDevices = async () => {
    if (assigningProfileId === null) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.put<NetworkControl>(`${API_ROUTES.NETWORK_CONTROL}/${assigningProfileId}`, {
        macs: selectedMacs
      });

      if (response.success) {
        await fetchData();
        setShowDeviceSelector(false);
        setAssigningProfileId(null);
        setSelectedMacs([]);
        showSuccess('Appareils assignés');
      } else {
        setError(response.error?.message || 'Erreur lors de l\'assignation');
      }
    } catch {
      setError('Erreur lors de l\'assignation');
    } finally {
      setIsLoading(false);
    }
  };

  // Set override for a profile
  const handleSetOverride = async (profileId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const overrideUntil = Math.floor(Date.now() / 1000) + (overrideDuration * 60);
      const response = await api.put<NetworkControl>(`${API_ROUTES.NETWORK_CONTROL}/${profileId}`, {
        override: true,
        override_mode: overrideMode,
        override_until: overrideUntil
      });

      if (response.success) {
        await fetchData();
        showSuccess(`Mode temporaire activé pour ${overrideDuration} minutes`);
      } else {
        setError(response.error?.message || 'Erreur lors de l\'activation du mode temporaire');
      }
    } catch {
      setError('Erreur lors de l\'activation du mode temporaire');
    } finally {
      setIsLoading(false);
    }
  };

  // Clear override for a profile
  const handleClearOverride = async (profileId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.put<NetworkControl>(`${API_ROUTES.NETWORK_CONTROL}/${profileId}`, {
        override: false
      });

      if (response.success) {
        await fetchData();
        showSuccess('Mode temporaire désactivé');
      } else {
        setError(response.error?.message || 'Erreur lors de la désactivation');
      }
    } catch {
      setError('Erreur lors de la désactivation');
    } finally {
      setIsLoading(false);
    }
  };

  // Create rule
  const handleCreateRule = async () => {
    if (selectedProfileId === null) return;
    if (!newRuleName.trim()) {
      setError('Veuillez entrer un nom de règle');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert time strings to seconds since midnight
      const [startH, startM] = newRuleStartTime.split(':').map(Number);
      const [endH, endM] = newRuleEndTime.split(':').map(Number);
      const startSeconds = startH * 3600 + startM * 60;
      const endSeconds = endH * 3600 + endM * 60;

      const response = await api.post<NetworkControlRule>(`${API_ROUTES.NETWORK_CONTROL}/${selectedProfileId}/rules`, {
        name: newRuleName,
        mode: newRuleMode,
        start_time: startSeconds,
        end_time: endSeconds,
        weekdays: newRuleWeekdays,
        enabled: true
      });

      if (response.success) {
        await fetchRulesForProfile(selectedProfileId);
        setIsCreatingRule(false);
        setNewRuleName('');
        showSuccess('Règle créée');
      } else {
        setError(response.error?.message || 'Erreur lors de la création de la règle');
      }
    } catch {
      setError('Erreur lors de la création de la règle');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete rule
  const handleDeleteRule = async (ruleId: number) => {
    if (selectedProfileId === null) return;
    if (!confirm('Supprimer cette règle ?')) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.delete(`${API_ROUTES.NETWORK_CONTROL}/${selectedProfileId}/rules/${ruleId}`);
      if (response.success) {
        await fetchRulesForProfile(selectedProfileId);
        showSuccess('Règle supprimée');
      } else {
        setError(response.error?.message || 'Erreur lors de la suppression');
      }
    } catch {
      setError('Erreur lors de la suppression');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle rule enabled
  const handleToggleRule = async (rule: NetworkControlRule) => {
    if (selectedProfileId === null) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.put<NetworkControlRule>(
        `${API_ROUTES.NETWORK_CONTROL}/${selectedProfileId}/rules/${rule.id}`,
        { enabled: !rule.enabled }
      );

      if (response.success) {
        await fetchRulesForProfile(selectedProfileId);
        showSuccess(rule.enabled ? 'Règle désactivée' : 'Règle activée');
      } else {
        setError(response.error?.message || 'Erreur lors de la modification');
      }
    } catch {
      setError('Erreur lors de la modification');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle device MAC in selection
  const toggleDeviceMac = (mac: string) => {
    if (selectedMacs.includes(mac)) {
      setSelectedMacs(selectedMacs.filter(m => m !== mac));
    } else {
      setSelectedMacs([...selectedMacs, mac]);
    }
  };

  // Get mode color
  const getModeColor = (mode: AccessMode) => {
    switch (mode) {
      case 'allowed': return 'text-success bg-success/10';
      case 'denied': return 'text-destructive bg-destructive/10';
      case 'webonly': return 'text-primary bg-primary/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  // Get mode label
  const getModeLabel = (mode: AccessMode) => {
    switch (mode) {
      case 'allowed': return 'Autorisé';
      case 'denied': return 'Bloqué';
      case 'webonly': return 'Web seulement';
      default: return mode;
    }
  };

  // Get mode icon
  const getModeIcon = (mode: AccessMode) => {
    switch (mode) {
      case 'allowed': return <Globe size={14} />;
      case 'denied': return <Ban size={14} />;
      case 'webonly': return <Wifi size={14} />;
      default: return null;
    }
  };

  // Format seconds to time string
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Format remaining override time
  const formatRemainingTime = (timestamp: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = timestamp - now;
    if (remaining <= 0) return 'Expiré';
    if (remaining < 60) return `${remaining}s`;
    if (remaining < 3600) return `${Math.floor(remaining / 60)}min`;
    return `${Math.floor(remaining / 3600)}h ${Math.floor((remaining % 3600) / 60)}min`;
  };

  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim', 'Vac'];

  return (
    <Dialog open={isOpen} onClose={onClose} className="max-w-3xl">
      <DialogHeader
        title="Contrôle Parental"
        description="Gérer les restrictions d'accès Internet par profil"
        icon={<Shield size={18} className="text-primary" />}
        onClose={onClose}
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border px-5 py-2">
        <button
          onClick={() => setActiveTab('profiles')}
          className={cn(
            'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
            activeTab === 'profiles'
              ? 'border-border bg-accent text-foreground'
              : 'border-transparent text-muted-foreground hover:bg-accent/50'
          )}
        >
          <Users size={16} />
          Profils
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={cn(
            'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
            activeTab === 'rules'
              ? 'border-border bg-accent text-foreground'
              : 'border-transparent text-muted-foreground hover:bg-accent/50'
          )}
        >
          <Clock size={16} />
          Planification
        </button>
      </div>

      {/* Content */}
      <DialogContent>
        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <AlertCircle size={16} className="text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-success/50 bg-success/10 p-3">
            <Check size={16} className="text-success" />
            <span className="text-sm text-success">{success}</span>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Profiles Tab */}
        {!isLoading && activeTab === 'profiles' && (
          <div className="space-y-4">
            {/* Add new profile button */}
            {!isCreatingProfile && (
              <Button variant="primary" size="md" icon={Plus} onClick={() => setIsCreatingProfile(true)}>
                Nouveau profil
              </Button>
            )}

            {/* New profile form */}
            {isCreatingProfile && (
              <div className="space-y-4 rounded-xl border border-border bg-secondary/60 p-4">
                <h3 className="text-sm font-medium text-foreground">Nouveau profil</h3>
                <Input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="Nom du profil (ex: Enfants)"
                />
                <div className="flex gap-2">
                  <Button variant="primary" size="md" icon={Save} disabled={isLoading} onClick={handleCreateProfile}>
                    Créer
                  </Button>
                  <Button
                    variant="default"
                    size="md"
                    onClick={() => {
                      setIsCreatingProfile(false);
                      setNewProfileName('');
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}

            {/* Profiles list */}
            <div className="space-y-2">
              {profiles.length === 0 && !isCreatingProfile && (
                <div className="py-8 text-center text-muted-foreground">
                  <User size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Aucun profil configuré</p>
                  <p className="mt-1 text-xs">Créez un profil pour gérer l'accès Internet de certains appareils</p>
                </div>
              )}

              {profiles.map((profile) => {
                const nc = getNetworkControl(profile.id);
                const isExpanded = expandedProfiles.has(profile.id);

                return (
                  <div
                    key={profile.id}
                    className="overflow-hidden rounded-xl border border-border bg-secondary/40"
                  >
                    {/* Profile header */}
                    <div
                      className="flex cursor-pointer items-center justify-between p-4 hover:bg-accent/50"
                      onClick={() => toggleProfileExpand(profile.id)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown size={16} className="text-muted-foreground" />
                        ) : (
                          <ChevronRight size={16} className="text-muted-foreground" />
                        )}
                        <div className="rounded-lg bg-muted p-2">
                          <User size={16} className="text-muted-foreground" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-foreground">{profile.name}</h4>
                          <div className="mt-1 flex items-center gap-2">
                            {nc && (
                              <>
                                <Badge className={cn('gap-1', getModeColor(nc.current_mode))}>
                                  {getModeIcon(nc.current_mode)}
                                  {getModeLabel(nc.current_mode)}
                                </Badge>
                                {nc.override && (
                                  <span className="text-xs text-warning">
                                    (Temporaire: {formatRemainingTime(nc.override_until)})
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {nc.macs.length} appareil(s)
                                </span>
                              </>
                            )}
                            {!nc && (
                              <span className="text-xs text-muted-foreground">Aucun appareil assigné</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDeleteProfile(profile.id)}
                          className="rounded-lg p-2 text-destructive transition-colors hover:bg-destructive/10"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Profile details */}
                    {isExpanded && (
                      <div className="space-y-4 border-t border-border p-4">
                        {/* Devices section */}
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <h5 className="text-xs font-medium uppercase text-muted-foreground">Appareils</h5>
                            <button
                              onClick={() => {
                                setAssigningProfileId(profile.id);
                                setSelectedMacs(nc?.macs || []);
                                setShowDeviceSelector(true);
                              }}
                              className="text-xs text-primary hover:text-primary/80"
                            >
                              Modifier
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {nc?.hosts?.map((host, i) => (
                              <span key={i} className="flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs text-foreground">
                                <Laptop size={12} />
                                {host}
                              </span>
                            ))}
                            {nc?.macs && nc.macs.length > 0 && (!nc.hosts || nc.hosts.length === 0) && (
                              nc.macs.map((mac, i) => (
                                <span key={i} className="rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                                  {mac}
                                </span>
                              ))
                            )}
                            {(!nc || nc.macs.length === 0) && (
                              <span className="text-xs text-muted-foreground">Aucun appareil assigné</span>
                            )}
                          </div>
                        </div>

                        {/* Override section */}
                        {nc && (
                          <div className="rounded-lg border border-border bg-secondary/60 p-3">
                            <h5 className="mb-3 text-xs font-medium uppercase text-muted-foreground">Mode temporaire</h5>
                            {nc.override ? (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className={cn('gap-1', getModeColor(nc.override_mode))}>
                                    {getModeIcon(nc.override_mode)}
                                    {getModeLabel(nc.override_mode)}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    pendant encore {formatRemainingTime(nc.override_until)}
                                  </span>
                                </div>
                                <Button variant="default" size="sm" icon={PowerOff} onClick={() => handleClearOverride(profile.id)}>
                                  Désactiver
                                </Button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-3">
                                <select
                                  value={overrideMode}
                                  onChange={(e) => setOverrideMode(e.target.value as AccessMode)}
                                  className="rounded-lg border border-input bg-secondary/50 px-3 py-1.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                  <option value="allowed">Autorisé</option>
                                  <option value="denied">Bloqué</option>
                                  <option value="webonly">Web seulement</option>
                                </select>
                                <span className="text-sm text-muted-foreground">pendant</span>
                                <select
                                  value={overrideDuration}
                                  onChange={(e) => setOverrideDuration(parseInt(e.target.value))}
                                  className="rounded-lg border border-input bg-secondary/50 px-3 py-1.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                  <option value="15">15 min</option>
                                  <option value="30">30 min</option>
                                  <option value="60">1 heure</option>
                                  <option value="120">2 heures</option>
                                  <option value="240">4 heures</option>
                                </select>
                                <Button variant="primary" size="sm" icon={Power} onClick={() => handleSetOverride(profile.id)}>
                                  Activer
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Device selector modal */}
            <Dialog
              open={showDeviceSelector}
              onClose={() => {
                setShowDeviceSelector(false);
                setAssigningProfileId(null);
                setSelectedMacs([]);
              }}
              className="max-w-md"
            >
              <DialogHeader
                title="Assigner des appareils"
                onClose={() => {
                  setShowDeviceSelector(false);
                  setAssigningProfileId(null);
                  setSelectedMacs([]);
                }}
              />
              <DialogContent>
                {devices.filter(d => d.mac).map((device) => (
                  <label
                    key={device.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent/50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMacs.includes(device.mac!)}
                      onChange={() => toggleDeviceMac(device.mac!)}
                      className="h-4 w-4 rounded border-input bg-secondary text-primary focus:ring-ring"
                    />
                    <Laptop size={14} className="text-muted-foreground" />
                    <span className="text-sm text-foreground">{device.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{device.mac}</span>
                  </label>
                ))}
                {devices.filter(d => d.mac).length === 0 && (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                    Aucun appareil disponible
                  </p>
                )}
              </DialogContent>
              <DialogFooter>
                <Button
                  variant="default"
                  size="md"
                  onClick={() => {
                    setShowDeviceSelector(false);
                    setAssigningProfileId(null);
                    setSelectedMacs([]);
                  }}
                >
                  Annuler
                </Button>
                <Button variant="primary" size="md" icon={Save} onClick={handleAssignDevices}>
                  Enregistrer
                </Button>
              </DialogFooter>
            </Dialog>
          </div>
        )}

        {/* Rules Tab */}
        {!isLoading && activeTab === 'rules' && (
          <div className="space-y-4">
            {/* Profile selector */}
            <div>
              <Label className="mb-1 block">Sélectionner un profil</Label>
              <select
                value={selectedProfileId || ''}
                onChange={(e) => {
                  const id = parseInt(e.target.value);
                  if (id) {
                    setSelectedProfileId(id);
                    fetchRulesForProfile(id);
                  } else {
                    setSelectedProfileId(null);
                    setSelectedProfileRules([]);
                  }
                }}
                className="w-full rounded-lg border border-input bg-secondary/50 px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Sélectionner...</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedProfileId && (
              <>
                {/* Add rule button */}
                {!isCreatingRule && (
                  <Button variant="primary" size="md" icon={Plus} onClick={() => setIsCreatingRule(true)}>
                    Nouvelle règle
                  </Button>
                )}

                {/* New rule form */}
                {isCreatingRule && (
                  <div className="space-y-4 rounded-xl border border-border bg-secondary/60 p-4">
                    <h3 className="text-sm font-medium text-foreground">Nouvelle règle de planification</h3>

                    <div>
                      <Label className="mb-1 block">Nom</Label>
                      <Input
                        type="text"
                        value={newRuleName}
                        onChange={(e) => setNewRuleName(e.target.value)}
                        placeholder="Ex: Nuit (blocage)"
                      />
                    </div>

                    <div>
                      <Label className="mb-1 block">Mode</Label>
                      <div className="flex gap-2">
                        {(['allowed', 'denied', 'webonly'] as AccessMode[]).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setNewRuleMode(mode)}
                            className={cn(
                              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                              newRuleMode === mode
                                ? getModeColor(mode)
                                : 'bg-muted text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {getModeIcon(mode)}
                            {getModeLabel(mode)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Label className="mb-1 block">De</Label>
                        <Input
                          type="time"
                          value={newRuleStartTime}
                          onChange={(e) => setNewRuleStartTime(e.target.value)}
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="mb-1 block">À</Label>
                        <Input
                          type="time"
                          value={newRuleEndTime}
                          onChange={(e) => setNewRuleEndTime(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block">Jours</Label>
                      <div className="flex flex-wrap gap-2">
                        {days.map((day, idx) => (
                          <button
                            key={day}
                            onClick={() => {
                              const newWeekdays = [...newRuleWeekdays];
                              newWeekdays[idx] = !newWeekdays[idx];
                              setNewRuleWeekdays(newWeekdays);
                            }}
                            className={cn(
                              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                              newRuleWeekdays[idx]
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="primary" size="md" icon={Save} disabled={isLoading} onClick={handleCreateRule}>
                        Créer
                      </Button>
                      <Button
                        variant="default"
                        size="md"
                        onClick={() => {
                          setIsCreatingRule(false);
                          setNewRuleName('');
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}

                {/* Rules list */}
                <div className="space-y-2">
                  {selectedProfileRules.length === 0 && !isCreatingRule && (
                    <div className="py-8 text-center text-muted-foreground">
                      <Clock size={32} className="mx-auto mb-2 opacity-50" />
                      <p>Aucune règle de planification</p>
                      <p className="mt-1 text-xs">Les règles définissent automatiquement le mode d'accès selon l'heure</p>
                    </div>
                  )}

                  {selectedProfileRules.map((rule) => (
                    <div
                      key={rule.id}
                      className={cn(
                        'rounded-xl border border-border bg-secondary/40 p-4',
                        !rule.enabled && 'opacity-60'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="text-sm font-medium text-foreground">{rule.name}</h4>
                            <Badge className={cn('gap-1', getModeColor(rule.mode))}>
                              {getModeIcon(rule.mode)}
                              {getModeLabel(rule.mode)}
                            </Badge>
                            {!rule.enabled && (
                              <span className="text-xs text-muted-foreground">(Désactivé)</span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock size={12} />
                            {formatTime(rule.start_time)} - {formatTime(rule.end_time)}
                            <span className="text-border">|</span>
                            {days.filter((_, idx) => rule.weekdays[idx]).join(', ')}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Toggle
                            checked={rule.enabled}
                            onChange={() => handleToggleRule(rule)}
                            size="sm"
                          />
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="rounded-lg p-2 text-destructive transition-colors hover:bg-destructive/10"
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {!selectedProfileId && (
              <div className="py-8 text-center text-muted-foreground">
                <Users size={32} className="mx-auto mb-2 opacity-50" />
                <p>Sélectionnez un profil pour gérer ses règles</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ParentalControlModal;
