import React from 'react';
import { AlertTriangle, Server, Wifi, HardDrive } from 'lucide-react';
import { useCapabilitiesStore } from '../../stores/capabilitiesStore';
import { cn } from '../../lib/utils';

type FeatureType = 'vm' | 'wifi6ghz' | 'storage' | 'generic';

interface UnsupportedFeatureProps {
  feature: string;
  featureType?: FeatureType;
  description?: string;
  showModelName?: boolean;
  className?: string;
}

const featureIcons: Record<FeatureType, React.ElementType> = {
  vm: Server,
  wifi6ghz: Wifi,
  storage: HardDrive,
  generic: AlertTriangle
};

export const UnsupportedFeature: React.FC<UnsupportedFeatureProps> = ({
  feature,
  featureType = 'generic',
  description,
  showModelName = true,
  className
}) => {
  const { capabilities, getModelName } = useCapabilitiesStore();
  const modelName = getModelName();

  const Icon = featureIcons[featureType];

  const defaultDescriptions: Record<FeatureType, string> = {
    vm: 'Les machines virtuelles ne sont pas disponibles sur ce modele.',
    wifi6ghz: 'Le WiFi 6GHz (6E) n\'est pas supporte sur ce modele.',
    storage: 'Le stockage interne n\'est pas disponible sur ce modele.',
    generic: 'Cette fonctionnalite n\'est pas disponible sur ce modele.'
  };

  const displayDescription = description || defaultDescriptions[featureType];

  return (
    <div className={cn('flex flex-col items-center justify-center border border-dashed border-border px-4 py-8 text-center', className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded border border-warning/40 bg-warning/10">
        <Icon size={22} className="text-warning" />
      </div>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground">{feature} non disponible</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{displayDescription}</p>
      {showModelName && capabilities && (
        <p className="font-data mt-3 text-xs text-muted-foreground/70">
          Modele detecte : <span className="text-muted-foreground">{modelName}</span>
        </p>
      )}
    </div>
  );
};
