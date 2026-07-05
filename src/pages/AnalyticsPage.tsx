import React, { useEffect, useState } from 'react';
import {
  Activity,
  Thermometer,
  Wifi,
  HardDrive,
  Cpu,
  Download,
  Upload,
  Clock,
  Zap,
  Fan,
  Server,
  ChevronLeft,
  BarChart2,
  AlertTriangle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useConnectionStore } from '../stores/connectionStore';
import { useSystemStore } from '../stores/systemStore';
import { useWifiStore } from '../stores/wifiStore';
import { useLanStore } from '../stores/lanStore';
import { useUptimeStore } from '../stores/uptimeStore';
import { useCapabilitiesStore } from '../stores/capabilitiesStore';
import { formatSpeed, formatBitrate } from '../utils/constants';
import type { SystemSensor, SystemFan } from '../types/api';
import { Badge, Progress } from '../components/ui';

type TimeRange = '1h' | '6h' | '24h' | '7d';

const COLORS = {
  blue: '#3b82f6',
  green: '#10b981',
  cyan: '#06b6d4',
  orange: '#f97316',
  red: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  yellow: '#eab308'
};

const PIE_COLORS = [COLORS.blue, COLORS.green, COLORS.cyan, COLORS.orange, COLORS.purple, COLORS.pink];

