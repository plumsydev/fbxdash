import React, { useState, useEffect } from 'react';
import { QrCode, X, Copy, Check, Wifi, Eye, EyeOff } from 'lucide-react';
import { Toggle } from '../ui/Toggle';
import type { WifiNetwork } from '../../types';

interface WifiPanelProps {
  networks: WifiNetwork[];
  totalDevices?: number;
  onToggle?: (id: string, enabled: boolean) => void;
}

// Generate WiFi connection string for QR code (standard format)
const generateWifiString = (ssid: string, password: string, security: string = 'WPA'): string => {
  // Escape special characters in SSID and password
  const escapeString = (str: string) => str.replace(/([\\;,:"'])/g, '\\$1');
  return `WIFI:T:${security};S:${escapeString(ssid)};P:${escapeString(password)};;`;
};

// QR Code Modal component
const QrCodeModal: React.FC<{
  network: WifiNetwork;
  onClose: () => void;
}> = ({ network, onClose }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  // Generate QR code URL when password changes
  useEffect(() => {
    if (password.length >= 8) {
      const wifiString = generateWifiString(network.ssid, password);
      // Use QR Server API to generate QR code
      const encodedData = encodeURIComponent(wifiString);
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedData}&bgcolor=ffffff&color=000000&margin=10`);
    } else {
      setQrUrl(null);
    }
  }, [password, network.ssid]);

  const handleCopyPassword = () => {
    if (password) {
      navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden max-w-sm w-full">
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/40">
          <div className="flex items-center gap-2">
            <Wifi size={20} className="text-primary" />
            <span className="font-medium text-foreground">Connexion WiFi</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center">
          {/* Network info */}
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-foreground">{network.ssid}</h3>
            <p className="text-sm text-muted-foreground">{network.band} - Canal {network.channel}</p>
          </div>

          {/* Password input */}
          <div className="w-full mb-4">
            <label className="text-xs text-muted-foreground mb-1 block">Mot de passe WiFi</label>
            <div className="flex items-center gap-2 bg-secondary/60 rounded-lg p-3 border border-border">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez le mot de passe"
                className="flex-1 bg-transparent text-sm text-foreground font-mono focus:outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="p-1.5 hover:bg-accent rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                title={showPassword ? 'Masquer' : 'Afficher'}
              >
                {showPassword ? (
                  <EyeOff size={16} className="text-muted-foreground" />
                ) : (
                  <Eye size={16} className="text-muted-foreground" />
                )}
              </button>
              {password && (
                <button
                  onClick={handleCopyPassword}
                  className="p-1.5 hover:bg-accent rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  title="Copier"
                >
                  {copied ? (
                    <Check size={16} className="text-success" />
                  ) : (
                    <Copy size={16} className="text-muted-foreground" />
                  )}
                </button>
              )}
            </div>
            {password.length > 0 && password.length < 8 && (
              <p className="text-xs text-warning mt-1">Le mot de passe doit contenir au moins 8 caractères</p>
            )}
          </div>

          {/* QR Code */}
          <div className="bg-white p-4 rounded-xl mb-4 min-h-[232px] min-w-[232px] flex items-center justify-center">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="QR Code WiFi"
                className="w-[200px] h-[200px]"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-[200px] h-[200px] flex items-center justify-center bg-black/5 rounded-lg">
                <div className="text-center text-black/40">
                  <QrCode size={48} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Entrez le mot de passe<br />pour générer le QR code</p>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {qrUrl
              ? 'Scannez ce QR code avec votre appareil pour vous connecter automatiquement'
              : 'L\'API Freebox ne retourne pas les mots de passe WiFi pour des raisons de sécurité'}
          </p>
        </div>
      </div>
    </div>
  );
};

export const WifiPanel: React.FC<WifiPanelProps> = ({ networks, onToggle }) => {
  const [selectedNetwork, setSelectedNetwork] = useState<WifiNetwork | null>(null);

  // Handle WiFi toggle with confirmation - warns that it may restart WiFi module
  const handleToggle = (net: WifiNetwork, enabled: boolean) => {
    const action = enabled ? 'activer' : 'désactiver';
    const confirmed = window.confirm(
      `⚠️ Attention !\n\nVous allez ${action} le réseau WiFi "${net.ssid}" (${net.band}).\n\nCette action peut redémarrer le module WiFi de la Freebox et couper temporairement toutes les connexions WiFi.\n\nContinuer ?`
    );
    if (!confirmed) return;
    onToggle?.(net.id, enabled);
  };

  return (
    <>
      <div className="space-y-4">
        {networks.map((net) => {
          // Use device count and load from network (computed in store)
          const deviceCount = net.connectedDevices;
          const estimatedLoad = net.load;

          return (
            <div key={net.id} className="bg-card rounded-lg p-3 border border-border">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    SSID <span className="text-foreground">{net.ssid}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    WIFI {net.band} / {net.channelWidth} MHz / Canal {net.channel || 'Auto'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Toggle
                    checked={net.active}
                    onChange={(checked) => handleToggle(net, checked)}
                    size="sm"
                  />
                  <button
                    onClick={() => setSelectedNetwork(net)}
                    className="p-1.5 hover:bg-accent rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    title="Afficher QR code"
                  >
                    <QrCode size={18} className="text-muted-foreground hover:text-foreground transition-colors" />
                  </button>
                </div>
              </div>

              {/* Signal bars */}
              <div className="flex items-end gap-[2px] h-8 mt-2">
                {Array.from({ length: 40 }).map((_, idx) => {
                  const isActive = idx < (estimatedLoad / 100) * 40;
                  const baseHeight = 20 + Math.sin(idx * 0.3) * 15 + Math.random() * 10;

                  return (
                    <div
                      key={idx}
                      className={`w-[2px] rounded-t-sm transition-all duration-500 ${
                        isActive ? 'bg-success' : 'bg-muted'
                      }`}
                      style={{ height: `${Math.max(baseHeight, 20)}%` }}
                    />
                  );
                })}
              </div>

              <div className="flex justify-between mt-2 text-xs text-muted-foreground font-mono">
                <span>Taux d'occupation {estimatedLoad}%</span>
                <span className="text-success">Appareils {deviceCount}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* QR Code Modal */}
      {selectedNetwork && (
        <QrCodeModal
          network={selectedNetwork}
          onClose={() => setSelectedNetwork(null)}
        />
      )}
    </>
  );
};
