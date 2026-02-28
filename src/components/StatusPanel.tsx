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
      // ease-out cubic
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
          <stop offset="0%" stopColor="var(--color-neon-green)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-neon-green)" stopOpacity="0.02" />
        </linearGradient>
        <filter id="chartGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={area} fill="url(#chartGrad)" />
      <path d={line} fill="none" stroke="var(--color-neon-green)" strokeWidth="2" filter="url(#chartGlow)" />
      {pts.length > 0 && (
        <circle
          cx={pts[pts.length - 1].x}
          cy={pts[pts.length - 1].y}
          r="3"
          fill="var(--color-neon-green)"
          className="animate-pulse"
        />
      )}
    </svg>
  );
}

// ─── Glow Card wrapper ──────────────────────────────────────────
function GlowCard({
  children,
  glowColor = 'var(--color-neon-blue)',
  className = '',
}: {
  children: React.ReactNode;
  glowColor?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-lg border border-white/10 bg-bg-card/80 backdrop-blur-sm p-3 ${className}`}
      style={{
        boxShadow: `0 0 8px ${glowColor}22, inset 0 1px 0 ${glowColor}15`,
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
  color = 'var(--color-neon-blue)',
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
      <span className="text-sm font-mono font-semibold" style={{ color, textShadow: `0 0 8px ${color}66` }}>
        {placeholder !== undefined && value === 0 ? placeholder : `${displayed}${suffix}`}
      </span>
    </div>
  );
}

// ─── Feedback category badge ────────────────────────────────────
const FB_CONFIG: Record<FeedbackType, { label: string; color: string }> = {
  bug: { label: 'Bug', color: 'var(--color-neon-red)' },
  ux_improvement: { label: 'UX', color: 'var(--color-neon-amber)' },
  performance: { label: 'Perf', color: 'var(--color-neon-orange)' },
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
            className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
            style={{
              color: cfg.color,
              borderColor: `${cfg.color}44`,
              backgroundColor: `${cfg.color}11`,
            }}
          >
            {cfg.label}: {counts[type]}
          </span>
        );
      })}
    </div>
  );
}

// ─── Agent role badge ───────────────────────────────────────────
const ROLE_CONFIG: Record<AgentRole, { label: string; color: string }> = {
  warehouse_worker: { label: '倉庫', color: 'var(--color-neon-blue)' },
  sort_operator: { label: '仕分', color: 'var(--color-neon-purple)' },
  delivery_driver: { label: '配送', color: 'var(--color-neon-green)' },
  recipient: { label: '受取', color: 'var(--color-neon-amber)' },
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
            className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
            style={{
              color: cfg.color,
              borderColor: `${cfg.color}44`,
              backgroundColor: `${cfg.color}11`,
            }}
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

  const STATE_LABELS: Record<string, { label: string; color: string }> = {
    idle: { label: '待機', color: 'var(--color-text-secondary)' },
    moving: { label: '移動中', color: 'var(--color-neon-blue)' },
    working: { label: '作業中', color: 'var(--color-neon-green)' },
    reporting: { label: '報告中', color: 'var(--color-neon-amber)' },
    communicating: { label: '通信中', color: 'var(--color-neon-cyan)' },
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {Object.entries(stateCounts).map(([state, count]) => {
        const cfg = STATE_LABELS[state] || { label: state, color: 'var(--color-text-secondary)' };
        return (
          <span
            key={state}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{ color: cfg.color, backgroundColor: `${cfg.color}15` }}
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

  return (
    <div
      className="animate-fade-in border-l-2 pl-2 py-1"
      style={{
        borderColor: 'var(--color-neon-cyan)',
        animation: `fade-in 0.5s ease-out forwards, skill-glow 1.5s ease-out ${delay}ms`,
      }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="text-[9px] font-mono px-1 py-0.5 rounded font-bold"
          style={{
            color: 'var(--color-neon-cyan)',
            backgroundColor: 'var(--color-neon-cyan)11',
            border: '1px solid var(--color-neon-cyan)33',
          }}
        >
          {sourceLabel}
        </span>
        <span className="text-[11px] font-semibold text-text-primary">{skill.name}</span>
      </div>
      <p className="text-[10px] text-text-secondary mt-0.5 leading-tight">{skill.description}</p>
      <div className="flex items-center gap-1 mt-0.5">
        <div className="h-1 flex-1 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${skill.confidence * 100}%`,
              background: `linear-gradient(90deg, var(--color-neon-cyan)88, var(--color-neon-cyan))`,
              boxShadow: '0 0 6px var(--color-neon-cyan)66',
            }}
          />
        </div>
        <span className="text-[9px] font-mono text-text-secondary">{Math.round(skill.confidence * 100)}%</span>
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
    <GlowCard glowColor="var(--color-neon-purple)" className="animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: 'var(--color-neon-purple)', boxShadow: '0 0 6px var(--color-neon-purple)' }}
        />
        <span className="text-[10px] font-mono uppercase tracking-wider text-neon-purple">Human Vision</span>
      </div>

      {/* Vision statement */}
      <div
        className="rounded-md p-2.5 mb-2 border"
        style={{
          borderColor: 'var(--color-neon-purple)33',
          backgroundColor: 'var(--color-neon-purple)08',
        }}
      >
        <p
          className="text-sm font-semibold leading-snug"
          style={{ color: 'var(--color-neon-purple)', textShadow: '0 0 12px var(--color-neon-purple)44' }}
        >
          &ldquo;{vision.statement}&rdquo;
        </p>
      </div>

      {/* Priorities */}
      <div className="mb-2">
        <span className="text-[10px] text-text-secondary uppercase tracking-wide">Priorities</span>
        <ul className="mt-1 space-y-1">
          {vision.priorities.map((p, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] text-text-primary">
              <span className="text-neon-purple mt-px font-mono text-[9px]">{String(i + 1).padStart(2, '0')}</span>
              {p}
            </li>
          ))}
        </ul>
      </div>

      {/* Alignment score gauge */}
      <div className="flex items-center gap-3">
        <svg width="68" height="68" viewBox="0 0 68 68">
          <circle cx="34" cy="34" r="28" fill="none" stroke="var(--color-border-glow)" strokeWidth="4" />
          <circle
            cx="34"
            cy="34"
            r="28"
            fill="none"
            stroke="var(--color-neon-purple)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 34 34)"
            style={{
              transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
              filter: 'drop-shadow(0 0 4px var(--color-neon-purple))',
            }}
          />
          <text
            x="34"
            y="32"
            textAnchor="middle"
            className="text-sm font-mono font-bold"
            fill="var(--color-neon-purple)"
          >
            {alignmentAnimated}%
          </text>
          <text x="34" y="44" textAnchor="middle" className="text-[8px]" fill="var(--color-text-secondary)">
            Alignment
          </text>
        </svg>
        <p className="text-[10px] text-text-secondary leading-tight flex-1">
          ビジョンとプロダクト進化の方向性が一致しているスコアです。人間の意思決定がAIの進化に方向性を与えます。
        </p>
      </div>
    </GlowCard>
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
  // Build quality history from metrics if not provided
  const chartScores =
    qualityHistory.length > 0 ? qualityHistory : currentPhase >= 4 ? [12, 25, 38, 52, 65, metrics.qualityScore] : [];

  const sectionTitle = useCallback(
    (label: string, color: string) => (
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
        <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color }}>
          {label}
        </span>
      </div>
    ),
    [],
  );

  return (
    <div className="w-72 h-full flex flex-col gap-2.5 p-3 overflow-y-auto">
      {/* ── Phase indicator ─────────────────────────────────── */}
      <GlowCard glowColor="var(--color-neon-blue)">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">Phase</span>
          <span
            className="text-lg font-mono font-bold"
            style={{ color: 'var(--color-neon-blue)', textShadow: '0 0 12px var(--color-neon-blue)66' }}
          >
            {currentPhase}/5
          </span>
        </div>
        {/* Phase progress dots */}
        <div className="flex gap-1.5 mt-1.5">
          {[1, 2, 3, 4, 5].map((p) => (
            <div
              key={p}
              className="flex-1 h-1 rounded-full transition-all duration-500"
              style={{
                backgroundColor:
                  p <= currentPhase ? 'var(--color-neon-blue)' : 'var(--color-border-glow)',
                boxShadow: p <= currentPhase ? '0 0 6px var(--color-neon-blue)66' : 'none',
              }}
            />
          ))}
        </div>
      </GlowCard>

      {/* ── Core metrics (all phases) ──────────────────────── */}
      <GlowCard glowColor="var(--color-neon-green)">
        {sectionTitle('Metrics', 'var(--color-neon-green)')}
        <MetricRow
          label="施設数"
          value={12}
          color="var(--color-neon-blue)"
        />
        <MetricRow
          label="配送成功率"
          value={metrics.deliverySuccessRate}
          suffix="%"
          color="var(--color-neon-green)"
          placeholder="---%"
        />
        {currentPhase >= 2 && (
          <MetricRow
            label="エージェント数"
            value={metrics.agentCount}
            color="var(--color-neon-cyan)"
          />
        )}
        {currentPhase >= 3 && (
          <>
            <MetricRow
              label="フィードバック数"
              value={metrics.totalFeedbacks}
              color="var(--color-neon-amber)"
            />
            <MetricRow
              label="解決済み"
              value={metrics.resolvedIssues}
              color="var(--color-neon-lime)"
            />
          </>
        )}
        {currentPhase >= 4 && (
          <MetricRow
            label="品質スコア"
            value={metrics.qualityScore}
            suffix="/100"
            color="var(--color-neon-green)"
          />
        )}

        {/* Quality chart (Phase 4+) */}
        {currentPhase >= 4 && chartScores.length > 1 && (
          <div className="mt-1.5 pt-1.5 border-t border-white/5">
            <span className="text-[10px] text-text-secondary">品質推移</span>
            <QualityChart scores={chartScores} />
          </div>
        )}
      </GlowCard>

      {/* ── Agent roles (Phase 2+) ─────────────────────────── */}
      {currentPhase >= 2 && agents.length > 0 && (
        <GlowCard glowColor="var(--color-neon-cyan)">
          {sectionTitle('Agents', 'var(--color-neon-cyan)')}
          <AgentRoleBreakdown agents={agents} />
          <div className="mt-1.5 pt-1.5 border-t border-white/5">
            <span className="text-[10px] text-text-secondary">Status</span>
            <AgentStateSummary agents={agents} />
          </div>
        </GlowCard>
      )}

      {/* ── Feedback breakdown (Phase 3+) ──────────────────── */}
      {currentPhase >= 3 && feedbacks.length > 0 && (
        <GlowCard glowColor="var(--color-neon-amber)">
          {sectionTitle('Feedbacks', 'var(--color-neon-amber)')}
          <FeedbackBreakdown feedbacks={feedbacks} />
          <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
            {feedbacks.slice(0, 5).map((fb, i) => {
              const cfg = FB_CONFIG[fb.type];
              return (
                <div
                  key={fb.id}
                  className="text-[10px] py-1 border-b border-white/5 last:border-0 animate-fade-in"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{ backgroundColor: cfg.color }}
                    />
                    <span className="text-text-secondary">{fb.agentName}</span>
                    {fb.resolved && (
                      <span className="text-[8px] text-neon-lime ml-auto font-mono">RESOLVED</span>
                    )}
                  </div>
                  <p className="text-text-primary mt-0.5 leading-tight">{fb.description}</p>
                </div>
              );
            })}
          </div>
        </GlowCard>
      )}

      {/* ── Agent Skills (Phase 3+) ────────────────────────── */}
      {currentPhase >= 3 && skills.length > 0 && (
        <GlowCard glowColor="var(--color-neon-cyan)">
          {sectionTitle('Agent Skills', 'var(--color-neon-cyan-bright)')}
          <div className="space-y-2">
            {skills.map((skill, i) => (
              <SkillItem key={skill.id} skill={skill} delay={i * 400} />
            ))}
          </div>
        </GlowCard>
      )}

      {/* ── Human Vision (Phase 5) ─────────────────────────── */}
      {currentPhase >= 5 && vision && <VisionPanel vision={vision} />}
    </div>
  );
}
