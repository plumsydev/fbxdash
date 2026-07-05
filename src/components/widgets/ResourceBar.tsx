import React from 'react';

interface ResourceBarProps {
  label: string;
  percent: number;
  text?: string;
  color?: string;
  segments?: number;
}

export const ResourceBar: React.FC<ResourceBarProps> = ({
  label,
  percent,
  text,
  color = 'bg-success',
  segments = 20
}) => {
  const filledSegments = Math.round((percent / 100) * segments);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-end gap-[2px] h-6">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 rounded-sm transition-all duration-300 ${
              i < filledSegments ? color : 'bg-muted'
            }`}
            style={{ height: '100%' }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
        <span>{label}</span>
        <span className="font-data">{text || `${Math.round(percent)}%`}</span>
      </div>
    </div>
  );
};