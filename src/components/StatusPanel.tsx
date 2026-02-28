import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  PhaseNumber,
  PhaseMetrics,
  Vision,
  AgentSkill,
  Feedback,
  FeedbackType,
  AgentRole,
  Agent,
} from '../types';

// ─── Count-up hook ───────────────────────────────────────────────
function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const start = value;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    };
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}

// ─── Mini line chart (SVG) ───────────────────────────────────────
function QualityChart({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null;

  const w = 160;
  const h = 48;
  const pad = 4;
  const maxVal = Math.max(...scores, 1);
  const pts = scores.map((v, i) => ({
    x: pad + (i / (scores.length - 1)) * (w - pad * 2),
    y: h - pad - (v / maxVal) * (h - pad * 2),
  }));

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${pts[pts.length - 1].x},${h - pad} L${pts[0].x},${h - pad} Z`;

  return (
    <svg width={w} height={h} className="mt-1">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6ECFB0" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#6ECFB0" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#chartGrad)" />
      <path d={line} fill="none" stroke="#6ECFB0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.length > 0 && (
        <circle
          cx={pts[pts.length - 1].x}
          cy={pts[pts.length - 1].y}
          r="3.5"
          fill="#6ECFB0"
          stroke="white"
          strokeWidth="1.5"
        />
      )}
    </svg>
  );
}

// ─── Paper Card wrapper ──────────────────────────────────────────
function PaperCard({
  children,
  accentColor = '#6ECFB0',
  className = '',
}: {
  children: React.ReactNode;
  accentColor?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-2xl p-3 ${className}`}
      style={{
        background: '#FFFFFF',
        border: '1.5px solid #F5E6D3',
        boxShadow: `0 2px 12px rgba(180, 140, 100, 0.06), 0 0 0 0 ${accentColor}00`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Metric row ─────────────────────────────────────────────────
function MetricRow({
  label,
  value,
  suffix = '',
  color = '#6ECFB0',
  placeholder,
}: {
  label: string;
  value: number;
  suffix?: string;
  color?: string;
  placeholder?: string;
}) {
  const displayed = useCountUp(value);

  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-text-secondary">{label}</span>
      <span className="text-sm font-mono font-medium" style={{ color }}>
        {placeholder !== undefined && value === 0 ? placeholder : `${displayed}${suffix}`}
      </span>
    </div>
  );
}

// ─── Feedback category badge ────────────────────────────────────
const FB_CONFIG: Record<FeedbackType, { label: string; color: string; bg: string }> = {
  bug: { label: 'Bug', color: '#FF6B6B', bg: '#FFF0F0' },
  ux_improvement: { label: 'UX', color: '#FFB347', bg: '#FFF8EE' },
  performance: { label: 'Perf', color: '#FF8FAB', bg: '#FFF0F5' },
};

function FeedbackBreakdown({ feedbacks }: { feedbacks: Feedback[] }) {
  const counts: Record<FeedbackType, number> = { bug: 0, ux_improvement: 0, performance: 0 };
  feedbacks.forEach((f) => counts[f.type]++);

  return (
    <div className="flex gap-2 mt-1">
      {(Object.keys(counts) as FeedbackType[]).map((type) => {
        const cfg = FB_CONFIG[type];
        return (
          <span
            key={type}
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ color: cfg.color, backgroundColor: cfg.bg }}
          >
            {cfg.label}: {counts[type]}
          </span>
        );
      })}
    </div>
  );
}

// ─── Agent role badge ───────────────────────────────────────────
const ROLE_CONFIG: Record<AgentRole, { label: string; color: string; bg: string }> = {
  warehouse_worker: { label: '倉庫', color: '#87CEEB', bg: '#F0F8FF' },
  sort_operator: { label: '仕分', color: '#C4B5FD', bg: '#F5F3FF' },
  delivery_driver: { label: '配送', color: '#6ECFB0', bg: '#F0FDF4' },
  recipient: { label: '受取', color: '#FFB347', bg: '#FFF8EE' },
};

