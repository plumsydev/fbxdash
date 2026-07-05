import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { getPermissionErrorMessage, getFreeboxSettingsUrl } from '../../utils/permissions';

interface PermissionBannerProps {
  permission: string;
  freeboxUrl: string;
}

export const PermissionBanner: React.FC<PermissionBannerProps> = ({ permission, freeboxUrl }) => {
  const settingsUrl = getFreeboxSettingsUrl(freeboxUrl);

  return (
    <div className="mb-6 rounded border border-warning/30 border-l-4 border-l-warning bg-warning/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 flex-shrink-0 text-warning" size={20} />
        <div className="flex-1">
          <p className="text-sm text-warning">{getPermissionErrorMessage(permission)}</p>
          <a
            href={settingsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm text-warning underline underline-offset-2 hover:text-warning/80"
          >
            Ouvrir les paramètres Freebox
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
};
