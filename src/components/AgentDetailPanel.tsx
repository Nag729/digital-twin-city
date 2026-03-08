import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getAgentLogs, INITIAL_BUILDINGS, LOG_ILLUSTRATIONS } from '../data/mockData';
import type { Agent, AgentRole, Feedback } from '../types';
import { backdropMotionProps } from '../utils/motionVariants';

const buildingNameMap = new Map(INITIAL_BUILDINGS.map((b) => [b.id, b.name]));

// Eagerly import all log illustration images
const illustrationModules = import.meta.glob<{ default: string }>('../assets/log-illustrations/*.png', { eager: true });
const illustrationMap: Record<string, string> = {};
for (const [path, mod] of Object.entries(illustrationModules)) {
  const filename = path.split('/').pop() ?? '';
  illustrationMap[filename] = mod.default;
}

interface AgentDetailPanelProps {
  agent: Agent | null;
  onClose: () => void;
  feedbacks: Feedback[];
}

const ROLE_COLORS: Record<AgentRole, string> = {
  warehouse_worker: '#FFB347',
  sort_operator: '#FF8FAB',
  delivery_driver: '#6ECFB0',
  recipient: '#87CEEB',
};

const ROLE_BG: Record<AgentRole, string> = {
  warehouse_worker: '#FFF8EE',
  sort_operator: '#FFF0F5',
  delivery_driver: '#F0FDF4',
  recipient: '#F0F8FF',
};

const ROLE_LABELS: Record<AgentRole, string> = {
  warehouse_worker: '倉庫作業員',
  sort_operator: '仕分けオペレーター',
  delivery_driver: '配送ドライバー',
  recipient: '受取人',
};

const ROLE_ICONS: Record<AgentRole, string> = {
  warehouse_worker: '📦',
  sort_operator: '🔀',
  delivery_driver: '🚚',
  recipient: '👤',
};

function getStateLabel(agent: Agent): string {
  const target = agent.targetBuildingId ? buildingNameMap.get(agent.targetBuildingId) : null;
  const prev = agent.previousBuildingId ? buildingNameMap.get(agent.previousBuildingId) : null;
  switch (agent.state) {
    case 'moving':
      return target ? `${target}に移動中` : '移動中';
    case 'working':
      return target ? `${target}で作業中` : prev ? `${prev}で作業中` : '作業中';
    case 'reporting':
      return target ? `${target}でレポート中` : prev ? `${prev}でレポート中` : 'レポート中';
    case 'communicating':
      return '他エージェントと通信中';
    case 'idle':
      return '待機中';
    default:
      return agent.state;
  }
}

const FEEDBACK_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  bug: { label: 'BUG', color: '#FF6B6B', bg: '#FFF0F0' },
  ux_improvement: { label: 'UX', color: '#C4B5FD', bg: '#F5F3FF' },
  performance: { label: 'PERF', color: '#FFB347', bg: '#FFF8EE' },
};

const SEVERITY_COLORS: Record<string, string> = {
  low: '#6ECFB0',
  medium: '#FFB347',
  high: '#FF6B6B',
};

// ─── Log line icon mapping ──────────────────────────────────────
function getLogIcon(text: string): string | null {
  if (text.includes('⚠️') || text.includes('フィードバック')) return '⚠️';
  if (text.includes('スキャン') || text.includes('確認')) return '🔍';
  if (text.includes('ログイン') || text.includes('システム')) return '💻';
  if (text.includes('配送') || text.includes('ルート')) return '🚚';
  if (text.includes('仕分け') || text.includes('ベルト')) return '📋';
  if (text.includes('在庫') || text.includes('入庫')) return '📦';
  if (text.includes('受取') || text.includes('荷物') || text.includes('受信')) return '📬';
  if (text.includes('天候') || text.includes('雨')) return '🌧️';
  if (text.includes('待機') || text.includes('レスポンス')) return '⏳';
  if (text.includes('タスク') || text.includes('リスト')) return '📝';
  if (text.includes('開始') || text.includes('実行')) return '▶️';
  if (text.includes('完了') || text.includes('移動')) return '✅';
  return null;
}