function AgentRoleBreakdown({ agents }: { agents: Agent[] }) {
  const counts: Record<AgentRole, number> = {
    warehouse_worker: 0,
    sort_operator: 0,
    delivery_driver: 0,
    recipient: 0,
  };
  agents.forEach((a) => counts[a.role]++);

  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {(Object.keys(counts) as AgentRole[]).map((role) => {
        if (counts[role] === 0) return null;
        const cfg = ROLE_CONFIG[role];
        return (
          <span
            key={role}
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ color: cfg.color, backgroundColor: cfg.bg }}
          >
            {cfg.label} x{counts[role]}
          </span>
        );
      })}
    </div>
  );
}

// ─── Agent state summary ────────────────────────────────────────
function AgentStateSummary({ agents }: { agents: Agent[] }) {
  const stateCounts: Record<string, number> = {};
  agents.forEach((a) => {
    stateCounts[a.state] = (stateCounts[a.state] || 0) + 1;
  });

  const STATE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    idle: { label: '待機', color: '#8B7355', bg: '#F5F0EB' },
    moving: { label: '移動中', color: '#87CEEB', bg: '#F0F8FF' },
    working: { label: '作業中', color: '#6ECFB0', bg: '#F0FDF4' },
    reporting: { label: '報告中', color: '#FFB347', bg: '#FFF8EE' },
    communicating: { label: '通信中', color: '#C4B5FD', bg: '#F5F3FF' },
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {Object.entries(stateCounts).map(([state, count]) => {
        const cfg = STATE_LABELS[state] || { label: state, color: '#8B7355', bg: '#F5F0EB' };
        return (
          <span
            key={state}
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ color: cfg.color, backgroundColor: cfg.bg }}
          >
            {cfg.label}: {count}
          </span>
        );
      })}
    </div>
  );
}

// ─── Skill item with injection animation ────────────────────────
function SkillItem({ skill, delay }: { skill: AgentSkill; delay: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!visible) return null;

  const sourceLabel =
    skill.source === 'user_feedback' ? 'FB' : skill.source === 'usage_analytics' ? 'DATA' : 'EXPERT';

  const SOURCE_COLORS: Record<string, { color: string; bg: string }> = {
    FB: { color: '#FF8FAB', bg: '#FFF0F5' },
    DATA: { color: '#87CEEB', bg: '#F0F8FF' },
    EXPERT: { color: '#C4B5FD', bg: '#F5F3FF' },
  };
  const srcCfg = SOURCE_COLORS[sourceLabel] || SOURCE_COLORS.DATA;

  return (
    <div
      className="animate-fade-in border-l-2 pl-2.5 py-1 rounded-r-xl"
      style={{
        borderColor: '#6ECFB0',
        background: 'rgba(110, 207, 176, 0.04)',
      }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
          style={{ color: srcCfg.color, backgroundColor: srcCfg.bg }}
        >
          {sourceLabel}
        </span>
        <span className="text-[11px] font-medium text-text-primary">{skill.name}</span>
      </div>
      <p className="text-[10px] text-text-secondary mt-0.5 leading-tight">{skill.description}</p>
      <div className="flex items-center gap-1 mt-1">
        <div className="h-1.5 flex-1 rounded-full bg-border-warm/50 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${skill.confidence * 100}%`,
              background: 'linear-gradient(90deg, #6ECFB0, #87CEEB)',
            }}
          />
        </div>
        <span className="text-[9px] font-medium text-text-muted">{Math.round(skill.confidence * 100)}%</span>
      </div>
    </div>
  );
}

