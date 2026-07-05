import React, { useState, useEffect } from 'react';
import { Shield, Loader2, Plus, Trash2, Users, Server, Wifi, Eye, EyeOff, Copy, Check, AlertCircle, Download, RefreshCw, Power } from 'lucide-react';
import { api } from '../../api/client';
import { Dialog, DialogHeader, DialogContent, Button, Input, Label, Badge } from '../ui';
import { cn } from '../../lib/utils';

interface VpnModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface VpnUser {
  login: string;
  ip_reservation?: string;
  password?: string;
}

// VPN Server from Freebox API
// Note: API uses 'name' as the identifier (e.g., "openvpn_routed", "wireguard")
interface VpnServer {
  name: string;  // This is the ID (openvpn_routed, openvpn_bridge, pptp, wireguard)
  type?: string; // pptp, openvpn, wireguard
  state: 'stopped' | 'starting' | 'started' | 'stopping' | 'error';
  connection_count?: number;
  auth_connection_count?: number;
}

interface VpnConnection {
  id: number;
  user: string;
  vpn: string;
  src_ip: string;
  rx_bytes: number;
  tx_bytes: number;
  auth_time: number;
  local_ip?: string;
}

type TabType = 'users' | 'server' | 'connections';

export const VpnModal: React.FC<VpnModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('server');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Users state
  const [users, setUsers] = useState<VpnUser[]>([]);
  const [newUser, setNewUser] = useState({ login: '', password: '', ip_reservation: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  // Server state
  const [servers, setServers] = useState<VpnServer[]>([]);
  const [togglingServer, setTogglingServer] = useState<string | null>(null);

  // Connections state
  const [connections, setConnections] = useState<VpnConnection[]>([]);

  // Copied state
  const [copiedLogin, setCopiedLogin] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'users') {
        const response = await api.get<VpnUser[]>('/api/settings/vpn/users');
        if (response.success && response.result) {
          setUsers(response.result);
        }
      } else if (activeTab === 'server') {
        const serversResponse = await api.get<VpnServer[]>('/api/settings/vpn/servers');
        console.log('[VPN] Servers response:', serversResponse);
        if (serversResponse.success && serversResponse.result) {
          setServers(serversResponse.result);
        }
      } else if (activeTab === 'connections') {
        const response = await api.get<VpnConnection[]>('/api/settings/vpn/connections');
        if (response.success && response.result) {
          setConnections(response.result);
        }
      }
    } catch (err) {
      console.error('[VPN] Fetch error:', err);
      setError('Erreur lors du chargement des données VPN');
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    if (!newUser.login || !newUser.password) {
      setError('Le login et le mot de passe sont requis');
      return;
    }

    if (newUser.password.length < 8 || newUser.password.length > 32) {
      setError('Le mot de passe doit contenir entre 8 et 32 caractères');
      return;
    }

    setSavingUser(true);
    setError(null);

    try {
      const userData: Record<string, string> = {
        login: newUser.login,
        password: newUser.password
      };
      if (newUser.ip_reservation) {
        userData.ip_reservation = newUser.ip_reservation;
      }

      const response = await api.post<VpnUser>('/api/settings/vpn/users', userData);

      if (response.success) {
        setSuccessMessage('Utilisateur créé avec succès');
        setNewUser({ login: '', password: '', ip_reservation: '' });
        setTimeout(() => setSuccessMessage(null), 3000);
        fetchData();
      } else {
        setError(response.error?.message || 'Erreur lors de la création');
      }
    } catch (err) {
      console.error('[VPN] Create user error:', err);
      setError('Erreur lors de la création de l\'utilisateur');
    } finally {
      setSavingUser(false);
    }
  };

  const deleteUser = async (login: string) => {
    if (!confirm(`Supprimer l'utilisateur "${login}" ?`)) return;

    setError(null);
    try {
      const response = await api.delete(`/api/settings/vpn/users/${login}`);

      if (response.success) {
        setSuccessMessage('Utilisateur supprimé');
        setTimeout(() => setSuccessMessage(null), 3000);
        fetchData();
      } else {
        setError(response.error?.message || 'Erreur lors de la suppression');
      }
    } catch (err) {
      console.error('[VPN] Delete user error:', err);
      setError('Erreur lors de la suppression');
    }
  };

  const toggleServer = async (serverId: string, currentState: string) => {
    setTogglingServer(serverId);
    setError(null);

    try {
      const action = currentState === 'started' ? 'stop' : 'start';
      const response = await api.post(`/api/settings/vpn/servers/${serverId}/${action}`);

      if (response.success) {
        setSuccessMessage(`Serveur ${action === 'start' ? 'démarré' : 'arrêté'}`);
        setTimeout(() => setSuccessMessage(null), 3000);
        setTimeout(fetchData, 500);
      } else {
        setError(response.error?.message || 'Erreur lors de l\'opération');
      }
    } catch (err) {
      console.error('[VPN] Toggle server error:', err);
      setError('Erreur lors de l\'opération');
    } finally {
      setTogglingServer(null);
    }
  };

  const downloadConfig = async (login: string, serverId: string) => {
    try {
      window.open(`/api/settings/vpn/servers/${serverId}/download/${login}`, '_blank');
    } catch (err) {
      console.error('[VPN] Download config error:', err);
      setError('Erreur lors du téléchargement de la configuration');
    }
  };

  const copyToClipboard = (text: string, login: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLogin(login);
    setTimeout(() => setCopiedLogin(null), 2000);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDuration = (timestamp: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
  };

  const getServerDisplayName = (serverId: string): string => {
    const names: Record<string, string> = {
      'openvpn_routed': 'OpenVPN Routé',
      'openvpn_bridge': 'OpenVPN Bridge',
      'pptp': 'PPTP',
      'wireguard': 'WireGuard'
    };
    return names[serverId] || serverId;
  };

  const getServerDescription = (serverId: string): string => {
    const descriptions: Record<string, string> = {
      'openvpn_routed': 'Accès routé au réseau local',
      'openvpn_bridge': 'Accès en pont au réseau (même sous-réseau)',
      'pptp': 'Protocole legacy - Non recommandé',
      'wireguard': 'Protocole moderne, rapide et sécurisé'
    };
    return descriptions[serverId] || '';
  };

  const getServerIcon = (serverId: string): string => {
    if (serverId.includes('wireguard')) return '🔒';
    if (serverId.includes('openvpn')) return '🔐';
    if (serverId.includes('pptp')) return '⚠️';
    return '🛡️';
  };

  const getServerStateBadgeVariant = (state: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (state) {
      case 'started': return 'success';
      case 'starting': case 'stopping': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getServerStateLabel = (state: string): string => {
    switch (state) {
      case 'started': return 'Actif';
      case 'starting': return 'Démarrage...';
      case 'stopping': return 'Arrêt...';
      case 'error': return 'Erreur';
      default: return 'Arrêté';
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="max-w-3xl">
      <DialogHeader
        title="Serveur VPN"
        description="Gestion des serveurs et utilisateurs VPN"
        icon={<Shield size={18} className="text-primary" />}
        onClose={onClose}
      />

      {/* Tabs */}
      <div className="flex border-b border-border bg-secondary/30">
        <button
          onClick={() => setActiveTab('server')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2',
            activeTab === 'server'
              ? 'bg-accent text-foreground border-primary'
              : 'border-transparent text-muted-foreground hover:bg-accent/50'
          )}
        >
          <Server size={16} />
          Serveurs
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2',
            activeTab === 'users'
              ? 'bg-accent text-foreground border-primary'
              : 'border-transparent text-muted-foreground hover:bg-accent/50'
          )}
        >
          <Users size={16} />
          Utilisateurs
        </button>
        <button
          onClick={() => setActiveTab('connections')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2',
            activeTab === 'connections'
              ? 'bg-accent text-foreground border-primary'
              : 'border-transparent text-muted-foreground hover:bg-accent/50'
          )}
        >
          <Wifi size={16} />
          Connexions
        </button>
      </div>

      <DialogContent className="max-h-[65vh]">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-success/10 border border-success/50 rounded-lg text-success text-sm flex items-center gap-2">
            <Check size={16} />
            {successMessage}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="text-primary animate-spin" />
          </div>
        ) : (
          <>
            {/* Server Tab */}
            {activeTab === 'server' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm text-muted-foreground">Serveurs VPN disponibles</h3>
                  <button
                    onClick={fetchData}
                    className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                    title="Actualiser"
                  >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  </button>
                </div>

                {servers.length > 0 ? (
                  <div className="space-y-3">
                    {servers.map((server) => (
                      <div
                        key={server.name}
                        className="p-4 bg-secondary/60 rounded-xl border border-border"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{getServerIcon(server.name)}</div>
                            <div>
                              <h4 className="text-foreground font-medium">{getServerDisplayName(server.name)}</h4>
                              <p className="text-xs text-muted-foreground">{getServerDescription(server.name)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={getServerStateBadgeVariant(server.state)}>
                              {getServerStateLabel(server.state)}
                            </Badge>
                            {server.connection_count !== undefined && server.connection_count > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {server.connection_count} conn.
                              </span>
                            )}
                            <button
                              onClick={() => toggleServer(server.name, server.state)}
                              disabled={togglingServer === server.name || server.state === 'starting' || server.state === 'stopping'}
                              className="p-2 rounded-lg transition-colors hover:bg-accent disabled:opacity-50"
                              title={server.state === 'started' ? 'Arrêter' : 'Démarrer'}
                            >
                              {togglingServer === server.name ? (
                                <Loader2 size={18} className="text-primary animate-spin" />
                              ) : (
                                <Power size={18} className={server.state === 'started' ? 'text-success' : 'text-muted-foreground'} />
                              )}
                            </button>
                          </div>
                        </div>

                        {server.name === 'pptp' && server.state === 'started' && (
                          <div className="mt-3 p-2 bg-warning/10 border border-warning/50 rounded-lg">
                            <p className="text-xs text-warning">
                              ⚠️ PPTP est considéré comme non sécurisé. Préférez WireGuard ou OpenVPN.
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Server size={40} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Aucun serveur VPN disponible</p>
                    <p className="text-xs mt-1">Vérifiez que votre Freebox supporte les serveurs VPN</p>
                  </div>
                )}

                <div className="p-4 bg-primary/10 border border-primary/50 rounded-lg">
                  <p className="text-xs text-primary">
                    <strong>WireGuard</strong> : Protocole moderne recommandé<br />
                    <strong>OpenVPN</strong> : Compatible avec plus de clients<br />
                    <strong>PPTP</strong> : À éviter - non sécurisé
                  </p>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="p-4 bg-secondary/60 rounded-xl border border-border space-y-3">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Plus size={16} className="text-primary" />
                    Nouvel utilisateur
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="block text-xs mb-1">Login *</Label>
                      <Input
                        type="text"
                        value={newUser.login}
                        onChange={(e) => setNewUser({ ...newUser, login: e.target.value })}
                        placeholder="nom_utilisateur"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="block text-xs mb-1">Mot de passe * (8-32 car.)</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={newUser.password}
                          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                          placeholder="••••••••"
                          className="pr-10 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="block text-xs mb-1">IP réservée (optionnel)</Label>
                    <Input
                      type="text"
                      value={newUser.ip_reservation}
                      onChange={(e) => setNewUser({ ...newUser, ip_reservation: e.target.value })}
                      placeholder="ex: 192.168.27.10"
                      className="text-sm font-mono"
                    />
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    onClick={createUser}
                    disabled={savingUser || !newUser.login || !newUser.password}
                    icon={savingUser ? undefined : Plus}
                    className="w-full"
                  >
                    {savingUser && <Loader2 size={16} className="animate-spin" />}
                    Créer l'utilisateur
                  </Button>
                </div>

                {users.length > 0 ? (
                  <div className="space-y-2">
                    <h3 className="text-sm text-muted-foreground px-1">
                      Utilisateurs ({users.length})
                    </h3>
                    {users.map((user) => (
                      <div
                        key={user.login}
                        className="flex items-center justify-between p-4 bg-secondary/60 rounded-xl border border-border group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <Users size={18} className="text-primary" />
                          </div>
                          <div>
                            <span className="text-foreground font-medium">{user.login}</span>
                            {user.ip_reservation && (
                              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                IP: {user.ip_reservation}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {servers.some(s => s.name.includes('openvpn') && s.state === 'started') && (
                            <button
                              onClick={() => {
                                const openVpnServer = servers.find(s => s.name.includes('openvpn') && s.state === 'started');
                                if (openVpnServer) downloadConfig(user.login, openVpnServer.name);
                              }}
                              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title="Télécharger config OpenVPN"
                            >
                              <Download size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => copyToClipboard(user.login, user.login)}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                            title="Copier le login"
                          >
                            {copiedLogin === user.login ? (
                              <Check size={16} className="text-success" />
                            ) : (
                              <Copy size={16} />
                            )}
                          </button>
                          <button
                            onClick={() => deleteUser(user.login)}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users size={40} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Aucun utilisateur VPN configuré</p>
                    <p className="text-xs mt-1">Créez un utilisateur pour activer l'accès VPN</p>
                  </div>
                )}
              </div>
            )}

            {/* Connections Tab */}
            {activeTab === 'connections' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm text-muted-foreground">Connexions actives</h3>
                  <button
                    onClick={fetchData}
                    className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                    title="Actualiser"
                  >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  </button>
                </div>

                {connections.length > 0 ? (
                  <div className="space-y-2">
                    {connections.map((conn) => (
                      <div
                        key={conn.id}
                        className="p-4 bg-secondary/60 rounded-xl border border-border"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                              <Wifi size={16} className="text-success" />
                            </div>
                            <div>
                              <span className="text-foreground font-medium">{conn.user}</span>
                              <p className="text-xs text-muted-foreground">{conn.vpn}</p>
                            </div>
                          </div>
                          <Badge variant="success">Connecté</Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-xs">
                          <div>
                            <span className="text-muted-foreground">IP source</span>
                            <p className="text-foreground font-mono mt-0.5">{conn.src_ip}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">IP locale</span>
                            <p className="text-foreground font-mono mt-0.5">{conn.local_ip || '--'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Trafic</span>
                            <p className="text-foreground mt-0.5">
                              ↓{formatBytes(conn.rx_bytes)} ↑{formatBytes(conn.tx_bytes)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Durée</span>
                            <p className="text-foreground mt-0.5">{formatDuration(conn.auth_time)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wifi size={40} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Aucune connexion VPN active</p>
                    <p className="text-xs mt-1">Les clients connectés apparaîtront ici</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VpnModal;
