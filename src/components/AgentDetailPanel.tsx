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
  warehouse_worker: '#f59e0b',
  sort_operator: '#fb923c',
  delivery_driver: '#06b6d4',
  recipient: '#a3e635',
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

const FEEDBACK_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  bug: { label: 'BUG', color: '#ef4444' },
  ux_improvement: { label: 'UX', color: '#a78bfa' },
  performance: { label: 'PERF', color: '#f59e0b' },
};

const SEVERITY_COLORS: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
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

  // Typewriter effect for operation logs
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

  // Auto-scroll log container
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [visibleLogLines, typingText]);

  // Click outside to dismiss
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      onClose();
    }
  }, [onClose]);

  // ESC key to close
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
  const roleLabel = ROLE_LABELS[agent.role];
  const agentIndex = parseInt(agent.id.replace('a', ''), 10);
  const roleIndex = String(agentIndex).padStart(2, '0');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end"
      onClick={handleBackdropClick}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(2px)' }}
    >
      {/* Slide-in Panel */}
      <div
        ref={panelRef}
        className="h-full w-[420px] max-w-[90vw] overflow-y-auto"
        style={{
          background: 'linear-gradient(180deg, #0d1117 0%, #0a0e1a 100%)',
          borderLeft: `1px solid ${accentColor}33`,
          boxShadow: `
            -4px 0 30px ${accentColor}15,
            inset 0 0 60px rgba(0, 0, 0, 0.5)
          `,
          animation: 'slideIn 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-6 pt-5 pb-4"
          style={{
            background: 'linear-gradient(180deg, #0d1117 80%, transparent)',
            borderBottom: `1px solid ${accentColor}22`,
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Agent avatar circle */}
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold"
                style={{
                  background: `${accentColor}20`,
                  border: `2px solid ${accentColor}`,
                  color: accentColor,
                  boxShadow: `0 0 15px ${accentColor}40`,
                }}
              >
                {agent.name[0]}
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: '#f8fafc' }}>
                  {agent.name}
                </h2>
                <p
                  className="text-xs font-medium tracking-wider uppercase"
                  style={{ color: accentColor }}
                >
                  {roleLabel} #{roleIndex}
                </p>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md transition-colors"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#f8fafc';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Current state */}
          <div
            className="mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-sm"
            style={{
              background: `${accentColor}10`,
              border: `1px solid ${accentColor}25`,
            }}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{
                backgroundColor: accentColor,
                boxShadow: `0 0 6px ${accentColor}`,
                animation: 'pulse-glow 2s ease-in-out infinite',
              }}
            />
            <span style={{ color: '#94a3b8' }}>
              {STATE_LABELS[agent.state] || agent.state}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-5 px-6 py-4">
          {/* Operation Log */}
          <Section title="Operation Log" accentColor={accentColor} icon="terminal">
            <div
              ref={logContainerRef}
              className="max-h-[220px] overflow-y-auto rounded-md p-3"
              style={{
                background: '#000000',
                border: '1px solid #1e293b',
                fontFamily: "'Fira Code', 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace",
              }}
            >
              {logs.slice(0, visibleLogLines).map((line, i) => (
                <LogLine key={i} text={line} accentColor={accentColor} />
              ))}
              {currentTypingLine < logs.length && (
                <div className="flex items-start gap-1.5 text-xs leading-relaxed">
                  <span style={{ color: accentColor }} className="shrink-0 select-none">{'>'}</span>
                  <span style={{ color: '#cbd5e1' }}>
                    {typingText}
                    <span
                      className="ml-px inline-block h-3.5 w-1.5 align-middle"
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
                    className="inline-block h-3.5 w-1.5"
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
          <Section title="Discovered Feedbacks" accentColor={accentColor} icon="alert" count={agentFeedbacks.length}>
            {agentFeedbacks.length === 0 ? (
              <p className="text-xs italic" style={{ color: '#475569' }}>
                No feedbacks discovered yet
              </p>
            ) : (
              <div className="space-y-2">
                {agentFeedbacks.map(fb => {
                  const typeInfo = FEEDBACK_TYPE_LABELS[fb.type] || { label: fb.type, color: '#94a3b8' };
                  const sevColor = SEVERITY_COLORS[fb.severity] || '#94a3b8';
                  return (
                    <div
                      key={fb.id}
                      className="rounded-md p-2.5 text-xs"
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider"
                          style={{
                            backgroundColor: `${typeInfo.color}20`,
                            color: typeInfo.color,
                            border: `1px solid ${typeInfo.color}40`,
                          }}
                        >
                          {typeInfo.label}
                        </span>
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase"
                          style={{ color: sevColor }}
                        >
                          {fb.severity}
                        </span>
                        {fb.resolved && (
                          <span className="text-[10px]" style={{ color: '#10b981' }}>
                            RESOLVED
                          </span>
                        )}
                      </div>
                      <p style={{ color: '#cbd5e1' }}>{fb.description}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Skills */}
          <Section title="Held Skills" accentColor={accentColor} icon="skill" count={agentSkills.length}>
            {agentSkills.length === 0 ? (
              <p className="text-xs italic" style={{ color: '#475569' }}>
                No skills acquired yet
              </p>
            ) : (
              <div className="space-y-2">
                {agentSkills.map(skill => (
                  <div
                    key={skill.id}
                    className="rounded-md p-2.5 text-xs"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium" style={{ color: '#f8fafc' }}>
                        {skill.name}
                      </span>
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px]"
                        style={{
                          backgroundColor: `${accentColor}15`,
                          color: accentColor,
                        }}
                      >
                        {Math.round(skill.confidence * 100)}%
                      </span>
                    </div>
                    <p style={{ color: '#94a3b8' }}>{skill.description}</p>
                    <p className="mt-1" style={{ color: '#475569' }}>
                      Source: {skill.source.replace('_', ' ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* Bottom padding */}
        <div className="h-6" />
      </div>

      {/* Inline styles for animations */}
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
      <span style={{ color: isWarning ? '#fbbf24' : '#cbd5e1' }}>{text}</span>
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
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>
          {title}
        </h3>
        {count !== undefined && (
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
            style={{
              backgroundColor: `${accentColor}20`,
              color: accentColor,
            }}
          >
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
