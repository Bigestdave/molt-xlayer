/**
 * AgentConsole — The X Layer Agentic Monitor
 *
 * An ultra-premium, passive status monitor for the X Layer agent.
 * The execution logic has been moved to the Conversational AI Interface.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useXLayerAgent } from '../../hooks/useXLayerAgent';

interface AgentConsoleProps {
  accent: string;
  accentRgb: string;
}

const PHASE_LABELS: Record<string, { label: string; icon: string }> = {
  idle: { label: 'AWAITING COMMAND', icon: '◆' },
  scanning: { label: 'SCANNING X LAYER YIELDS', icon: '◈' },
  rebalancing: { label: 'EXECUTING UNISWAP SKILL', icon: '⟐' },
  harvesting: { label: 'ECONOMY LOOP — TAX HARVEST', icon: '⟡' },
  complete: { label: 'CYCLE COMPLETE', icon: '✦' },
  error: { label: 'SYSTEM ERROR — CHECK LOGS', icon: '✗' },
};

export default function AgentConsole({ accent, accentRgb }: AgentConsoleProps) {
  const { status, XLAYER_EXPLORER } = useXLayerAgent();
  const [isExpanded, setIsExpanded] = useState(true);

  const phaseInfo = PHASE_LABELS[status.phase] || PHASE_LABELS.idle;

  return (
    <div
      className="rounded-2xl overflow-hidden glass-panel"
      style={{
        background: 'var(--yp-surface)',
        border: '1px solid',
        borderColor: status.isRunning
          ? `rgba(${accentRgb}, 0.2)`
          : 'var(--yp-border)',
        boxShadow: status.isRunning ? `0 4px 30px rgba(${accentRgb}, 0.05)` : undefined,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 sm:px-5 py-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          background: status.isRunning
            ? `linear-gradient(90deg, rgba(${accentRgb}, 0.05) 0%, transparent 100%)`
            : undefined,
        }}
      >
        <div className="flex items-center gap-3">
          {/* Subtle Status Indicator */}
          <div className="relative flex items-center justify-center w-2 h-2">
            {status.isRunning && (
              <motion.span
                className="absolute w-full h-full rounded-full"
                animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                style={{ background: accent }}
              />
            )}
            <span
              className="relative w-1.5 h-1.5 rounded-full"
              style={{
                background: status.phase === 'error' ? '#ef4444' : status.isRunning ? accent : '#555',
              }}
            />
          </div>
          <span
            className="font-data text-[10px] tracking-[0.15em] font-medium uppercase"
            style={{ color: status.isRunning ? accent : 'var(--yp-text-muted)' }}
          >
            X Layer Core
          </span>
        </div>
        <div className="flex items-center gap-3">
          {status.cycleCount > 0 && (
            <span className="font-data text-[9px] tracking-[0.1em] text-[var(--yp-text-muted)]">
              {status.cycleCount} OP
            </span>
          )}
          <span className="font-data text-[10px] text-[var(--yp-text-muted)] transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            ▼
          </span>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-4">
              {/* Phase indicator - ultra sleek */}
              <div
                className="mb-4 rounded-xl px-4 py-3 flex items-center justify-between"
                style={{
                  background: `var(--yp-surface-2)`,
                  border: `1px solid var(--yp-border)`,
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="font-data text-[12px]"
                    style={{
                      color: status.phase === 'error' ? '#ef4444' : accent,
                    }}
                  >
                    {phaseInfo.icon}
                  </span>
                  <span
                    className="font-data text-[10px] tracking-[0.1em] font-medium"
                    style={{
                      color:
                        status.phase === 'error' ? '#ef4444' :
                        status.phase === 'complete' ? '#34d399' :
                        'var(--yp-text)',
                    }}
                  >
                    {phaseInfo.label}
                  </span>
                </div>
                {status.isRunning && (
                  <span className="font-data text-[9px] text-[var(--yp-text-muted)] tracking-widest animate-pulse">
                    PROCESSING
                  </span>
                )}
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-px bg-[var(--yp-border)] border border-[var(--yp-border)] rounded-xl overflow-hidden">
                <div className="bg-[var(--yp-surface)] p-3 flex flex-col gap-1">
                  <span className="font-data text-[8px] tracking-[0.15em] text-[var(--yp-text-muted)]">AGENT IDENTITY</span>
                  <span className="font-data text-[10px] text-[var(--yp-text-secondary)] truncate">
                    {status.agentAddress || 'NOT DETECTED'}
                  </span>
                </div>
                <div className="bg-[var(--yp-surface)] p-3 flex flex-col gap-1">
                  <span className="font-data text-[8px] tracking-[0.15em] text-[var(--yp-text-muted)]">RESERVES</span>
                  <span className="font-data text-[10px] font-medium" style={{ color: status.agentBalance ? accent : 'var(--yp-text-muted)' }}>
                    {status.agentBalance ? `${status.agentBalance} OKB` : '---'}
                  </span>
                </div>
              </div>

              {/* Transaction hashes */}
              {status.totalTxHashes.length > 0 && (
                <div className="mt-4">
                  <div className="font-data text-[8px] tracking-[0.15em] text-[var(--yp-text-muted)] mb-2">
                    ON-CHAIN LEDGER
                  </div>
                  <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto custom-scrollbar pr-1">
                    {status.totalTxHashes.map((hash, i) => (
                      <a
                        key={hash}
                        href={`${XLAYER_EXPLORER}${hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:bg-[var(--yp-surface-2)]"
                      >
                        <span className="font-data text-[9px]" style={{ color: i % 2 === 0 ? accent : '#a855f7' }}>
                          {i % 2 === 0 ? '◈' : '◇'}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-data text-[9px] text-[var(--yp-text-secondary)] group-hover:text-white transition-colors">
                            {hash.slice(0, 10)}...{hash.slice(-8)}
                          </span>
                          <span className="font-data text-[7px] text-[var(--yp-text-muted)] uppercase tracking-wider">
                            {i % 2 === 0 ? 'Uniswap Execution' : 'Tax Harvest'}
                          </span>
                        </div>
                        <span className="font-data text-[10px] text-[var(--yp-text-muted)] ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                          ↗
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
