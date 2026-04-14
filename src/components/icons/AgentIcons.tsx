import type { PersonalityType } from '../../lib/personalities';

interface AgentIconProps {
  size?: number;
  color?: string;
  glow?: boolean;
  className?: string;
}

/** The Keeper — nested hexagonal shield. Protection. Containment. */
function KeeperIcon({ size = 24, color = '#4ade80', glow = false, className }: AgentIconProps) {
  const s = size;
  const glowId = `keeper-glow-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none" className={className}>
      {glow && (
        <defs>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
      )}
      <g filter={glow ? `url(#${glowId})` : undefined}>
        {/* Outer shield */}
        <path
          d="M16 3 L27 9 L27 19 L16 29 L5 19 L5 9 Z"
          stroke={color}
          strokeWidth="1.2"
          strokeLinejoin="round"
          opacity="0.4"
        />
        {/* Mid shield */}
        <path
          d="M16 7 L23.5 11 L23.5 19 L16 25 L8.5 19 L8.5 11 Z"
          stroke={color}
          strokeWidth="1.4"
          strokeLinejoin="round"
          opacity="0.7"
        />
        {/* Inner core */}
        <path
          d="M16 12 L19.5 14 L19.5 18 L16 21 L12.5 18 L12.5 14 Z"
          stroke={color}
          strokeWidth="1.6"
          strokeLinejoin="round"
          fill={color}
          fillOpacity="0.15"
        />
        {/* Center dot */}
        <circle cx="16" cy="16.5" r="1.2" fill={color} opacity="0.9" />
      </g>
    </svg>
  );
}

/** The Hunter — angular arrowhead / fang. Predatory. Forward motion. */
function HunterIcon({ size = 24, color = '#f97316', glow = false, className }: AgentIconProps) {
  const s = size;
  const glowId = `hunter-glow-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none" className={className}>
      {glow && (
        <defs>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
      )}
      <g filter={glow ? `url(#${glowId})` : undefined}>
        {/* Primary fang — forward thrust */}
        <path
          d="M8 26 L16 4 L24 26"
          stroke={color}
          strokeWidth="1.4"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* Inner blade */}
        <path
          d="M12 22 L16 9 L20 22"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          fill={color}
          fillOpacity="0.12"
        />
        {/* Cross-cut — tension line */}
        <line x1="10" y1="18" x2="22" y2="18" stroke={color} strokeWidth="1" opacity="0.4" />
        <line x1="11.5" y1="22" x2="20.5" y2="22" stroke={color} strokeWidth="0.8" opacity="0.3" />
        {/* Apex point */}
        <circle cx="16" cy="6" r="1" fill={color} opacity="0.9" />
      </g>
    </svg>
  );
}

/** The Architect — crystalline lattice / prism. Cerebral. Structured. */
function ArchitectIcon({ size = 24, color = '#818cf8', glow = false, className }: AgentIconProps) {
  const s = size;
  const glowId = `architect-glow-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none" className={className}>
      {glow && (
        <defs>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
      )}
      <g filter={glow ? `url(#${glowId})` : undefined}>
        {/* Outer diamond frame */}
        <rect
          x="7" y="7" width="18" height="18"
          rx="1"
          stroke={color}
          strokeWidth="1.2"
          opacity="0.35"
          transform="rotate(45 16 16)"
        />
        {/* Inner diamond */}
        <rect
          x="11" y="11" width="10" height="10"
          rx="0.5"
          stroke={color}
          strokeWidth="1.4"
          opacity="0.7"
          transform="rotate(45 16 16)"
        />
        {/* Grid lines — structure */}
        <line x1="16" y1="4" x2="16" y2="28" stroke={color} strokeWidth="0.6" opacity="0.25" />
        <line x1="4" y1="16" x2="28" y2="16" stroke={color} strokeWidth="0.6" opacity="0.25" />
        {/* Core square */}
        <rect
          x="13.5" y="13.5" width="5" height="5"
          stroke={color}
          strokeWidth="1.5"
          fill={color}
          fillOpacity="0.15"
          transform="rotate(45 16 16)"
        />
        {/* Center node */}
        <circle cx="16" cy="16" r="1.2" fill={color} opacity="0.9" />
      </g>
    </svg>
  );
}

const AGENT_ICONS: Record<PersonalityType, React.FC<AgentIconProps>> = {
  steward: KeeperIcon,
  hunter: HunterIcon,
  sentinel: ArchitectIcon,
};

export { KeeperIcon, HunterIcon, ArchitectIcon, AGENT_ICONS };
export type { AgentIconProps };