// ─── Vision Panel (Phase 5) ─────────────────────────────────────
function VisionPanel({ vision }: { vision: Vision }) {
  const alignmentAnimated = useCountUp(Math.round(vision.alignmentScore * 100));
  const circumference = 2 * Math.PI * 28;
  const [dashOffset, setDashOffset] = useState(circumference);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDashOffset(circumference * (1 - vision.alignmentScore));
    }, 200);
    return () => clearTimeout(timer);
  }, [vision.alignmentScore, circumference]);

  return (
    <PaperCard accentColor="#C4B5FD" className="animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: '#C4B5FD' }}
        />
        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#C4B5FD' }}>Human Vision</span>
      </div>

      {/* Vision statement */}
      <div
        className="rounded-xl p-2.5 mb-2"
        style={{
          border: '1.5px solid #E9D5FF',
          backgroundColor: '#FAF5FF',
        }}
      >
        <p className="text-sm font-medium leading-snug" style={{ color: '#7C3AED' }}>
          &ldquo;{vision.statement}&rdquo;
        </p>
      </div>

      {/* Priorities */}
      <div className="mb-2">
        <span className="text-[10px] text-text-secondary uppercase tracking-wide font-medium">Priorities</span>
        <ul className="mt-1 space-y-1">
          {vision.priorities.map((p, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] text-text-primary">
              <span className="font-medium mt-px text-[9px] rounded-full w-4 h-4 flex items-center justify-center" style={{ color: '#C4B5FD', background: '#F5F3FF' }}>
                {i + 1}
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>

      {/* Alignment score gauge */}
      <div className="flex items-center gap-3">
        <svg width="68" height="68" viewBox="0 0 68 68">
          <circle cx="34" cy="34" r="28" fill="none" stroke="#F5E6D3" strokeWidth="4" />
          <circle
            cx="34"
            cy="34"
            r="28"
            fill="none"
            stroke="url(#visionGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 34 34)"
            style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
          <defs>
            <linearGradient id="visionGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#C4B5FD" />
              <stop offset="100%" stopColor="#FF8FAB" />
            </linearGradient>
          </defs>
          <text x="34" y="32" textAnchor="middle" className="text-sm font-mono font-medium" fill="#7C3AED">
            {alignmentAnimated}%
          </text>
          <text x="34" y="44" textAnchor="middle" className="text-[8px]" fill="#8B7355">
            Alignment
          </text>
        </svg>
        <p className="text-[10px] text-text-secondary leading-tight flex-1">
          ビジョンとプロダクト進化の方向性が一致しているスコアです。人間の意思決定がAIの進化に方向性を与えます。
        </p>
      </div>
    </PaperCard>
  );
}

// ─── Main StatusPanel ───────────────────────────────────────────
interface StatusPanelProps {
  currentPhase: PhaseNumber;
  metrics: PhaseMetrics;
  vision: Vision | null;
  skills: AgentSkill[];
  feedbacks: Feedback[];
  agents?: Agent[];
  qualityHistory?: number[];
}

export default function StatusPanel({
  currentPhase,
  metrics,
  vision,
  skills,
  feedbacks,
  agents = [],
  qualityHistory = [],
}: StatusPanelProps) {
  const chartScores =
    qualityHistory.length > 0 ? qualityHistory : currentPhase >= 4 ? [12, 25, 38, 52, 65, metrics.qualityScore] : [];

  const sectionTitle = useCallback(
    (label: string, color: string) => (
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color }}>
          {label}
        </span>
      </div>
    ),
    [],
  );

  return (
    <div
      className="w-72 h-full flex flex-col gap-2.5 p-3 overflow-y-auto"
      style={{ background: 'rgba(255, 248, 240, 0.6)' }}
    >
      {/* Phase indicator */}
      <PaperCard accentColor="#87CEEB">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">Phase</span>
          <span className="text-lg font-mono font-medium" style={{ color: '#5D4E37' }}>
            {currentPhase}/5
          </span>
        </div>
        <div className="flex gap-1.5 mt-1.5">
          {[1, 2, 3, 4, 5].map((p) => {
            const colors = ['#6ECFB0', '#87CEEB', '#FFD93D', '#FF8FAB', '#C4B5FD'];
            return (
              <div
                key={p}
                className="flex-1 h-1.5 rounded-full transition-all duration-500"
                style={{
                  backgroundColor: p <= currentPhase ? colors[p - 1] : '#F5E6D3',
                }}
              />
            );
          })}
        </div>
      </PaperCard>

      {/* Core metrics */}
      <PaperCard accentColor="#6ECFB0">
        {sectionTitle('Metrics', '#6ECFB0')}
        <MetricRow label="施設数" value={12} color="#87CEEB" />
        <MetricRow label="配送成功率" value={metrics.deliverySuccessRate} suffix="%" color="#6ECFB0" placeholder="---%"  />
        {currentPhase >= 2 && <MetricRow label="エージェント数" value={metrics.agentCount} color="#87CEEB" />}
        {currentPhase >= 3 && (
          <>
            <MetricRow label="フィードバック数" value={metrics.totalFeedbacks} color="#FFB347" />
            <MetricRow label="解決済み" value={metrics.resolvedIssues} color="#6ECFB0" />
          </>
        )}
        {currentPhase >= 4 && <MetricRow label="品質スコア" value={metrics.qualityScore} suffix="/100" color="#6ECFB0" />}
        {currentPhase >= 4 && chartScores.length > 1 && (
          <div className="mt-1.5 pt-1.5 border-t border-border-warm/40">
            <span className="text-[10px] text-text-secondary font-medium">品質推移</span>
            <QualityChart scores={chartScores} />
          </div>
        )}
      </PaperCard>

      {/* Agent roles (Phase 2+) */}
      {currentPhase >= 2 && agents.length > 0 && (
        <PaperCard accentColor="#87CEEB">
          {sectionTitle('Agents', '#87CEEB')}
          <AgentRoleBreakdown agents={agents} />
          <div className="mt-1.5 pt-1.5 border-t border-border-warm/30">
            <span className="text-[10px] text-text-secondary font-medium">Status</span>
            <AgentStateSummary agents={agents} />
          </div>
        </PaperCard>
      )}

      {/* Feedback breakdown (Phase 3+) */}
      {currentPhase >= 3 && feedbacks.length > 0 && (
        <PaperCard accentColor="#FFB347">
          {sectionTitle('Feedbacks', '#FFB347')}
          <FeedbackBreakdown feedbacks={feedbacks} />
          <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
            {feedbacks.slice(0, 5).map((fb, i) => {
              const cfg = FB_CONFIG[fb.type];
              return (
                <div
                  key={fb.id}
                  className="text-[10px] py-1.5 border-b border-border-warm/30 last:border-0 animate-fade-in"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{ backgroundColor: cfg.color }}
                    />
                    <span className="text-text-secondary">{fb.agentName}</span>
                    {fb.resolved && (
                      <span className="text-[8px] font-medium ml-auto rounded-full px-1.5 py-0.5" style={{ color: '#6ECFB0', background: '#F0FDF4' }}>RESOLVED</span>
                    )}
                  </div>
                  <p className="text-text-primary mt-0.5 leading-tight">{fb.description}</p>
                </div>
              );
            })}
          </div>
        </PaperCard>
      )}

      {/* Agent Skills (Phase 3+) */}
      {currentPhase >= 3 && skills.length > 0 && (
        <PaperCard accentColor="#87CEEB">
          {sectionTitle('Agent Skills', '#87CEEB')}
          <div className="space-y-2">
            {skills.map((skill, i) => (
              <SkillItem key={skill.id} skill={skill} delay={i * 400} />
            ))}
          </div>
        </PaperCard>
      )}

      {/* Human Vision (Phase 5) */}
      {currentPhase >= 5 && vision && <VisionPanel vision={vision} />}
    </div>
  );
}
