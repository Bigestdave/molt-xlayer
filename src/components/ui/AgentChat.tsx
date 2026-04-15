import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Play } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { getPersonality } from '../../lib/personalities';
import { API_BASE_URL } from '../../lib/lifi';
import { toast } from 'sonner';
import { useXLayerAgent } from './../../hooks/useXLayerAgent';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = '/api/chat/x402';

const SUGGESTED_QUESTIONS = [
  "Execute X Layer Agent",
  "How is my position doing?",
  "Tell me about your economy loop",
];

interface AgentChatProps {
  accent: string;
  accentRgb: string;
  open?: boolean;
  onClose?: () => void;
  isEmbedded?: boolean;
}

export default function AgentChat({ accent, accentRgb, open, onClose, isEmbedded = false }: AgentChatProps) {
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
    if ((open || isEmbedded) && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, isEmbedded]);

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

  const { runAutonomousCycle } = useXLayerAgent();

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const isExecuteCommand = text.toLowerCase().includes('execute x layer agent') || text.toLowerCase().includes('run agent');

    const userMsg: Msg = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    if (isExecuteCommand) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Initiating X Layer autonomous execution loop...\nBypassing human approval mechanisms.\nExecuting Uniswap rebalance protocol...' },
        ]);
      }, 500);

      const result = await runAutonomousCycle();

      if (result.success) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Execution complete. Organism self-sustained.\n\nRebalance TX: ${result.rebalanceTxHash?.slice(0, 10)}...\nEconomy Tax Harvest: ${result.taxTxHash?.slice(0, 10)}...` },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Execution failed: ${result.error}` },
        ]);
      }
      setIsLoading(false);
      return;
    }

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

  const chatContent = (
    <div
      className={`flex flex-col overflow-hidden ${
        isEmbedded ? 'h-full w-full border-none' : 'border fixed bottom-0 left-0 right-0 sm:bottom-5 sm:right-5 w-full sm:w-[380px] sm:rounded-2xl z-50 h-[85dvh] max-h-[520px]'
      }`}
      style={{
        background: isEmbedded ? 'transparent' : 'var(--yp-bg)',
        borderColor: isEmbedded ? 'transparent' : `rgba(${accentRgb}, 0.25)`,
        boxShadow: isEmbedded ? 'none' : `0 20px 50px rgba(0,0,0,0.5)`,
      }}
    >
      {/* Premium Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0" style={{ background: `repeating-linear-gradient(0deg, transparent, transparent 1px, ${accent} 2px)` }} />
      
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3.5 border-b shrink-0 z-10"
        style={{
          borderColor: `rgba(${accentRgb}, 0.15)`,
          background: `linear-gradient(90deg, rgba(${accentRgb}, 0.08), transparent)`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <config.icon size={16} color={accent} />
            <div className="absolute -inset-1 blur-sm opacity-50" style={{ background: accent }} />
          </div>
          <div>
            <span className="font-display font-bold text-[13px] tracking-tight">Chat with {creatureName || config.name}</span>
            <div className="font-data text-[8px] text-[var(--yp-text-muted)] tracking-[0.1em] flex items-center gap-1.5 uppercase">
              <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: accent }} />
              x402 ENCRYPTED · 0.001 USDC
            </div>
          </div>
        </div>
        {!isEmbedded && onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={14} className="text-[var(--yp-text-muted)]" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar px-4 py-5 flex flex-col gap-4 z-10"
        style={{ minHeight: 0 }}
      >
        {messages.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center gap-5 py-8"
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center relative group`}
              style={{ background: `rgba(${accentRgb}, 0.05)`, border: `1px solid rgba(${accentRgb}, 0.2)` }}
            >
              <div className="absolute inset-0 rounded-2xl animate-pulse blur-md opacity-20" style={{ background: accent }} />
              <config.icon size={24} color={accent} />
            </div>
            <div className="text-center">
              <div className="font-display font-bold text-[14px] mb-2 tracking-tight">System Identity: {creatureName || config.name}</div>
              <div className="font-data text-[10px] text-[var(--yp-text-muted)] tracking-[0.05em] px-6 max-w-[280px] leading-[1.2]">
                Ask me about yield performance, risks, or the economy loop.
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-[280px]">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className={`font-data text-[10px] px-4 py-3 rounded-xl border cursor-pointer transition-all flex items-center justify-center gap-2 hover:border-[var(--yp-border-hover)] ${q.includes('Execute') ? 'font-bold uppercase tracking-[0.05em] w-full' : ''}`}
                  style={{
                    borderColor: q.includes('Execute') ? `rgba(${accentRgb}, 0.5)` : `rgba(${accentRgb}, 0.2)`,
                    color: q.includes('Execute') ? accent : 'var(--yp-text-secondary)',
                    background: q.includes('Execute') ? `rgba(${accentRgb}, 0.08)` : `rgba(${accentRgb}, 0.04)`,
                    boxShadow: q.includes('Execute') ? `0 0 20px rgba(${accentRgb}, 0.3)` : undefined,
                  }}
                >
                  {q.includes('Execute') && <Play size={12} color={accent} className="fill-current" />}
                  {q}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-2xl px-4 py-3 relative group ${
                msg.role === 'user' ? 'rounded-br-none' : 'rounded-bl-none'
              }`}
              style={
                msg.role === 'user'
                  ? { background: `linear-gradient(135deg, ${accent}, rgba(${accentRgb}, 0.8))`, color: '#000' }
                  : {
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid rgba(${accentRgb}, 0.1)`,
                    }
              }
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-2">
                  <config.icon size={10} color={accent} />
                  <span className="font-data text-[8px] tracking-[0.2em] font-bold uppercase opacity-60" style={{ color: accent }}>
                    {(creatureName || config.name)}
                  </span>
                </div>
              )}
              <p
                className={`font-data text-[12px] leading-[1.6] whitespace-pre-wrap ${
                  msg.role === 'user' ? 'font-semibold' : ''
                }`}
                style={msg.role === 'assistant' ? { color: 'var(--yp-text-secondary)' } : { color: '#000' }}
              >
                {msg.content}
              </p>
            </div>
          </motion.div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-none px-4 py-4 bg-white/5 border border-white/10 min-w-[200px]">
              <div className="flex items-center gap-1.5 mb-3">
                <config.icon size={10} color={accent} className="animate-spin-slow" />
                <span className="font-data text-[8px] tracking-[0.2em] uppercase opacity-50" style={{ color: accent }}>
                  Thinking...
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {['w-[90%]', 'w-[75%]', 'w-[50%]'].map((w, i) => (
                  <div
                    key={i}
                    className={`h-[12px] rounded-lg ${w} overflow-hidden`}
                    style={{ background: `rgba(${accentRgb}, 0.05)` }}
                  >
                    <div
                      className="h-full w-[200%] rounded-lg"
                      style={{
                        background: `linear-gradient(90deg, transparent 25%, rgba(${accentRgb}, 0.15) 50%, transparent 75%)`,
                        animation: `shimmer 2s ease-in-out infinite`,
                        animationDelay: `${i * 0.2}s`,
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
        className="px-4 py-4 border-t shrink-0 z-10"
        style={{ borderColor: `rgba(${accentRgb}, 0.1)`, background: `rgba(${accentRgb}, 0.02)` }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex items-center gap-2.5"
        >
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Communicate with ${creatureName || 'Agent'}...`}
              disabled={isLoading}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 font-data text-[12px] text-[var(--yp-text)] placeholder:text-[var(--yp-text-muted)] outline-none transition-all focus:border-[var(--yp-border-hover)] focus:bg-white/10 disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer transition-all hover:scale-[1.05] active:scale-[0.95] disabled:opacity-30 disabled:cursor-not-allowed shrink-0 relative group"
            style={{ background: accent }}
          >
            <div className="absolute inset-0 rounded-2xl blur-md opacity-0 group-hover:opacity-40 transition-opacity" style={{ background: accent }} />
            <Send size={18} color="#000" />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isEmbedded ? (
        <div className="h-full w-full flex flex-col min-h-0">{chatContent}</div>
      ) : (
        open && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {chatContent}
          </motion.div>
        )
      )}
    </AnimatePresence>
  );
}

