import { motion } from 'motion/react';
import type { AgentSkill } from '../types';
import { useModalDismiss } from '../utils/hooks';
import { backdropMotionProps, fadeUpVariants, modalSlideUpProps, staggerContainer } from '../utils/motionVariants';

const SOURCE_LABELS: Record<AgentSkill['source'], { label: string; color: string; bg: string; icon: string }> = {
  user_feedback: { label: '現場フィードバック', color: '#FF8FAB', bg: '#FFF0F5', icon: '🗣️' },
  usage_analytics: { label: '利用データ分析', color: '#87CEEB', bg: '#F0F8FF', icon: '📊' },
  domain_expert: { label: '専門家知見', color: '#C4B5FD', bg: '#F5F3FF', icon: '🎓' },
};

const staggerItem = fadeUpVariants();

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
  const { panelRef, handleBackdropClick } = useModalDismiss(onClose);

  return (
    <motion.div
      className="modal-backdrop justify-center"
      onClick={handleBackdropClick}
      role="presentation"
      {...backdropMotionProps}
    >
      <motion.div
        ref={panelRef}
        className="w-[560px] max-w-[90vw] max-h-[85vh] flex flex-col rounded-3xl bg-white shadow-[0_8px_40px_rgba(180,140,100,0.2)]"
        {...modalSlideUpProps}
      >
        {/* Header — sticky */}
        <div className="sticky top-0 z-10 px-7 pt-7 pb-5 border-b border-border-warm bg-white rounded-t-3xl flex-shrink-0">
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

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">
          <div className="px-7 py-6 space-y-6">
            {/* Explanation */}
            <div className="rounded-2xl p-5" style={{ border: '1.5px solid #BAE6FD', backgroundColor: '#F0F9FF' }}>
              <p className="text-sm leading-relaxed" style={{ color: '#0369A1' }}>
                現実世界から得られた多様なデータソースをもとに、 エージェントがデジタルツイン上の行動を変えていきます。
              </p>
            </div>

            {/* Knowledge source types */}
            <div>
              <p className="section-label mb-3">取り込み可能なデータソース</p>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: '🎥', label: 'ユーザーインタビュー', desc: '映像から行動パターンを学習' },
                  { icon: '🎫', label: 'サポートチケット', desc: '困りごとをリアルタイム反映' },
                  { icon: '📈', label: 'アクセスログ', desc: '操作パターンからUX課題を特定' },
                  { icon: '🎓', label: '専門家の知見', desc: '業界知識をエージェントに注入' },
                  { icon: '🧪', label: 'A/Bテスト結果', desc: '実験データで改善の方向性を提供' },
                  { icon: '💬', label: 'SNS・レビュー', desc: 'ユーザーの生の声を収集' },
                ].map((src) => (
                  <div
                    key={src.label}
                    className="flex items-start gap-2.5 rounded-xl p-3"
                    style={{ background: '#FAFAF8', border: '1px solid #F0EBE4' }}
                  >
                    <span className="text-base shrink-0 mt-0.5">{src.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-text-primary">{src.label}</p>
                      <p className="text-[11px] text-text-muted leading-snug mt-0.5">{src.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
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
        </div>
      </motion.div>
    </motion.div>
  );
}