interface AnalyticsPageProps {
  onBack: () => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onBack }) => {
  const { status, history, extendedHistory, temperatureHistory, rrdPermissionDenied, fetchExtendedHistory, fetchTemperatureHistory } = useConnectionStore();
  const { info, temperatureHistory: systemTempHistory } = useSystemStore();
  const { networks } = useWifiStore();
  const { devices } = useLanStore();
  const { getHistoryForDisplay } = useUptimeStore();
  const { capabilities } = useCapabilitiesStore();

  // Sensor name normalization (clean up API names for display)
  const normalizeSensorName = (id: string, name: string): string => {
    // Clean up common prefixes from API
    const cleaned = name
      .replace(/^Température\s+/i, '')
      .replace(/^Temperature\s+/i, '')
      .trim();

    // Map specific IDs to short display names
    const nameMap: Record<string, string> = {
      'temp_cpu0': 'CPU 0',
      'temp_cpu1': 'CPU 1',
      'temp_cpu2': 'CPU 2',
      'temp_cpu3': 'CPU 3',
      'temp_cpum': 'CPU',
      'temp_cpub': 'CPU Box',
      'temp_sw': 'Switch',
      'temp_hdd': 'Disque',
      'temp_hdd0': 'Disque 1',
      'temp_hdd1': 'Disque 2'
    };

    return nameMap[id] || cleaned || id;
  };

  // Helper to get CPU sensors (API v8+ format)
  const getCpuSensors = (): SystemSensor[] => {
    if (!info) return [];

    // API v8+: sensors array format (already normalized by backend)
    if (info.sensors && Array.isArray(info.sensors)) {
      return info.sensors
        .filter(s => s.id.startsWith('temp_cpu') || s.id.startsWith('cpu'))
        .map(s => ({ ...s, name: normalizeSensorName(s.id, s.name) }))
        .sort((a, b) => a.id.localeCompare(b.id)); // Sort by ID for consistent order
    }

    // Legacy format: build sensors array from individual fields
    const sensors: SystemSensor[] = [];
    if (info.temp_cpu0 != null) sensors.push({ id: 'temp_cpu0', name: 'CPU 0', value: info.temp_cpu0 });
    if (info.temp_cpu1 != null) sensors.push({ id: 'temp_cpu1', name: 'CPU 1', value: info.temp_cpu1 });
    if (info.temp_cpu2 != null) sensors.push({ id: 'temp_cpu2', name: 'CPU 2', value: info.temp_cpu2 });
    if (info.temp_cpu3 != null) sensors.push({ id: 'temp_cpu3', name: 'CPU 3', value: info.temp_cpu3 });
    if (info.temp_cpum != null) sensors.push({ id: 'temp_cpum', name: 'CPU', value: info.temp_cpum });
    if (info.temp_cpub != null) sensors.push({ id: 'temp_cpub', name: 'CPU Box', value: info.temp_cpub });

    return sensors.sort((a, b) => a.id.localeCompare(b.id));
  };

  // Helper to get HDD sensors (API v8+ format)
  const getHddSensors = (): SystemSensor[] => {
    if (!info) return [];

    // API v8+: sensors array format
    if (info.sensors && Array.isArray(info.sensors)) {
      return info.sensors
        .filter(s => s.id.startsWith('temp_hdd') || s.id.includes('disk'))
        .map(s => ({ ...s, name: normalizeSensorName(s.id, s.name) }))
        .sort((a, b) => a.id.localeCompare(b.id));
    }

    return [];
  };

  // Helper to get other temperature sensors (switch, etc.)
  const getOtherSensors = (): SystemSensor[] => {
    if (!info) return [];

    // API v8+: sensors array format
    if (info.sensors && Array.isArray(info.sensors)) {
      return info.sensors
        .filter(s => !s.id.startsWith('temp_cpu') && !s.id.startsWith('cpu') && !s.id.startsWith('temp_hdd') && !s.id.includes('disk'))
        .map(s => ({ ...s, name: normalizeSensorName(s.id, s.name) }))
        .sort((a, b) => a.id.localeCompare(b.id));
    }

    // Legacy format
    const sensors: SystemSensor[] = [];
    if (info.temp_sw != null) sensors.push({ id: 'temp_sw', name: 'Switch', value: info.temp_sw });

    return sensors;
  };

  // Fan name normalization
  const normalizeFanName = (id: string, name: string): string => {
    const nameMap: Record<string, string> = {
      'fan0_speed': 'Ventilateur 1',
      'fan1_speed': 'Ventilateur 2',
      'fan0': 'Ventilateur 1',
      'fan1': 'Ventilateur 2',
      'main': 'Ventilateur',
      'fan': 'Ventilateur',
      'fan_rpm': 'Ventilateur'
    };

    return nameMap[id] || name || id;
  };

  // Helper to get fans (API v8+ format)
  const getFans = (): SystemFan[] => {
    if (!info) return [];

    // API v8+: fans array (normalize names)
    if (info.fans && Array.isArray(info.fans)) {
      return info.fans
        .map(f => ({ ...f, name: normalizeFanName(f.id, f.name) }))
        .sort((a, b) => a.id.localeCompare(b.id));
    }

    // Legacy format: single fan_rpm field
    if (info.fan_rpm != null) {
      return [{ id: 'fan_rpm', name: 'Ventilateur', value: info.fan_rpm }];
    }

    return [];
  };

  // Helper to get average temperature from sensors
  const getAvgTemp = (sensors: SystemSensor[]): number | null => {
    if (sensors.length === 0) return null;
    const avg = sensors.reduce((sum, s) => sum + s.value, 0) / sensors.length;
    return Math.round(avg);
  };

  // Helper to get average fan RPM
  const getAvgFanRpm = (fans: SystemFan[]): number | null => {
    if (fans.length === 0) return null;
    const avg = fans.reduce((sum, f) => sum + f.value, 0) / fans.length;
    return Math.round(avg);
  };

  // Get all sensor data
  const cpuSensors = getCpuSensors();
  const hddSensors = getHddSensors();
  const otherSensors = getOtherSensors();
  const fans = getFans();
  const cpuAvgTemp = getAvgTemp(cpuSensors);
  const hddAvgTemp = getAvgTemp(hddSensors);
  const fanAvgRpm = getAvgFanRpm(fans);

  // Get uptime data from store
  const uptimeHistory = getHistoryForDisplay();
  const uptimePercentage = React.useMemo(() => {
    if (!uptimeHistory.length) return 100;
    const upDays = uptimeHistory.filter(d => d.status === 'up').length;
    return Math.round((upDays / uptimeHistory.length) * 100);
  }, [uptimeHistory]);

  const [activeTab, setActiveTab] = useState<'bandwidth' | 'temperature' | 'wifi' | 'system'>('bandwidth');
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');

  // Fetch extended history on mount and when time range changes
  useEffect(() => {
    const durations: Record<TimeRange, number> = {
      '1h': 3600,
      '6h': 21600,
      '24h': 86400,
      '7d': 604800
    };

    // Initial fetch
    fetchExtendedHistory(durations[timeRange]);
    fetchTemperatureHistory(durations[timeRange]);

    // Auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchExtendedHistory(durations[timeRange]);
      fetchTemperatureHistory(durations[timeRange]);
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [timeRange, fetchExtendedHistory, fetchTemperatureHistory]);

  // Calculate bandwidth stats
  const bandwidthStats = React.useMemo(() => {
    if (!extendedHistory.length) return { avgDown: 0, avgUp: 0, maxDown: 0, maxUp: 0, totalDown: 0, totalUp: 0 };

    const totalDown = extendedHistory.reduce((sum, p) => sum + p.download, 0);
    const totalUp = extendedHistory.reduce((sum, p) => sum + p.upload, 0);
    const maxDown = Math.max(...extendedHistory.map(p => p.download));
    const maxUp = Math.max(...extendedHistory.map(p => p.upload));

    return {
      avgDown: Math.round(totalDown / extendedHistory.length),
      avgUp: Math.round(totalUp / extendedHistory.length),
      maxDown,
      maxUp,
      totalDown,
      totalUp
    };
  }, [extendedHistory]);

  // Calculate temperature stats
  const tempStats = React.useMemo(() => {
    const history = temperatureHistory.length ? temperatureHistory : systemTempHistory;
    if (!history.length) return { avgCpu: 0, maxCpu: 0, avgSw: 0, maxSw: 0 };

    const cpuTemps = history.map(p => p.cpuM || 0).filter(t => t > 0);
    const swTemps = history.map(p => p.sw || 0).filter(t => t > 0);

    return {
      avgCpu: cpuTemps.length ? Math.round(cpuTemps.reduce((a, b) => a + b, 0) / cpuTemps.length) : 0,
      maxCpu: cpuTemps.length ? Math.max(...cpuTemps) : 0,
      avgSw: swTemps.length ? Math.round(swTemps.reduce((a, b) => a + b, 0) / swTemps.length) : 0,
      maxSw: swTemps.length ? Math.max(...swTemps) : 0
    };
  }, [temperatureHistory, systemTempHistory]);

  // Device type distribution for pie chart
  const deviceDistribution = React.useMemo(() => {
    const typeCount: Record<string, number> = {};
    devices.forEach(device => {
      const type = device.type || 'other';
      // Map device type to French label
      const typeLabels: Record<string, string> = {
        phone: 'Téléphone',
        tablet: 'Tablette',
        laptop: 'Ordinateur portable',
        desktop: 'Ordinateur',
        tv: 'TV/Multimédia',
        car: 'Voiture',
        repeater: 'Répéteur',
        iot: 'IoT',
        other: 'Autre'
      };
      const label = typeLabels[type] || 'Autre';
      typeCount[label] = (typeCount[label] || 0) + 1;
    });
    return Object.entries(typeCount).map(([name, value]) => ({ name, value }));
  }, [devices]);

  // WiFi band distribution
  const wifiBandDistribution = React.useMemo(() => {
    return networks.map(network => ({
      name: network.band,
      value: network.connectedDevices,
      ssid: network.ssid
    }));
  }, [networks]);

  // Uptime data for chart
  const uptimeData = React.useMemo(() => {
    return uptimeHistory.slice(-30).map((day, index) => ({
      day: index + 1,
      uptime: day.status === 'up' ? 100 : day.status === 'down' ? 0 : 50,
      status: day.status
    }));
  }, [uptimeHistory]);

  // Format KB/s to Freebox-style speed units (kb/s, Mb/s, Gb/s)
  // Input is in KB/s (kilobytes), we convert to bits for display
  const formatKBSpeed = (kbPerSec: number): string => {
    // Convert KB/s to kb/s (kilobits): KB * 8 = kb
    const kbitsPerSec = kbPerSec * 8;

    if (kbitsPerSec === 0) return '0 kb/s';

    const k = 1000;
    const sizes = ['kb/s', 'Mb/s', 'Gb/s'];

    // Start at kb/s level since input is already in KB
    if (kbitsPerSec < k) return `${Math.round(kbitsPerSec)} kb/s`;

    const i = Math.floor(Math.log(kbitsPerSec) / Math.log(k));
    const value = kbitsPerSec / Math.pow(k, i);
    const decimals = value < 10 ? 1 : 0;
    return `${value.toFixed(decimals)} ${sizes[Math.min(i, sizes.length - 1)]}`;
  };

  const tabs = [
    { id: 'bandwidth' as const, label: 'Bande passante', icon: Activity },
    { id: 'temperature' as const, label: 'Température', icon: Thermometer },
    { id: 'wifi' as const, label: 'WiFi', icon: Wifi },
    { id: 'system' as const, label: 'Système', icon: Server }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border">
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
                <div className="p-2 bg-chart-5/20 rounded-lg">
                  <BarChart2 size={24} className="text-chart-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Analytique</h1>
                  <p className="text-sm text-muted-foreground">Statistiques et graphiques détaillés</p>
                </div>
              </div>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center gap-2 bg-secondary rounded-lg p-1">
              {(['1h', '6h', '24h', '7d'] as TimeRange[]).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    timeRange === range
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-6 max-w-[1920px] mx-auto space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              activeTab === tab.id
                ? 'bg-secondary text-foreground border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Bandwidth Tab */}
      {activeTab === 'bandwidth' && (
        <div className="space-y-6">
          {/* Permission Warning */}
          {rrdPermissionDenied && (
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-warning font-semibold">Permission insuffisante</h4>
                <p className="text-muted-foreground text-sm mt-1">
                  La permission <span className="text-foreground font-medium">"Modification des réglages de la Freebox"</span> est
                  nécessaire pour afficher les statistiques moyennes et maximales des débits.
                </p>
                <p className="text-muted-foreground text-xs mt-2">
                  Allez dans Freebox OS → Paramètres → Gestion des accès → Applications → Sélectionnez cette application et activez la permission.
                </p>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`bg-card rounded-xl p-4 border border-border shadow-sm ${rrdPermissionDenied ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Download className="w-4 h-4 text-primary" />
                Débit moyen ↓
              </div>
              <div className="text-2xl font-bold text-foreground">
                {rrdPermissionDenied ? 'N/A' : formatSpeed(bandwidthStats.avgDown * 1024)}
              </div>
            </div>
            <div className={`bg-card rounded-xl p-4 border border-border shadow-sm ${rrdPermissionDenied ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Upload className="w-4 h-4 text-success" />
                Débit moyen ↑
              </div>
              <div className="text-2xl font-bold text-foreground">
                {rrdPermissionDenied ? 'N/A' : formatSpeed(bandwidthStats.avgUp * 1024)}
              </div>
            </div>
            <div className={`bg-card rounded-xl p-4 border border-border shadow-sm ${rrdPermissionDenied ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Zap className="w-4 h-4 text-primary" />
                Débit max ↓
              </div>
              <div className="text-2xl font-bold text-foreground">
                {rrdPermissionDenied ? 'N/A' : formatSpeed(bandwidthStats.maxDown * 1024)}
              </div>
            </div>
            <div className={`bg-card rounded-xl p-4 border border-border shadow-sm ${rrdPermissionDenied ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Zap className="w-4 h-4 text-success" />
                Débit max ↑
              </div>
              <div className="text-2xl font-bold text-foreground">
                {rrdPermissionDenied ? 'N/A' : formatSpeed(bandwidthStats.maxUp * 1024)}
              </div>
            </div>
          </div>

          {/* Current Speed */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground">Débit actuel descendant</span>
                <Download className="w-5 h-5 text-primary" />
              </div>
              <div className="text-4xl font-bold text-primary">
                {status ? formatSpeed(status.rate_down) : '0 bps'}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Bande passante: {status ? formatBitrate(status.bandwidth_down) : 'N/A'}
              </div>
            </div>
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground">Débit actuel montant</span>
                <Upload className="w-5 h-5 text-success" />
              </div>
              <div className="text-4xl font-bold text-success">
                {status ? formatSpeed(status.rate_up) : '0 bps'}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Bande passante: {status ? formatBitrate(status.bandwidth_up) : 'N/A'}
              </div>
            </div>
          </div>

          {/* Bandwidth Chart */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {extendedHistory.length > 0 ? 'Historique bande passante' : 'Bande passante temps réel'}
              </h3>
              <span className="text-xs text-muted-foreground">
                {extendedHistory.length > 0
                  ? `${extendedHistory.length} points (RRD)`
                  : `${history.length} points (live)`}
              </span>
            </div>
            <div className="h-80">
              {(extendedHistory.length > 0 || history.length > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={extendedHistory.length > 0 ? extendedHistory : history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="time"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      tickFormatter={(value) => formatKBSpeed(value).split(' ')[0]}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                      formatter={(value: number, _name: string, props: { dataKey: string }) => {
                        const label = props.dataKey === 'download' ? 'Descendant' : 'Montant';
                        const color = props.dataKey === 'download' ? COLORS.blue : COLORS.green;
                        return [
                          <span style={{ color }}>{formatKBSpeed(value)}</span>,
                          label
                        ];
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="download"
                      stackId="1"
                      stroke={COLORS.blue}
                      fill={COLORS.blue}
                      fillOpacity={0.3}
                      name="Descendant"
                    />
                    <Area
                      type="monotone"
                      dataKey="upload"
                      stackId="2"
                      stroke={COLORS.green}
                      fill={COLORS.green}
                      fillOpacity={0.3}
                      name="Montant"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <Activity className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm">Collecte des données en cours...</p>
                  <p className="text-xs mt-1">Le graphique se remplira automatiquement</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Temperature Tab */}
      {activeTab === 'temperature' && (
        <div className="space-y-6">
          {/* Stats summary cards - always 4 columns on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CPU Temperature */}
            <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Cpu className="w-4 h-4 text-warning" />
                CPU {cpuSensors.length > 1 ? '(Moyenne)' : ''}
              </div>
              <div className="text-2xl font-bold text-foreground">
                {cpuAvgTemp != null ? `${cpuAvgTemp}°C` : 'N/A'}
              </div>
              {cpuSensors.length > 1 && (
                <div className="text-xs text-muted-foreground mt-1">
                  {cpuSensors.length} capteurs
                </div>
              )}
            </div>

            {/* Max CPU Temp */}
            <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Thermometer className="w-4 h-4 text-destructive" />
                CPU Max
              </div>
              <div className="text-2xl font-bold text-foreground">
                {cpuSensors.length > 0 ? `${Math.max(...cpuSensors.map(s => s.value))}°C` : 'N/A'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Pic actuel
              </div>
            </div>

            {/* Fan Speed */}
            <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Fan className="w-4 h-4 text-chart-3" />
                Ventilateur {fans.length > 1 ? '(Moyenne)' : ''}
              </div>
              <div className="text-2xl font-bold text-foreground">
                {fanAvgRpm != null ? `${fanAvgRpm} T/min` : 'N/A'}
              </div>
              {fans.length > 1 && (
                <div className="text-xs text-muted-foreground mt-1">
                  {fans.length} ventilateurs
                </div>
              )}
            </div>

            {/* HDD Temperature or placeholder */}
            {hddSensors.length > 0 ? (
              <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                  <HardDrive className="w-4 h-4 text-primary" />
                  Disque {hddSensors.length > 1 ? '(Moyenne)' : ''}
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {hddAvgTemp != null ? `${hddAvgTemp}°C` : 'N/A'}
                </div>
                {hddSensors.length > 1 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {hddSensors.length} disques
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                  <Thermometer className="w-4 h-4 text-chart-5" />
                  T° Max historique
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {tempStats.maxCpu > 0 ? `${tempStats.maxCpu}°C` : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Sur la période
                </div>
              </div>
            )}
          </div>

          {/* Detailed Sensors - 2 columns layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* CPU Sensors Detail */}
            {cpuSensors.length > 0 && (
              <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-warning" />
                  Températures CPU
                </h3>
                <div className="space-y-3">
                  {cpuSensors.map((sensor) => (
                    <div key={sensor.id} className="flex justify-between items-center">
                      <span className="text-muted-foreground">{sensor.name}</span>
                      <span className={`font-semibold ${
                        sensor.value > 70 ? 'text-destructive' : sensor.value > 50 ? 'text-warning' : 'text-success'
                      }`}>
                        {sensor.value}°C
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">Moyenne</span>
                      <span className="text-foreground font-semibold">{cpuAvgTemp}°C</span>
                    </div>
                  </div>
                  <Progress
                    value={cpuAvgTemp || 0}
                    indicatorClassName={(cpuAvgTemp || 0) > 70 ? 'bg-destructive' : (cpuAvgTemp || 0) > 50 ? 'bg-warning' : 'bg-success'}
                  />
                </div>
              </div>
            )}

            {/* Fans Detail */}
            {fans.length > 0 && (
              <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Fan className="w-5 h-5 text-chart-3" />
                  Ventilateurs
                </h3>
                <div className="space-y-3">
                  {fans.map((fan) => (
                    <div key={fan.id} className="flex justify-between items-center">
                      <span className="text-muted-foreground">{fan.name}</span>
                      <span className="text-chart-3 font-semibold">{fan.value} T/min</span>
                    </div>
                  ))}
                  {fans.length > 1 && (
                    <div className="pt-2 border-t border-border">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-sm">Moyenne</span>
                        <span className="text-foreground font-semibold">{fanAvgRpm} T/min</span>
                      </div>
                    </div>
                  )}
                  {/* Add some padding to match CPU card height when there's only 1 fan */}
                  {fans.length === 1 && cpuSensors.length > 2 && (
                    <div className="pt-4" />
                  )}
                </div>
              </div>
            )}

            {/* HDD Sensors Detail */}
            {hddSensors.length > 0 && (
              <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-primary" />
                  Températures Disques
                </h3>
                <div className="space-y-3">
                  {hddSensors.map((sensor) => (
                    <div key={sensor.id} className="flex justify-between items-center">
                      <span className="text-muted-foreground">{sensor.name}</span>
                      <span className={`font-semibold ${
                        sensor.value > 50 ? 'text-destructive' : sensor.value > 40 ? 'text-warning' : 'text-primary'
                      }`}>
                        {sensor.value}°C
                      </span>
                    </div>
                  ))}
                  {hddSensors.length > 1 && (
                    <div className="pt-2 border-t border-border">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-sm">Moyenne</span>
                        <span className="text-foreground font-semibold">{hddAvgTemp}°C</span>
                      </div>
                    </div>
                  )}
                  <Progress value={((hddAvgTemp || 0) / 60) * 100} indicatorClassName="bg-primary" />
                </div>
              </div>
            )}

            {/* Other Sensors (if any) */}
            {otherSensors.length > 0 && (
              <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-chart-5" />
                  Autres capteurs
                </h3>
                <div className="space-y-3">
                  {otherSensors.map((sensor) => (
                    <div key={sensor.id} className="flex justify-between items-center">
                      <span className="text-muted-foreground">{sensor.name}</span>
                      <span className="text-chart-5 font-semibold">{sensor.value}°C</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Temperature Chart */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4">Historique température</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={temperatureHistory.length ? temperatureHistory : systemTempHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="time"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    domain={[20, 80]}
                    tickFormatter={(value) => `${value}°`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = {
                        cpuM: 'CPU (Moyenne)',
                        sw: 'Switch',
                        hdd: 'Disque'
                      };
                      return [`${value}°C`, labels[name] || name];
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="cpuM" stroke={COLORS.orange} name="CPU (Moyenne)" dot={false} />
                  {tempStats.avgSw > 0 && <Line type="monotone" dataKey="sw" stroke={COLORS.cyan} name="Switch" dot={false} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* WiFi Tab */}
      {activeTab === 'wifi' && (
        <div className="space-y-6">
          {/* WiFi Overview - Appareils par bande */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Wifi className="w-5 h-5 text-primary" />
              Appareils par bande WiFi
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Always show 2.4GHz (all models support it) */}
              <div className="bg-secondary/60 rounded-lg p-4 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium text-muted-foreground">2.4 GHz</span>
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {networks.find(n => n.band === '2.4GHz')?.connectedDevices || 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">appareils</div>
              </div>

              <div className="bg-secondary/60 rounded-lg p-4 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-chart-5" />
                  <span className="text-sm font-medium text-muted-foreground">5 GHz</span>
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {networks.find(n => n.band === '5GHz')?.connectedDevices || 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">appareils</div>
              </div>

              {/* Show 6GHz only if supported (Ultra v9, Delta v7) */}
              {capabilities?.wifi6ghz && (
                <div className="bg-secondary/60 rounded-lg p-4 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-chart-3" />
                    <span className="text-sm font-medium text-muted-foreground">6 GHz</span>
                  </div>
                  <div className="text-3xl font-bold text-foreground">
                    {networks.find(n => n.band === '6GHz')?.connectedDevices || 0}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">appareils</div>
                </div>
              )}
            </div>
          </div>

          {/* WiFi Networks Detail */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {networks.map((network, index) => (
              <div key={network.id} className="bg-card rounded-xl p-6 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      network.band === '6GHz' ? 'bg-chart-3/20' :
                      network.band === '5GHz' ? 'bg-primary/20' :
                      'bg-success/20'
                    }`}>
                      <Wifi className={`w-5 h-5 ${
                        network.band === '6GHz' ? 'text-chart-3' :
                        network.band === '5GHz' ? 'text-primary' :
                        'text-success'
                      }`} />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{network.ssid}</div>
                      <div className="text-sm text-muted-foreground">{network.band}</div>
                    </div>
                  </div>
                  <Badge variant={network.active ? 'success' : 'default'} size="sm">
                    {network.active ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Canal</span>
                    <div className="text-foreground font-medium">{network.channel || 'Auto'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Largeur</span>
                    <div className="text-foreground font-medium">{network.channelWidth} MHz</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Appareils</span>
                    <div className="text-foreground font-medium">{network.connectedDevices}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Charge</span>
                    <div className="text-foreground font-medium">{network.load || 0}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* WiFi Distribution Chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <h3 className="text-lg font-semibold text-foreground mb-4">Appareils par bande</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={wifiBandDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {wifiBandDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <h3 className="text-lg font-semibold text-foreground mb-4">Types d'appareils</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deviceDistribution.slice(0, 6)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="hsl(var(--muted-foreground))"
                      width={80}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Bar dataKey="value" fill={COLORS.blue} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Tab */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* System Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Server className="w-4 h-4 text-primary" />
                Modèle
              </div>
              <div className="text-lg font-bold text-foreground truncate">
                {info?.board_name || 'Freebox'}
              </div>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <HardDrive className="w-4 h-4 text-success" />
                Firmware
              </div>
              <div className="text-lg font-bold text-foreground">
                {info?.firmware_version || 'N/A'}
              </div>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Clock className="w-4 h-4 text-chart-3" />
                Uptime
              </div>
              <div className="text-lg font-bold text-foreground">
                {info?.uptime || 'N/A'}
              </div>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Activity className="w-4 h-4 text-warning" />
                Disponibilité
              </div>
              <div className="text-lg font-bold text-foreground">
                {uptimePercentage}%
              </div>
            </div>
          </div>

          {/* System Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <h3 className="text-lg font-semibold text-foreground mb-4">Informations système</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Numéro de série</span>
                  <span className="text-foreground font-mono">{info?.serial || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Adresse MAC</span>
                  <span className="text-foreground font-mono">{info?.mac || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Disques</span>
                  <span className="text-foreground">{info?.disk_status || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Authentifié</span>
                  <span className={info?.box_authenticated ? 'text-success' : 'text-destructive'}>
                    {info?.box_authenticated ? 'Oui' : 'Non'}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <h3 className="text-lg font-semibold text-foreground mb-4">État du réseau</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">État connexion</span>
                  <span className={`font-semibold ${
                    status?.state === 'up' ? 'text-success' : 'text-destructive'
                  }`}>
                    {status?.state === 'up' ? 'Connecté' : status?.state || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="text-foreground">{status?.type || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IPv4</span>
                  <span className="text-foreground font-mono">{status?.ipv4 || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IPv6</span>
                  <span className="text-foreground font-mono text-sm truncate max-w-48">
                    {status?.ipv6 || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Uptime Chart */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4">Historique disponibilité (30 jours)</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={uptimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--popover-foreground))'
                    }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                    itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                    formatter={(value: number) => [`${value}%`, 'Disponibilité']}
                  />
                  <Bar
                    dataKey="uptime"
                    radius={[2, 2, 0, 0]}
                  >
                    {uptimeData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.status === 'up' ? COLORS.green : entry.status === 'down' ? COLORS.red : COLORS.orange}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Connected Devices Summary */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4">Appareils connectés</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-secondary rounded-lg">
                <div className="text-3xl font-bold text-foreground">{devices.length}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center p-4 bg-secondary rounded-lg">
                <div className="text-3xl font-bold text-success">
                  {devices.filter(d => d.active).length}
                </div>
                <div className="text-sm text-muted-foreground">En ligne</div>
              </div>
              <div className="text-center p-4 bg-secondary rounded-lg">
                <div className="text-3xl font-bold text-muted-foreground">
                  {devices.filter(d => !d.active).length}
                </div>
                <div className="text-sm text-muted-foreground">Hors ligne</div>
              </div>
              <div className="text-center p-4 bg-secondary rounded-lg">
                <div className="text-3xl font-bold text-primary">
                  {networks.reduce((sum, n) => sum + n.connectedDevices, 0)}
                </div>
                <div className="text-sm text-muted-foreground">WiFi</div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};