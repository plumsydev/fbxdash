import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  Edit2,
  Save,
  Loader2,
  AlertCircle,
  Check,
  Globe,
  Server,
  Power
} from 'lucide-react';
import { api } from '../../api/client';
import { API_ROUTES } from '../../utils/constants';
import type { Device } from '../../types';
import { Dialog, DialogHeader, DialogContent, Button, Toggle, Label, Badge, Input } from '../ui';

interface PortForwardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices?: Device[];
}

// Port forwarding rule
interface PortForwardingRule {
  id: number;
  enabled: boolean;
  comment?: string;
  lan_port: number;
  wan_port_start: number;
  wan_port_end?: number;
  lan_ip: string;
  ip_proto: 'tcp' | 'udp' | 'tcp_udp';
  src_ip?: string;
}

// DMZ config
interface DmzConfig {
  enabled: boolean;
  ip: string;
}

export const PortForwardingModal: React.FC<PortForwardingModalProps> = ({
  isOpen,
  onClose,
  devices = []
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'dmz'>('rules');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Rules state
  const [rules, setRules] = useState<PortForwardingRule[]>([]);
  const [editingRule, setEditingRule] = useState<PortForwardingRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // New rule form
  const [newRule, setNewRule] = useState<Partial<PortForwardingRule>>({
    enabled: true,
    ip_proto: 'tcp',
    wan_port_start: 0,
    lan_port: 0,
    lan_ip: '',
    comment: ''
  });

  // DMZ config
  const [dmzConfig, setDmzConfig] = useState<DmzConfig | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch port forwarding rules
      const rulesRes = await api.get<PortForwardingRule[]>(`${API_ROUTES.SETTINGS_NAT}/redirections`);
      if (rulesRes.success && rulesRes.result) {
        setRules(rulesRes.result);
      }

      // Fetch DMZ config
      const dmzRes = await api.get<DmzConfig>(`${API_ROUTES.SETTINGS_NAT}/dmz`);
      if (dmzRes.success && dmzRes.result) {
        setDmzConfig(dmzRes.result);
      }
    } catch (err) {
      const errorCode = (err as { error_code?: string })?.error_code;
      if (errorCode === 'insufficient_rights') {
        setError('Droits insuffisants. Veuillez réenregistrer l\'application avec les droits "Modification des réglages".');
      } else {
        setError('Erreur lors du chargement des règles de pare-feu');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  // Create new rule
  const handleCreateRule = async () => {
    if (!newRule.lan_ip || !newRule.wan_port_start || !newRule.lan_port) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post<PortForwardingRule>(`${API_ROUTES.SETTINGS_NAT}/redirections`, {
        enabled: newRule.enabled,
        ip_proto: newRule.ip_proto,
        wan_port_start: newRule.wan_port_start,
        wan_port_end: newRule.wan_port_end || newRule.wan_port_start,
        lan_port: newRule.lan_port,
        lan_ip: newRule.lan_ip,
        comment: newRule.comment || '',
        src_ip: newRule.src_ip || ''
      });

      if (response.success && response.result) {
        setRules([...rules, response.result]);
        setIsCreating(false);
        setNewRule({
          enabled: true,
          ip_proto: 'tcp',
          wan_port_start: 0,
          lan_port: 0,
          lan_ip: '',
          comment: ''
        });
        showSuccess('Règle créée avec succès');
      } else {
        setError(response.error?.message || 'Erreur lors de la création');
      }
    } catch {
      setError('Erreur lors de la création de la règle');
    } finally {
      setIsLoading(false);
    }
  };

  // Update rule
  const handleUpdateRule = async (rule: PortForwardingRule) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.put<PortForwardingRule>(`${API_ROUTES.SETTINGS_NAT}/redirections/${rule.id}`, {
        enabled: rule.enabled,
        ip_proto: rule.ip_proto,
        wan_port_start: rule.wan_port_start,
        wan_port_end: rule.wan_port_end || rule.wan_port_start,
        lan_port: rule.lan_port,
        lan_ip: rule.lan_ip,
        comment: rule.comment || ''
      });

      if (response.success && response.result) {
        setRules(rules.map(r => r.id === rule.id ? response.result! : r));
        setEditingRule(null);
        showSuccess('Règle mise à jour');
      } else {
        setError(response.error?.message || 'Erreur lors de la mise à jour');
      }
    } catch {
      setError('Erreur lors de la mise à jour');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle rule enabled
  const handleToggleRule = async (rule: PortForwardingRule) => {
    await handleUpdateRule({ ...rule, enabled: !rule.enabled });
  };

  // Delete rule
  const handleDeleteRule = async (id: number) => {
    if (!confirm('Supprimer cette règle de redirection ?')) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.delete(`${API_ROUTES.SETTINGS_NAT}/redirections/${id}`);
      if (response.success) {
        setRules(rules.filter(r => r.id !== id));
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

  // Update DMZ config
  const handleUpdateDmz = async () => {
    if (!dmzConfig) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.put<DmzConfig>(`${API_ROUTES.SETTINGS_NAT}/dmz`, dmzConfig);
      if (response.success) {
        showSuccess('Configuration DMZ mise à jour');
      } else {
        setError(response.error?.message || 'Erreur lors de la mise à jour');
      }
    } catch {
      setError('Erreur lors de la mise à jour');
    } finally {
      setIsLoading(false);
    }
  };

  // Get protocol label
  const getProtoLabel = (proto: string) => {
    switch (proto) {
      case 'tcp': return 'TCP';
      case 'udp': return 'UDP';
      case 'tcp_udp': return 'TCP+UDP';
      default: return proto.toUpperCase();
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="max-w-4xl">
      <DialogHeader
        title="Pare-feu"
        description="Redirection de ports et DMZ"
        icon={<Shield size={20} className="text-warning" />}
        onClose={onClose}
      />

      {/* Tabs */}
      <div className="flex border-b border-border px-5">
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'rules'
              ? 'text-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Server size={16} />
          Redirections
        </button>
        <button
          onClick={() => setActiveTab('dmz')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'dmz'
              ? 'text-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Globe size={16} />
          DMZ
        </button>
      </div>

      <DialogContent className="max-h-[calc(90vh-9rem)]">
          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/50 rounded-lg flex items-center gap-2">
              <AlertCircle size={16} className="text-destructive" />
              <span className="text-sm text-destructive">{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-4 p-3 bg-success/10 border border-success/50 rounded-lg flex items-center gap-2">
              <Check size={16} className="text-success" />
              <span className="text-sm text-success">{success}</span>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="text-muted-foreground animate-spin" />
            </div>
          )}

          {/* Rules Tab */}
          {!isLoading && activeTab === 'rules' && (
            <div className="space-y-4">
              {/* Add new rule button */}
              {!isCreating && (
                <Button onClick={() => setIsCreating(true)} icon={Plus} variant="primary">
                  Nouvelle redirection
                </Button>
              )}

              {/* New rule form */}
              {isCreating && (
                <div className="p-4 bg-secondary/60 rounded-xl border border-border space-y-4">
                  <h3 className="text-sm font-medium text-foreground">Nouvelle redirection de port</h3>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Protocol */}
                    <div>
                      <Label className="block text-xs mb-1">Protocole</Label>
                      <select
                        value={newRule.ip_proto}
                        onChange={(e) => setNewRule({ ...newRule, ip_proto: e.target.value as 'tcp' | 'udp' | 'tcp_udp' })}
                        className="w-full rounded-lg border border-input bg-secondary/50 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors"
                      >
                        <option value="tcp">TCP</option>
                        <option value="udp">UDP</option>
                        <option value="tcp_udp">TCP + UDP</option>
                      </select>
                    </div>

                    {/* WAN Port */}
                    <div>
                      <Label className="block text-xs mb-1">Port externe (WAN)</Label>
                      <Input
                        type="number"
                        value={newRule.wan_port_start || ''}
                        onChange={(e) => setNewRule({ ...newRule, wan_port_start: parseInt(e.target.value) || 0 })}
                        placeholder="Ex: 8080"
                        min="1"
                        max="65535"
                      />
                    </div>

                    {/* LAN IP */}
                    <div>
                      <Label className="block text-xs mb-1">IP destination (LAN)</Label>
                      <select
                        value={newRule.lan_ip}
                        onChange={(e) => setNewRule({ ...newRule, lan_ip: e.target.value })}
                        className="w-full rounded-lg border border-input bg-secondary/50 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors"
                      >
                        <option value="">Sélectionner un appareil...</option>
                        {devices.filter(d => d.ip).map((device) => (
                          <option key={device.id} value={device.ip!}>
                            {device.name} ({device.ip})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* LAN Port */}
                    <div>
                      <Label className="block text-xs mb-1">Port destination (LAN)</Label>
                      <Input
                        type="number"
                        value={newRule.lan_port || ''}
                        onChange={(e) => setNewRule({ ...newRule, lan_port: parseInt(e.target.value) || 0 })}
                        placeholder="Ex: 80"
                        min="1"
                        max="65535"
                      />
                    </div>
                  </div>

                  {/* Comment */}
                  <div>
                    <Label className="block text-xs mb-1">Commentaire (optionnel)</Label>
                    <Input
                      type="text"
                      value={newRule.comment || ''}
                      onChange={(e) => setNewRule({ ...newRule, comment: e.target.value })}
                      placeholder="Ex: Serveur web"
                    />
                  </div>

                  {/* Enabled toggle */}
                  <div className="flex items-center gap-3">
                    <Toggle
                      checked={!!newRule.enabled}
                      onChange={(checked) => setNewRule({ ...newRule, enabled: checked })}
                    />
                    <span className="text-sm text-foreground">Activer immédiatement</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button onClick={handleCreateRule} disabled={isLoading} icon={Save} variant="primary">
                      Créer
                    </Button>
                    <Button
                      onClick={() => {
                        setIsCreating(false);
                        setNewRule({
                          enabled: true,
                          ip_proto: 'tcp',
                          wan_port_start: 0,
                          lan_port: 0,
                          lan_ip: '',
                          comment: ''
                        });
                      }}
                      variant="default"
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              )}

              {/* Rules list */}
              <div className="space-y-2">
                {rules.length === 0 && !isCreating && (
                  <div className="py-8 text-center text-muted-foreground">
                    <Server size={32} className="mx-auto mb-2 opacity-50" />
                    <p>Aucune redirection de port configurée</p>
                    <p className="text-xs mt-1">Les redirections permettent d'exposer des services internes sur Internet</p>
                  </div>
                )}

                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-4 bg-secondary/60 rounded-xl border border-border group hover:bg-accent/50 transition-colors"
                  >
                    {editingRule?.id === rule.id ? (
                      // Edit mode
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <select
                            value={editingRule.ip_proto}
                            onChange={(e) => setEditingRule({ ...editingRule, ip_proto: e.target.value as 'tcp' | 'udp' | 'tcp_udp' })}
                            className="rounded-lg border border-input bg-secondary/50 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors"
                          >
                            <option value="tcp">TCP</option>
                            <option value="udp">UDP</option>
                            <option value="tcp_udp">TCP + UDP</option>
                          </select>
                          <Input
                            type="number"
                            value={editingRule.wan_port_start}
                            onChange={(e) => setEditingRule({ ...editingRule, wan_port_start: parseInt(e.target.value) || 0 })}
                            placeholder="Port WAN"
                          />
                          <Input
                            type="text"
                            value={editingRule.lan_ip}
                            onChange={(e) => setEditingRule({ ...editingRule, lan_ip: e.target.value })}
                            placeholder="IP LAN"
                            className="font-mono"
                          />
                          <Input
                            type="number"
                            value={editingRule.lan_port}
                            onChange={(e) => setEditingRule({ ...editingRule, lan_port: parseInt(e.target.value) || 0 })}
                            placeholder="Port LAN"
                          />
                        </div>
                        <Input
                          type="text"
                          value={editingRule.comment || ''}
                          onChange={(e) => setEditingRule({ ...editingRule, comment: e.target.value })}
                          placeholder="Commentaire"
                        />
                        <div className="flex gap-2">
                          <Button onClick={() => handleUpdateRule(editingRule)} icon={Save} variant="primary">
                            Enregistrer
                          </Button>
                          <Button onClick={() => setEditingRule(null)} variant="default">
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleToggleRule(rule)}
                              className={`p-1 rounded transition-colors ${
                                rule.enabled
                                  ? 'text-success hover:bg-success/10'
                                  : 'text-muted-foreground hover:bg-accent'
                              }`}
                              title={rule.enabled ? 'Désactiver' : 'Activer'}
                            >
                              <Power size={16} />
                            </button>
                            <h4 className="text-sm font-medium text-foreground">
                              {rule.comment || `Port ${rule.wan_port_start}`}
                            </h4>
                            <Badge variant="info">{getProtoLabel(rule.ip_proto)}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 ml-8">
                            :{rule.wan_port_start}{rule.wan_port_end && rule.wan_port_end !== rule.wan_port_start ? `-${rule.wan_port_end}` : ''} → {rule.lan_ip}:{rule.lan_port}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingRule(rule)}
                            className="p-2 hover:bg-accent rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit2 size={14} className="text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={14} className="text-destructive" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DMZ Tab */}
          {!isLoading && activeTab === 'dmz' && (
            <div className="space-y-4">
              <div className="p-4 bg-secondary/60 rounded-xl border border-border">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-warning/10 rounded-lg">
                    <Globe size={20} className="text-warning" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Zone démilitarisée (DMZ)</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Expose un appareil directement sur Internet. Utilisez avec précaution !
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-warning/10 border border-warning/50 rounded-lg mb-4">
                  <p className="text-xs text-warning">
                    <strong>Attention :</strong> L'appareil en DMZ est exposé sans protection du pare-feu.
                    Utilisez uniquement si vous savez ce que vous faites.
                  </p>
                </div>

                {dmzConfig && (
                  <div className="space-y-4">
                    {/* Enable toggle */}
                    <div className="flex items-center justify-between py-3 border-b border-border">
                      <span className="text-sm text-foreground">Activer la DMZ</span>
                      <Toggle
                        checked={dmzConfig.enabled}
                        onChange={(checked) => setDmzConfig({ ...dmzConfig, enabled: checked })}
                      />
                    </div>

                    {/* IP selection */}
                    <div>
                      <Label className="block text-xs mb-1">Appareil en DMZ</Label>
                      <select
                        value={dmzConfig.ip}
                        onChange={(e) => setDmzConfig({ ...dmzConfig, ip: e.target.value })}
                        disabled={!dmzConfig.enabled}
                        className={`w-full rounded-lg border border-input bg-secondary/50 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors ${
                          !dmzConfig.enabled ? 'opacity-50' : ''
                        }`}
                      >
                        <option value="">Aucun appareil</option>
                        {devices.filter(d => d.ip).map((device) => (
                          <option key={device.id} value={device.ip!}>
                            {device.name} ({device.ip})
                          </option>
                        ))}
                      </select>
                    </div>

                    <Button onClick={handleUpdateDmz} disabled={isLoading} icon={Save} variant="primary">
                      Enregistrer
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
      </DialogContent>
    </Dialog>
  );
};

export default PortForwardingModal;