export default function AgentDetailPanel({ agent, onClose, feedbacks }: AgentDetailPanelProps) {
  const [visibleLogLines, setVisibleLogLines] = useState<number>(0);
  const [typingText, setTypingText] = useState('');
  const [currentTypingLine, setCurrentTypingLine] = useState(-1);
  const panelRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const logs = agent ? getAgentLogs(agent.id) : [];
  const agentFeedbacks = agent ? feedbacks.filter((f) => f.agentId === agent.id) : [];

  const agentId = agent?.id ?? null;
  useEffect(() => {
    if (!agentId) {
      setVisibleLogLines(0);
      setTypingText('');
      setCurrentTypingLine(-1);
      return;
    }
    setVisibleLogLines(0);
    setTypingText('');
    setCurrentTypingLine(0);
  }, [agentId]);

  useEffect(() => {
    if (currentTypingLine < 0 || currentTypingLine >= logs.length) return;
    const line = logs[currentTypingLine];
    let charIndex = 0;
    setTypingText('');
    const typeInterval = setInterval(() => {
      charIndex++;
      setTypingText(line.slice(0, charIndex));
      if (charIndex >= line.length) {
        clearInterval(typeInterval);
        setTimeout(() => {
          setVisibleLogLines((prev) => prev + 1);
          setTypingText('');
          setCurrentTypingLine((prev) => prev + 1);
        }, 1000);
      }
    }, 20);
    return () => clearInterval(typeInterval);
  }, [currentTypingLine, logs]);

  // Auto-scroll log container when new lines appear or typing progresses
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally triggering scroll on content changes
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [visibleLogLines, typingText]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (agent) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [agent, onClose]);

  if (!agent) return null;

  const accentColor = ROLE_COLORS[agent.role];
  const accentBg = ROLE_BG[agent.role];
  const roleLabel = ROLE_LABELS[agent.role];
  const roleIcon = ROLE_ICONS[agent.role];
  const agentIndex = parseInt(agent.id.replace('a', ''), 10);
  const roleIndex = String(agentIndex).padStart(2, '0');

  return (
    <motion.div
      className="modal-backdrop justify-end"
      onClick={handleBackdropClick}
      role="presentation"
      {...backdropMotionProps}
    >
      <motion.div
        ref={panelRef}
        className="h-full w-[460px] max-w-[90vw] overflow-y-auto rounded-l-3xl bg-white shadow-[-4px_0_30px_rgba(180,140,100,0.15)]"
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-7 pt-7 pb-5 rounded-tl-3xl"
          style={{
            background: 'linear-gradient(180deg, #FFFFFF 80%, rgba(255,255,255,0.9))',
            borderBottom: '1.5px solid #F5E6D3',
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                style={{
                  background: accentBg,
                  boxShadow: `0 2px 8px ${accentColor}25`,
                }}
              >
                {roleIcon}
              </div>
              <div>
                <h2 className="text-xl font-medium text-text-primary">{agent.name}</h2>
                <p className="text-sm font-medium tracking-wider mt-0.5" style={{ color: accentColor }}>
                  {roleLabel} #{roleIndex}
                </p>
              </div>
            </div>

            <button type="button" onClick={onClose} className="modal-close">
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Current state */}
          <div
            className="mt-5 flex items-center gap-2.5 rounded-xl px-4 py-3.5 text-sm"
            style={{ background: accentBg }}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: accentColor }}
            />
            <span className="text-text-primary font-medium">{getStateLabel(agent)}</span>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-7 px-7 py-6">
          {/* Operation Log - dark theme for contrast */}
          <Section title="操作ログ" accentColor={accentColor} icon="terminal">
            <div
              ref={logContainerRef}
              className="max-h-[420px] overflow-y-auto rounded-xl p-5 bg-[#1E1B2E] font-mono space-y-1.5"
            >
              {logs.slice(0, visibleLogLines).map((text, i) => {
                const illuFile = agent ? LOG_ILLUSTRATIONS[agent.id]?.[i] : undefined;
                const illuSrc = illuFile ? illustrationMap[illuFile] : undefined;
                return <LogLine key={i} text={text} accentColor={accentColor} illustrationSrc={illuSrc} />;
              })}
              {currentTypingLine < logs.length && (
                <div className="flex items-start gap-2.5 text-sm leading-relaxed">
                  <span style={{ color: accentColor }} className="shrink-0 select-none">
                    {'>'}
                  </span>
                  <span style={{ color: '#E2DDD5' }}>
                    {typingText}
                    <span
                      className="ml-px inline-block h-4 w-1.5 align-middle rounded-sm"
                      style={{
                        backgroundColor: accentColor,
                        animation: 'blink 0.8s step-end infinite',
                      }}
                    />
                  </span>
                </div>
              )}
              {currentTypingLine >= logs.length && (
                <motion.div
                  className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
                  style={{ background: `${accentColor}15`, color: accentColor }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  <span>✓</span>
                  <span className="font-medium">操作ログ完了</span>
                </motion.div>
              )}
            </div>
          </Section>

          {/* Feedbacks */}
          <Section title="発見したフィードバック" accentColor={accentColor} icon="alert" count={agentFeedbacks.length}>
            {agentFeedbacks.length === 0 ? (
              <p className="text-sm italic text-text-muted">まだフィードバックはありません</p>
            ) : (
              <div className="space-y-3">
                {agentFeedbacks.map((fb) => {
                  const typeInfo = FEEDBACK_TYPE_LABELS[fb.type] || { label: fb.type, color: '#8B7355', bg: '#F5F0EB' };
                  const sevColor = SEVERITY_COLORS[fb.severity] || '#8B7355';
                  return (
                    <div key={fb.id} className="rounded-xl p-4 text-sm bg-[#FAFAF8] border border-border-warm">
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: typeInfo.bg, color: typeInfo.color }}
                        >
                          {typeInfo.label}
                        </span>
                        <span className="text-xs font-medium uppercase" style={{ color: sevColor }}>
                          {fb.severity}
                        </span>
                        {fb.resolved && (
                          <span
                            className="text-xs font-medium rounded-full px-2 py-0.5"
                            style={{ color: '#6ECFB0', background: '#F0FDF4' }}
                          >
                            解決済
                          </span>
                        )}
                      </div>
                      <p className="text-text-primary leading-relaxed">{fb.description}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>

        <div className="h-10" />
      </motion.div>
    </motion.div>
  );
}

function LogLine({
  text,
  accentColor,
  illustrationSrc,
}: {
  text: string;
  accentColor: string;
  illustrationSrc?: string;
}) {
  const isWarning = text.includes('\u26a0\ufe0f');
  const icon = getLogIcon(text);

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2.5 text-sm leading-relaxed">
        <span style={{ color: accentColor }} className="shrink-0 select-none">
          {icon || '>'}
        </span>
        <span style={{ color: isWarning ? '#FFD93D' : '#E2DDD5' }}>{text}</span>
      </div>
      {illustrationSrc && (
        <motion.div
          className="ml-7 mb-1"
          initial={{ opacity: 0, y: 12, rotate: -1 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <img
            src={illustrationSrc}
            alt=""
            className="w-48 rounded-lg shadow-lg border border-white/10 hover:scale-105 transition-transform duration-200 cursor-pointer"
          />
        </motion.div>
      )}
    </div>
  );
}

function Section({
  title,
  accentColor,
  icon,
  count,
  children,
}: {
  title: string;
  accentColor: string;
  icon: 'terminal' | 'alert';
  count?: number;
  children: React.ReactNode;
}) {
  const icons = {
    terminal: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    ),
    alert: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  };

  return (
    <div>
      <div className="mb-3.5 flex items-center gap-2">
        {icons[icon]}
        <h3 className="text-sm font-medium uppercase tracking-wider text-text-secondary">{title}</h3>
        {count !== undefined && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
          >
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
