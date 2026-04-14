import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { getPersonality } from '../../lib/personalities';
import { API_BASE_URL } from '../../lib/lifi';
import { toast } from 'sonner';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = '/api/chat/x402';

const SUGGESTED_QUESTIONS = [
  "How is my position doing?",
  "Should I rebalance?",
  "What are the risks?",
  "Tell me about your economy loop",
];

interface AgentChatProps {
  accent: string;
  accentRgb: string;
  open: boolean;
  onClose: () => void;
}

export default function AgentChat({ accent, accentRgb, open, onClose }: AgentChatProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const personality = useAppStore((s) => s.personality);
  const activeVault = useAppStore((s) => s.activeVault);
  const deposit = useAppStore((s) => s.deposit);
  const earnedUSD = useAppStore((s) => s.earnedUSD);
  const creatureName = useAppStore((s) => s.creatureName);
  const creatureState = useAppStore((s) => s.creatureState);
  const rebalanceCount = useAppStore((s) => s.rebalanceCount);
  const allVaults = useAppStore((s) => s.allVaults);

  const config = getPersonality(personality);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const getPortfolioContext = useCallback(() => {
    if (!config || !activeVault || !deposit) return {};
    const topVaults = allVaults
      .slice(0, 5)
      .map((v, i) => `${i + 1}. ${v.name} (${v.protocol}, ${v.chainName}) — ${v.apy.toFixed(2)}% APY, stability ${Math.round(v.stabilityScore * 100)}%`)
      .join('\n');

    const activeMinutes = Math.floor((Date.now() - deposit.timestamp) / 60000);

    return {
      personalityName: config.name,
      personalityTag: config.riskTag,
      vaultName: activeVault.name,
      chainName: activeVault.chainName,
      protocol: activeVault.protocol,
      apy: activeVault.apy.toFixed(2),
      deposited: deposit.amount.toFixed(2),
      earned: earnedUSD.toFixed(6),
      stability: Math.round(activeVault.stabilityScore * 100),
      creatureName,
      creatureState,
      rebalanceCount,
      activeMinutes,
      topVaults,
    };
  }, [config, activeVault, deposit, earnedUSD, creatureName, creatureState, rebalanceCount, allVaults]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Msg = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const resp = await fetch(`${API_BASE_URL}${CHAT_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          personality: personality,
        }),
      });

      if (resp.status === 402) {
        toast.error('x402 Payment Required', { description: 'Insufficient USDC balance for creature chat.' });
        setIsLoading(false);
        return;
      }

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Failed to connect' }));
        toast.error(err.error || 'Chat failed');
        setIsLoading(false);
        return;
      }

      const data = await resp.json();
      const replyText = data.reply || 'I could not process that request.';
      const paymentNote = data.amountPaid ? `\n\n— x402: ${data.amountPaid} deducted` : '';

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: replyText + paymentNote },
      ]);
    } catch (e) {
      console.error('Chat error:', e);
      toast.error('Failed to reach agent');
    }

    setIsLoading(false);
  };

  if (!config) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 sm:bottom-5 sm:left-auto sm:right-5 z-50 w-full sm:w-[380px] flex flex-col sm:rounded-2xl overflow-hidden border"
          style={{
            background: 'var(--yp-bg)',
            borderColor: `rgba(${accentRgb}, 0.3)`,
            height: '85dvh',
            maxHeight: '520px',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b shrink-0"
            style={{
              borderColor: `rgba(${accentRgb}, 0.2)`,
              background: `rgba(${accentRgb}, 0.05)`,
            }}
          >
            <div className="flex items-center gap-2.5">
              <config.icon size={16} color={accent} />
              <div>
                <span className="font-display font-bold text-[13px]">Chat with {creatureName || config.name}</span>
                <div className="font-data text-[9px] text-[var(--yp-text-muted)] tracking-[0.08em]">
                  {config.name.toUpperCase()} · x402 GATED · 0.001 USDC/MSG
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--yp-surface-2)] transition-colors cursor-pointer"
            >
              <X size={14} className="text-[var(--yp-text-muted)]" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 flex flex-col gap-3"
            style={{ minHeight: 0 }}
          >
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `rgba(${accentRgb}, 0.1)`, border: `1px solid rgba(${accentRgb}, 0.2)` }}
                >
                  <config.icon size={20} color={accent} />
                </div>
                <div className="text-center">
                  <div className="font-display font-bold text-[13px] mb-1">Talk to {creatureName || 'your agent'}</div>
                  <div className="font-data text-[10px] text-[var(--yp-text-muted)]">
                    Each question costs 0.001 USDC via x402
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center max-w-[280px]">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="font-data text-[10px] px-3 py-1.5 rounded-lg border cursor-pointer transition-all hover:border-[var(--yp-border-hover)]"
                      style={{
                        borderColor: `rgba(${accentRgb}, 0.2)`,
                        color: 'var(--yp-text-secondary)',
                        background: `rgba(${accentRgb}, 0.04)`,
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                    msg.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'
                  }`}
                  style={
                    msg.role === 'user'
                      ? { background: accent, color: '#000' }
                      : {
                          background: 'var(--yp-surface)',
                          border: `1px solid var(--yp-border)`,
                        }
                  }
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <config.icon size={10} color={accent} />
                      <span className="font-data text-[8px] tracking-[0.1em]" style={{ color: accent }}>
                        {(creatureName || config.name).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <p
                    className={`font-data text-[12px] leading-[1.7] whitespace-pre-wrap ${
                      msg.role === 'user' ? 'font-medium' : ''
                    }`}
                    style={msg.role === 'assistant' ? { color: 'var(--yp-text-secondary)' } : undefined}
                  >
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-[var(--yp-surface)] border border-[var(--yp-border)] min-w-[180px]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <config.icon size={10} color={accent} />
                    <span className="font-data text-[8px] tracking-[0.1em]" style={{ color: accent }}>
                      {(creatureName || config.name).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {['w-[85%]', 'w-[60%]', 'w-[40%]'].map((w, i) => (
                      <div
                        key={i}
                        className={`h-[10px] rounded-md ${w} overflow-hidden`}
                        style={{ background: `rgba(${accentRgb}, 0.08)` }}
                      >
                        <div
                          className="h-full w-[200%] rounded-md"
                          style={{
                            background: `linear-gradient(90deg, transparent 25%, rgba(${accentRgb}, 0.2) 50%, transparent 75%)`,
                            animation: `shimmer 1.5s ease-in-out infinite`,
                            animationDelay: `${i * 0.15}s`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div
            className="px-3 py-3 border-t shrink-0"
            style={{ borderColor: 'var(--yp-border)' }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask ${creatureName || 'your agent'}...`}
                disabled={isLoading}
                className="flex-1 bg-[var(--yp-surface)] border border-[var(--yp-border)] rounded-xl px-3.5 py-2.5 font-data text-[12px] text-[var(--yp-text)] placeholder:text-[var(--yp-text-muted)] outline-none transition-colors focus:border-[var(--yp-border-hover)] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                style={{ background: accent }}
              >
                <Send size={14} color="#000" />
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
