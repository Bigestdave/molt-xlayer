import type { PersonalityType } from '../../lib/personalities';
import { personalities } from '../../lib/personalities';

interface AgentBadgeProps {
  personality: PersonalityType;
  size?: 'sm' | 'md';
}

export default function AgentBadge({ personality, size = 'md' }: AgentBadgeProps) {
  const config = personalities[personality];
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border backdrop-blur-sm ${
        size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm'
      }`}
      style={{
        borderColor: `rgba(${config.accentRgb}, 0.25)`,
        background: `rgba(${config.accentRgb}, 0.06)`,
        color: config.accent,
      }}
    >
      <config.icon size={14} color={config.accent} />
      <span className="font-display font-bold tracking-tight">{config.name}</span>
      <span
        className="font-data px-2 py-0.5 rounded-full uppercase"
        style={{
          background: `rgba(${config.accentRgb}, 0.1)`,
          fontSize: size === 'sm' ? '9px' : '10px',
          letterSpacing: '0.08em',
        }}
      >
        {config.riskTag}
      </span>
    </div>
  );
}
