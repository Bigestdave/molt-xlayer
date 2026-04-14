import { ArrowUpRight, ArrowDownLeft, RefreshCw } from 'lucide-react';
import type { Transaction } from '../../store/appStore';

interface TransactionHistoryProps {
  transactions: Transaction[];
  accent: string;
  accentRgb: string;
}

const TYPE_CONFIG = {
  deposit: { icon: ArrowDownLeft, label: 'Deposit', color: '#34d399' },
  withdraw: { icon: ArrowUpRight, label: 'Withdraw', color: '#f87171' },
  rebalance: { icon: RefreshCw, label: 'Rebalance', color: '#818cf8' },
} as const;

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;
  if (diff < 60_000) return 'Just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function TransactionHistory({ transactions, accent, accentRgb }: TransactionHistoryProps) {
  if (transactions.length === 0) {
    return (
      <div className="font-data text-[10px] text-[var(--yp-text-muted)] py-8 text-center opacity-60">
        No transactions yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {transactions.map((tx) => {
        const cfg = TYPE_CONFIG[tx.type];
        const Icon = cfg.icon;
        return (
          <div
            key={tx.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-[var(--yp-surface-2)] group"
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}
            >
              <Icon size={13} style={{ color: cfg.color }} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-data text-[11px] font-medium text-[var(--yp-text)]">
                  {cfg.label}
                </span>
                {tx.type === 'rebalance' && tx.toVault && (
                  <span className="font-data text-[9px] text-[var(--yp-text-muted)] truncate">
                    → {tx.toVault}
                  </span>
                )}
              </div>
              <div className="font-data text-[9px] text-[var(--yp-text-muted)] truncate">
                {tx.vaultName} • {tx.chainName}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div
                className="font-data text-[12px] font-semibold tabular-nums"
                style={{ color: tx.type === 'withdraw' ? cfg.color : cfg.color }}
              >
                {tx.type === 'withdraw' ? '-' : tx.type === 'deposit' ? '+' : ''}${tx.amount.toFixed(2)}
              </div>
              <div className="font-data text-[8px] text-[var(--yp-text-muted)] tracking-[0.05em]">
                {formatTime(tx.timestamp)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
