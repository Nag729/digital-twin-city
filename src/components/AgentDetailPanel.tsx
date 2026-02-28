import { useEffect, useRef, useState, useCallback } from 'react';
import type { Agent, AgentRole, Feedback, AgentSkill } from '../types';
import { getAgentLogs } from '../data/mockData';

interface AgentDetailPanelProps {
  agent: Agent | null;
  onClose: () => void;
  feedbacks: Feedback[];
  skills: AgentSkill[];
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

const STATE_LABELS: Record<string, string> = {
  idle: '待機中',
  moving: '移動中',
  working: '作業中',
  reporting: 'レポート中',
  communicating: '通信中',
};

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

export default function AgentDetailPanel({ agent, onClose, feedbacks, skills }: AgentDetailPanelProps) {
  const [visibleLogLines, setVisibleLogLines] = useState<number>(0);
  const [typingText, setTypingText] = useState('');
  const [currentTypingLine, setCurrentTypingLine] = useState(-1);
  const panelRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const logs = agent ? getAgentLogs(agent.id) : [];
  const agentFeedbacks = agent ? feedbacks.filter(f => f.agentId === agent.id) : [];
  const agentSkills = agent ? skills.filter(s => agent.skills.includes(s.id)) : [];

  useEffect(() => {
    if (!agent) {
      setVisibleLogLines(0);
      setTypingText('');
      setCurrentTypingLine(-1);
      return;
    }
    setVisibleLogLines(0);
    setTypingText('');
    setCurrentTypingLine(0);
  }, [agent]);

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
          setVisibleLogLines(prev => prev + 1);
          setTypingText('');
          setCurrentTypingLine(prev => prev + 1);
        }, 300);
      }
    }, 25);
    return () => clearInterval(typeInterval);
  }, [currentTypingLine, logs]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [visibleLogLines, typingText]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      onClose();
    }
  }, [onClose]);

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
  const agentIndex = parseInt(agent.id.replace('a', ''), 10);
  const roleIndex = String(agentIndex).padStart(2, '0');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-[rgba(93,78,55,0.3)] backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={panelRef}
        className="h-full w-[420px] max-w-[90vw] overflow-y-auto rounded-l-3xl bg-white shadow-[-4px_0_30px_rgba(180,140,100,0.15)] animate-[slideIn_0.3s_ease-out]"
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-6 pt-5 pb-4 rounded-tl-3xl"
          style={{
            background: 'linear-gradient(180deg, #FFFFFF 80%, rgba(255,255,255,0.9))',
            borderBottom: `1.5px solid #F5E6D3`,
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-medium"
                style={{
                  background: accentBg,
                  color: accentColor,
                  boxShadow: `0 2px 8px ${accentColor}25`,
                }}
              >
                {agent.name[0]}
              </div>
              <div>
                <h2 className="text-lg font-medium text-text-primary">
                  {agent.name}
                </h2>
                <p className="text-xs font-medium tracking-wider" style={{ color: accentColor }}>
                  {roleLabel} #{roleIndex}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors bg-[#F5F0EB] text-text-muted"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Current state */}
          <div
            className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
            style={{ background: accentBg }}
          >
            <span
              className="inline-block h-2 w-2 rounded-full animate-pulse"
              style={{ backgroundColor: accentColor }}
            />
            <span className="text-text-primary">
              {STATE_LABELS[agent.state] || agent.state}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-5 px-6 py-4">
          {/* Operation Log - dark theme for contrast */}
          <Section title="操作ログ" accentColor={accentColor} icon="terminal">
            <div
              ref={logContainerRef}
              className="max-h-[220px] overflow-y-auto rounded-xl p-3 bg-[#1E1B2E] font-mono"
            >
              {logs.slice(0, visibleLogLines).map((line, i) => (
                <LogLine key={i} text={line} accentColor={accentColor} />
              ))}
              {currentTypingLine < logs.length && (
                <div className="flex items-start gap-1.5 text-xs leading-relaxed">
                  <span style={{ color: accentColor }} className="shrink-0 select-none">{'>'}</span>
                  <span style={{ color: '#E2DDD5' }}>
                    {typingText}
                    <span
                      className="ml-px inline-block h-3.5 w-1.5 align-middle rounded-sm"
                      style={{
                        backgroundColor: accentColor,
                        animation: 'blink 0.8s step-end infinite',
                      }}
                    />
                  </span>
                </div>
              )}
              {currentTypingLine >= logs.length && (
                <div className="mt-1 flex items-center gap-1.5 text-xs">
                  <span style={{ color: accentColor }} className="select-none">{'>'}</span>
                  <span
                    className="inline-block h-3.5 w-1.5 rounded-sm"
                    style={{
                      backgroundColor: accentColor,
                      animation: 'blink 0.8s step-end infinite',
                    }}
                  />
                </div>
              )}
            </div>
          </Section>

          {/* Feedbacks */}
          <Section title="発見したフィードバック" accentColor={accentColor} icon="alert" count={agentFeedbacks.length}>
            {agentFeedbacks.length === 0 ? (
              <p className="text-xs italic text-text-muted">
                まだフィードバックはありません
              </p>
            ) : (
              <div className="space-y-2">
                {agentFeedbacks.map(fb => {
                  const typeInfo = FEEDBACK_TYPE_LABELS[fb.type] || { label: fb.type, color: '#8B7355', bg: '#F5F0EB' };
                  const sevColor = SEVERITY_COLORS[fb.severity] || '#8B7355';
                  return (
                    <div
                      key={fb.id}
                      className="rounded-xl p-2.5 text-xs bg-[#FAFAF8] border border-border-warm"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                          style={{ backgroundColor: typeInfo.bg, color: typeInfo.color }}
                        >
                          {typeInfo.label}
                        </span>
                        <span
                          className="text-[10px] font-medium uppercase"
                          style={{ color: sevColor }}
                        >
                          {fb.severity}
                        </span>
                        {fb.resolved && (
                          <span className="text-[10px] font-medium rounded-full px-1.5 py-0.5" style={{ color: '#6ECFB0', background: '#F0FDF4' }}>
                            解決済
                          </span>
                        )}
                      </div>
                      <p className="text-text-primary">{fb.description}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Skills */}
          <Section title="保有スキル" accentColor={accentColor} icon="skill" count={agentSkills.length}>
            {agentSkills.length === 0 ? (
              <p className="text-xs italic text-text-muted">
                まだスキルはありません
              </p>
            ) : (
              <div className="space-y-2">
                {agentSkills.map(skill => (
                  <div
                    key={skill.id}
                    className="rounded-xl p-2.5 text-xs bg-[#FAFAF8] border border-border-warm"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium text-text-primary">
                        {skill.name}
                      </span>
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: accentBg, color: accentColor }}
                      >
                        {Math.round(skill.confidence * 100)}%
                      </span>
                    </div>
                    <p className="text-text-secondary">{skill.description}</p>
                    <p className="mt-1 text-text-muted">
                      ソース: {skill.source.replace('_', ' ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="h-6" />
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function LogLine({ text, accentColor }: { text: string; accentColor: string }) {
  const isWarning = text.includes('\u26a0\ufe0f');
  return (
    <div className="flex items-start gap-1.5 text-xs leading-relaxed">
      <span style={{ color: accentColor }} className="shrink-0 select-none">{'>'}</span>
      <span style={{ color: isWarning ? '#FFD93D' : '#E2DDD5' }}>{text}</span>
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
  icon: 'terminal' | 'alert' | 'skill';
  count?: number;
  children: React.ReactNode;
}) {
  const icons = {
    terminal: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    ),
    alert: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    skill: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  };

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        {icons[icon]}
        <h3 className="text-xs font-medium uppercase tracking-wider text-text-secondary">
          {title}
        </h3>
        {count !== undefined && (
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
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
