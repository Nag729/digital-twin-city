import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { Agent, AgentRole, Feedback, FeedbackType, PhaseMetrics, PhaseNumber } from '../types';

// ─── Role icon helper ───────────────────────────────────────────
const ROLE_ICONS: Record<AgentRole, string> = {
  warehouse_worker: '📦',
  sort_operator: '🔀',
  delivery_driver: '🚚',
  recipient: '👤',
};

// ─── Count-up hook ───────────────────────────────────────────────
function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);
  const prevTargetRef = useRef(target);
  const startValueRef = useRef(0);

  if (prevTargetRef.current !== target) {
    startValueRef.current = value;
    prevTargetRef.current = target;
  }

  useEffect(() => {
    const start = startValueRef.current;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(start + diff * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    };
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return value;
}

// ─── Mini line chart (SVG) ───────────────────────────────────────
function QualityChart({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null;

  const w = 220;
  const h = 64;
  const pad = 6;
  const maxVal = Math.max(...scores, 1);
  const pts = scores.map((v, i) => ({
    x: pad + (i / (scores.length - 1)) * (w - pad * 2),
    y: h - pad - (v / maxVal) * (h - pad * 2),
  }));

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${pts[pts.length - 1].x},${h - pad} L${pts[0].x},${h - pad} Z`;

  return (
    <svg width={w} height={h} className="mt-2 w-full">
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
function PaperCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-2xl p-5 ${className}`}
      style={{
        background: '#FFFFFF',
        border: '1.5px solid #F5E6D3',
        boxShadow: '0 2px 12px rgba(180, 140, 100, 0.06)',
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
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-base font-mono font-medium" style={{ color }}>
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
  for (const f of feedbacks) counts[f.type]++;

  return (
    <div className="flex gap-2 mt-2.5">
      {(Object.keys(counts) as FeedbackType[]).map((type) => {
        const cfg = FB_CONFIG[type];
        return (
          <span
            key={type}
            className="text-xs font-medium px-3 py-1.5 rounded-full"
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
  for (const a of agents) counts[a.role]++;

  return (
    <div className="flex flex-wrap gap-2 mt-2.5">
      {(Object.keys(counts) as AgentRole[]).map((role) => {
        if (counts[role] === 0) return null;
        const cfg = ROLE_CONFIG[role];
        return (
          <span
            key={role}
            className="text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1"
            style={{ color: cfg.color, backgroundColor: cfg.bg }}
          >
            <span>{ROLE_ICONS[role]}</span>
            {cfg.label} x{counts[role]}
          </span>
        );
      })}
    </div>
  );
}

// ─── Agent state summary ────────────────────────────────────────
const STATE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  idle: { label: '待機', color: '#8B7355', bg: '#F5F0EB' },
  moving: { label: '移動中', color: '#87CEEB', bg: '#F0F8FF' },
  working: { label: '作業中', color: '#6ECFB0', bg: '#F0FDF4' },
  reporting: { label: '報告中', color: '#FFB347', bg: '#FFF8EE' },
  communicating: { label: '通信中', color: '#C4B5FD', bg: '#F5F3FF' },
};

function AgentStateSummary({ agents }: { agents: Agent[] }) {
  const stateCounts: Record<string, number> = {};
  agents.forEach((a) => {
    stateCounts[a.state] = (stateCounts[a.state] || 0) + 1;
  });

  return (
    <div className="flex flex-wrap gap-2 mt-2.5">
      {Object.entries(stateCounts).map(([state, count]) => {
        const cfg = STATE_LABELS[state] || { label: state, color: '#8B7355', bg: '#F5F0EB' };
        return (
          <span
            key={state}
            className="text-xs font-medium px-3 py-1.5 rounded-full"
            style={{ color: cfg.color, backgroundColor: cfg.bg }}
          >
            {cfg.label}: {count}
          </span>
        );
      })}
    </div>
  );
}

// ─── Section title ──────────────────────────────────────────────
function SectionTitle({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-3.5">
      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="section-label" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

// ─── Main StatusPanel ───────────────────────────────────────────
interface StatusPanelProps {
  currentPhase: PhaseNumber;
  metrics: PhaseMetrics;
  feedbacks: Feedback[];
  agents?: Agent[];
  qualityHistory?: number[];
}

export default function StatusPanel({
  currentPhase,
  metrics,
  feedbacks,
  agents = [],
  qualityHistory = [],
}: StatusPanelProps) {
  const chartScores = qualityHistory;

  return (
    <div
      className="w-[400px] h-full flex flex-col gap-5 p-5 overflow-y-auto"
      style={{ background: 'rgba(255, 248, 240, 0.6)' }}
    >
      {/* Core metrics */}
      <PaperCard>
        <SectionTitle label="メトリクス" color="#6ECFB0" />
        <MetricRow label="施設数" value={12} color="#87CEEB" />
        <MetricRow
          label="配送成功率"
          value={metrics.deliverySuccessRate}
          suffix="%"
          color="#6ECFB0"
          placeholder="---%"
        />
        {currentPhase >= 2 && <MetricRow label="エージェント数" value={metrics.agentCount} color="#87CEEB" />}
        {currentPhase >= 3 && (
          <>
            <MetricRow label="フィードバック数" value={metrics.totalFeedbacks} color="#FFB347" />
            <MetricRow label="解決済み" value={metrics.resolvedIssues} color="#6ECFB0" />
          </>
        )}
        {currentPhase >= 4 && (
          <MetricRow label="品質スコア" value={metrics.qualityScore} suffix="/100" color="#6ECFB0" />
        )}
        {currentPhase >= 4 && chartScores.length > 1 && (
          <div className="mt-4 pt-4 border-t border-border-warm/40">
            <span className="text-xs text-text-secondary font-medium">品質スコア推移</span>
            <QualityChart scores={chartScores} />
          </div>
        )}
      </PaperCard>

      {/* Agent roles (Phase 2+) */}
      {currentPhase >= 2 && agents.length > 0 && (
        <PaperCard>
          <SectionTitle label="エージェント" color="#87CEEB" />
          <AgentRoleBreakdown agents={agents} />
          <div className="mt-4 pt-4 border-t border-border-warm/30">
            <span className="text-xs text-text-secondary font-medium">ステータス</span>
            <AgentStateSummary agents={agents} />
          </div>
        </PaperCard>
      )}

      {/* Feedback breakdown (Phase 3+) */}
      {currentPhase >= 3 && feedbacks.length > 0 && (
        <PaperCard>
          <SectionTitle label="フィードバック" color="#FFB347" />
          <FeedbackBreakdown feedbacks={feedbacks} />
          {feedbacks.some((f) => f.resolved) && (
            <div
              className="mt-3 flex items-center gap-2 text-xs rounded-xl px-3 py-2"
              style={{ color: '#6ECFB0', background: '#F0FDF4', border: '1px solid #D1FAE5' }}
            >
              <span>✅</span>
              <span className="font-medium">
                {feedbacks.filter((f) => f.resolved).length}/{feedbacks.length} 件の課題が改善によって解決
              </span>
            </div>
          )}
          <motion.div
            className="mt-4 space-y-3.5 max-h-48 overflow-y-auto"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
          >
            {feedbacks.slice(0, 5).map((fb) => {
              const cfg = FB_CONFIG[fb.type];
              return (
                <motion.div
                  key={fb.id}
                  className="text-xs py-2.5 border-b border-border-warm/30 last:border-0"
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: cfg.color }} />
                    <span className="text-text-secondary">{fb.agentName}</span>
                    {fb.resolved && (
                      <span
                        className="text-[10px] font-medium ml-auto rounded-full px-2 py-0.5"
                        style={{ color: '#6ECFB0', background: '#F0FDF4' }}
                      >
                        解決済
                      </span>
                    )}
                  </div>
                  <p className="text-text-primary mt-1.5 leading-relaxed">{fb.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </PaperCard>
      )}
    </div>
  );
}
