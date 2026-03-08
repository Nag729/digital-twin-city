import { motion } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';
import type { AgentSkill } from '../types';

const SOURCE_LABELS: Record<AgentSkill['source'], { label: string; color: string; bg: string; icon: string }> = {
  user_feedback: { label: '現場フィードバック', color: '#FF8FAB', bg: '#FFF0F5', icon: '🗣️' },
  usage_analytics: { label: '利用データ分析', color: '#87CEEB', bg: '#F0F8FF', icon: '📊' },
  domain_expert: { label: '専門家知見', color: '#C4B5FD', bg: '#F5F3FF', icon: '🎓' },
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

function KnowledgeItem({ skill }: { skill: AgentSkill }) {
  const srcCfg = SOURCE_LABELS[skill.source] || SOURCE_LABELS.usage_analytics;

  return (
    <motion.div className="paper-card" variants={staggerItem}>
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
    </motion.div>
  );
}

interface KnowledgeModalProps {
  onClose: () => void;
  skills: AgentSkill[];
}

export default function KnowledgeModal({ onClose, skills }: KnowledgeModalProps) {
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      className="modal-backdrop justify-center"
      onClick={handleBackdropClick}
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        ref={panelRef}
        className="w-[560px] max-w-[90vw] max-h-[85vh] overflow-y-auto rounded-3xl bg-white shadow-[0_8px_40px_rgba(180,140,100,0.2)]"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b border-border-warm">
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
                <p className="text-xs text-text-muted mt-0.5">現実世界のフィードバックがエージェントの行動を変える</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="modal-close">
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
              現実世界から得られたフィードバック（現場の声・利用データ・専門家の知見）をもとに、
              エージェントがデジタルツイン上の行動を変えていきます。
            </p>
          </div>

          {/* Knowledge items */}
          <div>
            <p className="section-label mb-4">適用済みフィードバック</p>
            <motion.div className="space-y-4" variants={staggerContainer} initial="hidden" animate="show">
              {skills.map((skill) => (
                <KnowledgeItem key={skill.id} skill={skill} />
              ))}
            </motion.div>
          </div>
        </div>

        <div className="h-4" />
      </motion.div>
    </motion.div>
  );
}
