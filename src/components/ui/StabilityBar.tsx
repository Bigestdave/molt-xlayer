interface StabilityBarProps {
  score: number;
  accentRgb?: string;
  showLabel?: boolean;
}

export default function StabilityBar({ score, accentRgb = '74, 222, 128', showLabel = true }: StabilityBarProps) {
  const pct = Math.round(score * 100);
  const color = score > 0.7
    ? `rgba(${accentRgb}, 0.9)`
    : score > 0.4
    ? 'rgba(251, 191, 36, 0.9)'
    : 'rgba(239, 68, 68, 0.9)';

  return (
    <div className="flex items-center gap-2">
      <div className="stability-bar flex-1" style={{ minWidth: 60 }}>
        <div className="stability-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      {showLabel && (
        <span className="font-mono text-xs" style={{ color, minWidth: 32, textAlign: 'right' }}>{pct}%</span>
      )}
    </div>
  );
}
