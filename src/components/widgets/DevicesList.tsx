import React from 'react';
import {
  Smartphone,
  Laptop,
  Monitor,
  Tv,
  Globe,
  Tablet,
  Car,
  Wifi,
  Cable,
  Signal,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import type { Device } from '../../types';

interface DevicesListProps {
  devices: Device[];
  onDeviceClick?: (device: Device) => void;
}

const DeviceIcon: React.FC<{ type: Device['type']; active?: boolean }> = ({
  type,
  active = true
}) => {
  const iconProps = { size: 18, className: active ? 'text-foreground/80' : 'text-muted-foreground' };

  switch (type) {
    case 'phone':
      return <Smartphone {...iconProps} />;
    case 'tablet':
      return <Tablet {...iconProps} />;
    case 'laptop':
      return <Laptop {...iconProps} />;
    case 'desktop':
      return <Monitor {...iconProps} />;
    case 'tv':
      return <Tv {...iconProps} />;
    case 'car':
      return <Car {...iconProps} />;
    case 'repeater':
      return <Wifi {...iconProps} />;
    case 'iot':
    default:
      return <Globe {...iconProps} />;
  }
};

export const DevicesList: React.FC<DevicesListProps> = ({ devices, onDeviceClick }) => {
  const activeDevices = devices.filter(d => d.active);
  const inactiveDevices = devices.filter(d => !d.active);
  const allDevices = [...activeDevices, ...inactiveDevices];

  const wifiCount = activeDevices.filter(d => d.connection === 'wifi').length;
  const ethernetCount = activeDevices.filter(d => d.connection === 'ethernet').length;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex justify-between text-xs px-1 mb-3">
        <span className="text-success font-medium">
          Appareils {activeDevices.length}/{devices.length}
        </span>
        <span className="text-muted-foreground text-[10px] flex items-center gap-2">
          <span className="flex items-center gap-1">
            <Signal size={10} className="text-primary" />
            {wifiCount}
          </span>
          <span className="flex items-center gap-1">
            <Cable size={10} className="text-success" />
            {ethernetCount}
          </span>
        </span>
      </div>

      {/* Device Grid - Small Cards Style */}
      <div className="grid grid-cols-1 gap-2">
        {allDevices.map((dev) => (
          <div
            key={dev.id}
            onClick={() => onDeviceClick?.(dev)}
            className={`
              flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
              ${dev.active
                ? 'bg-secondary/40 border-border hover:bg-accent hover:border-border'
                : 'bg-secondary/20 border-border/50 opacity-60 hover:opacity-80'
              }
            `}
          >
            {/* Left: Icon + Name */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`
                p-2 rounded-lg
                ${dev.active ? 'bg-secondary' : 'bg-secondary/40'}
              `}>
                <DeviceIcon type={dev.type} active={dev.active} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className={`text-sm font-medium truncate ${dev.active ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {dev.name}
                </span>
                <div className="flex items-center gap-2">
                  {dev.ip && (
                    <span className="font-data text-[10px] text-muted-foreground font-mono">{dev.ip}</span>
                  )}
                  {dev.vendor && (
                    <span className="text-[10px] text-muted-foreground/70 truncate max-w-24">{dev.vendor}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Speed + Connection type or Offline */}
            {dev.active ? (
              <div className="flex items-center gap-2">
                {/* Speed indicators (only show if there's traffic) */}
                {(dev.speedDown > 0 || dev.speedUp > 0) && (
                  <div className="font-data flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <ArrowDown size={10} className="text-primary" />
                      {dev.speedDown.toFixed(1)}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <ArrowUp size={10} className="text-success" />
                      {dev.speedUp.toFixed(1)}
                    </span>
                  </div>
                )}
                {/* Connection type badge */}
                <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                  dev.connection === 'wifi'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-success/10 text-success'
                }`}>
                  {dev.connection === 'wifi' ? (
                    <Signal size={12} />
                  ) : (
                    <Cable size={12} />
                  )}
                  <span>{dev.connection === 'wifi' ? 'WiFi' : 'Eth'}</span>
                </div>
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground bg-secondary/60 px-2 py-1 rounded">
                Hors-ligne
              </span>
            )}
          </div>
        ))}
      </div>

      {devices.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Aucun appareil connecté
        </div>
      )}
    </div>
  );
};