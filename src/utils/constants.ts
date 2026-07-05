// Polling intervals (in ms)
export const POLLING_INTERVALS = {
  connection: 1000,      // Real-time speed
  system: 30000,         // Temperature, fan
  devices: 10000,        // LAN devices
  downloads: 5000,       // Download progress
  wifi: 15000,           // WiFi status
  vm: 10000              // VM status
} as const;

// API endpoints (relative to proxy)
export const API_ROUTES = {
  // Auth
  AUTH_REGISTER: '/api/auth/register',
  AUTH_STATUS: '/api/auth/status',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_CHECK: '/api/auth/check',
  AUTH_SET_URL: '/api/auth/set-url',
  AUTH_GET_URL: '/api/auth/url',
  AUTH_RESET: '/api/auth/reset',

  // System
  SYSTEM: '/api/system',
  SYSTEM_REBOOT: '/api/system/reboot',
  SYSTEM_REBOOT_SCHEDULE: '/api/system/reboot/schedule',

  // Connection
  CONNECTION: '/api/connection',
  CONNECTION_CONFIG: '/api/connection/config',
  CONNECTION_HISTORY: '/api/connection/history',
  CONNECTION_TEMP_HISTORY: '/api/connection/temp-history',

  // WiFi
  WIFI_CONFIG: '/api/wifi/config',
  WIFI_APS: '/api/wifi/aps',
  WIFI_BSS: '/api/wifi/bss',
  WIFI_FULL: '/api/wifi/full',
  WIFI_STATIONS: '/api/wifi/stations',
  WIFI_PLANNING: '/api/wifi/planning',
  WIFI_MAC_FILTER: '/api/wifi/mac-filter',
  WIFI_WPS: '/api/wifi/wps',
  // WiFi v13+ features
  WIFI_TEMP_DISABLE: '/api/wifi/temp-disable',
  // WiFi v14+ features
  WIFI_GUEST_CONFIG: '/api/wifi/guest/config',
  WIFI_GUEST_KEYS: '/api/wifi/guest/keys',
  WIFI_MLO_CONFIG: '/api/wifi/mlo/config',

  // LAN
  LAN_CONFIG: '/api/lan/config',
  LAN_INTERFACES: '/api/lan/interfaces',
  LAN_DEVICES: '/api/lan/devices',
  LAN_WOL: '/api/lan/wol',

  // Downloads
  DOWNLOADS: '/api/downloads',
  DOWNLOADS_STATS: '/api/downloads/stats',

  // VM
  VM: '/api/vm',

  // Calls
  CALLS: '/api/calls',

  // Contacts
  CONTACTS: '/api/contacts',

  // File System
  FS: '/api/fs',

  // TV / PVR
  TV_CHANNELS: '/api/tv/channels',
  TV_BOUQUETS: '/api/tv/bouquets',
  TV_RECORDINGS: '/api/tv/recordings',
  TV_PROGRAMMED: '/api/tv/programmed',
  TV_PVR_CONFIG: '/api/tv/pvr/config',
  PVR_PROGRAMMED: '/api/tv/pvr/programmed',
  PVR_FINISHED: '/api/tv/pvr/finished',
  TV_EPG_BY_TIME: '/api/tv/epg/by_time',

  // Parental / Profiles
  PROFILES: '/api/parental/profiles',
  NETWORK_CONTROL: '/api/parental/network-control',
  PARENTAL_CONFIG: '/api/parental/config',
  PARENTAL_FILTERS: '/api/parental/filters',

  // Settings
  SETTINGS_DHCP: '/api/settings/dhcp',
  DHCP_STATIC_LEASES: '/api/dhcp/static-leases',
  SETTINGS_FTP: '/api/settings/ftp',
  SETTINGS_VPN_SERVER: '/api/settings/vpn/server',
  SETTINGS_VPN_CLIENT: '/api/settings/vpn/client',
  SETTINGS_NAT: '/api/settings/nat',
  SETTINGS_SWITCH: '/api/settings/switch',
  SETTINGS_LCD: '/api/settings/lcd',
  SETTINGS_LAN: '/api/settings/lan',
  SETTINGS_CONNECTION: '/api/settings/connection',

  // Connection Logs
  CONNECTION_LOGS: '/api/connection/logs',

  // Notifications
  NOTIFICATIONS: '/api/notifications'
} as const;

// Format helpers
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

export const formatSpeed = (bytesPerSec: number): string => {
  // Convert bytes/s to bits/s (multiply by 8) for network speed display
  // Network speeds are measured in bits, using Freebox format: kb/s, Mb/s, Gb/s
  const bitsPerSec = bytesPerSec * 8;

  if (bitsPerSec === 0) return '0 b/s';

  // Use decimal units (1000) for network speeds, not binary (1024)
  // Freebox uses lowercase 'k' and 'b/s' format
  const k = 1000;
  const sizes = ['b/s', 'kb/s', 'Mb/s', 'Gb/s'];
  const i = Math.floor(Math.log(bitsPerSec) / Math.log(k));
  const value = bitsPerSec / Math.pow(k, i);

  // Use 1 decimal for values < 10, 0 decimals otherwise
  const decimals = value < 10 ? 1 : 0;
  return parseFloat(value.toFixed(decimals)) + ' ' + sizes[i];
};

export const formatBitrate = (bitsPerSec: number): string => {
  if (bitsPerSec === 0) return '0 b/s';
  const k = 1000;
  const sizes = ['b/s', 'kb/s', 'Mb/s', 'Gb/s'];
  const i = Math.floor(Math.log(bitsPerSec) / Math.log(k));
  const value = bitsPerSec / Math.pow(k, i);
  const decimals = value < 10 ? 1 : 0;
  return parseFloat(value.toFixed(decimals)) + ' ' + sizes[i];
};

export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

export const formatTemperature = (celsius: number): string => {
  return `${celsius}°C`;
};
