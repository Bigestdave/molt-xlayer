import type { LogEntry } from '../../store/appStore';
import { getPersonality } from '../../lib/personalities';
import type { PersonalityType } from '../../lib/personalities';

interface AgentLogProps {
  logs: LogEntry[];
  personality: PersonalityType;
}

export default function AgentLog({ logs, personality }: AgentLogProps) {
  const config = getPersonality(personality);
  const fmt = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-2.5 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
      {logs.map((log) => (
        <div
          key={log.timestamp}
          className="pl-3 py-1.5 border-l-2 rounded-r-lg transition-colors hover:bg-[rgba(255,255,255,0.02)]"
          style={{
            borderColor:
              log.type === 'action' ? config?.accent :
              log.type === 'warning' ? 'var(--yp-warning)' :
              log.type === 'success' ? 'var(--yp-success)' :
              'var(--yp-text-muted)',
          }}
        >
          <div className="flex gap-3 text-sm">
            <span className="font-data text-[var(--yp-text-muted)] shrink-0 text-[10px] mt-0.5 uppercase">
              [{fmt(log.timestamp)}]
            </span>
            <span style={{ color: log.type === 'action' ? config?.accent : 'var(--yp-text)' }}>
              {log.message}
            </span>
          </div>
        </div>
      ))}
      {logs.length === 0 && (
        <div className="text-sm text-[var(--yp-text-muted)] font-data py-6 text-center opacity-60">
          Agent initializing observation protocols...
        </div>
      )}
    </div>
  );
}
