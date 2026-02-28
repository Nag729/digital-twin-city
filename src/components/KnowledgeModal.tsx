import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentSkill } from '../types';

const SOURCE_LABELS: Record<AgentSkill['source'], { label: string; color: string; bg: string; icon: string }> = {
  user_feedback: { label: '現場フィードバック', color: '#FF8FAB', bg: '#FFF0F5', icon: '🗣️' },
  usage_analytics: { label: '利用データ分析', color: '#87CEEB', bg: '#F0F8FF', icon: '📊' },
  domain_expert: { label: '専門家知見', color: '#C4B5FD', bg: '#F5F3FF', icon: '🎓' },
};

function KnowledgeItem({ skill, delay }: { skill: AgentSkill; delay: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!visible) return null;

  const srcCfg = SOURCE_LABELS[skill.source] || SOURCE_LABELS.usage_analytics;

  return (
    <div
      className="animate-fade-in rounded-2xl p-5"
      style={{
        background: '#FFFFFF',
        border: '1.5px solid #F5E6D3',
        boxShadow: '0 2px 8px rgba(180, 140, 100, 0.05)',
      }}
    >
      <div className="flex items-center gap-2.5 mb-3.5">
        <span className="text-base">{srcCfg.icon}</span>
        <span
          className="text-xs font-medium px-3 py-1 rounded-full"
          style={{ color: srcCfg.color, backgroundColor: srcCfg.bg }}
        >
          {srcCfg.label}
        </span>
      </div>
      <p className="text-sm font-medium text-text-primary mb-2.5">{skill.name}</p>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">{skill.description}</p>
      <div className="flex items-center gap-3">
        <span className="text-xs text-text-muted shrink-0">信頼度</span>
        <div className="h-2 flex-1 rounded-full bg-border-warm/50 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${skill.confidence * 100}%`,
              background: 'linear-gradient(90deg, #6ECFB0, #87CEEB)',
            }}
          />
        </div>
        <span className="text-sm font-mono font-medium text-text-secondary">{Math.round(skill.confidence * 100)}%</span>
      </div>
    </div>
  );
}

interface KnowledgeModalProps {
  open: boolean;
  onClose: () => void;
  skills: AgentSkill[];
}

export default function KnowledgeModal({ open, onClose, skills }: KnowledgeModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(93,78,55,0.35)] backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={panelRef}
        className="w-[560px] max-w-[90vw] max-h-[85vh] overflow-y-auto rounded-3xl bg-white shadow-[0_8px_40px_rgba(180,140,100,0.2)] animate-[slideUp_0.3s_ease-out]"
      >
        {/* Header */}
        <div className="px-7 pt-7 pb-5" style={{ borderBottom: '1.5px solid #F5E6D3' }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl"
                style={{ background: '#F0F8FF', boxShadow: '0 2px 8px rgba(135, 206, 235, 0.2)' }}
              >
                📡
              </div>
              <div>
                <h2 className="text-lg font-medium text-text-primary">外部ナレッジ</h2>
                <p className="text-xs text-text-muted mt-0.5">AIだけでは知り得ない現実世界の知識</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors bg-[#F5F0EB] text-text-muted hover:bg-border-warm"
            >
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-7 py-6 space-y-6">
          {/* Explanation */}
          <div className="rounded-2xl p-5" style={{ border: '1.5px solid #BAE6FD', backgroundColor: '#F0F9FF' }}>
            <p className="text-sm leading-relaxed" style={{ color: '#0369A1' }}>
              プロダクト改善の判断基準として、外部から注入される知識です。
              現場の声・利用データ・専門家の知見を統合し、AIの探索精度を引き上げます。
            </p>
          </div>

          {/* Knowledge items */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-secondary mb-4">注入済みナレッジ</p>
            <div className="space-y-4">
              {skills.map((skill, i) => (
                <KnowledgeItem key={skill.id} skill={skill} delay={i * 300} />
              ))}
            </div>
          </div>

          {/* Key insight */}
          <div
            className="rounded-2xl p-5 text-center"
            style={{ background: 'linear-gradient(135deg, #F0F9FF, #F0FDF4)', border: '1px solid #BAE6FD' }}
          >
            <p className="text-sm leading-relaxed" style={{ color: '#5D4E37' }}>
              エージェントが<strong style={{ color: '#6ECFB0' }}>「探索」</strong>する一方、 人間の経験値が
              <strong style={{ color: '#0EA5E9' }}>「教師データ」</strong>となる。
            </p>
            <p className="text-xs text-text-muted mt-2">これが分布外の盲点を補い、デジタルツインの解像度を高める。</p>
          </div>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
