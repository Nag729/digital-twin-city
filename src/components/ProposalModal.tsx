import { motion } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';
import { MOCK_FEEDBACKS } from '../data/mockData';
import type { ImprovementProposal } from '../types';
import { backdropMotionProps, fadeUpVariants, modalSlideUpProps, staggerContainer } from '../utils/motionVariants';

const IMPACT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: '高', color: '#FF6B6B', bg: '#FFF0F0' },
  medium: { label: '中', color: '#FFB347', bg: '#FFF8EE' },
  low: { label: '低', color: '#87CEEB', bg: '#F0F8FF' },
};

const staggerItem = fadeUpVariants();

function ProposalCard({
  proposal,
  decision,
  onDecide,
}: {
  proposal: ImprovementProposal;
  decision?: 'go' | 'nogo';
  onDecide: (proposalId: string, decision: 'go' | 'nogo') => void;
}) {
  const feedback = MOCK_FEEDBACKS.find((f) => f.id === proposal.feedbackId);
  const impact = IMPACT_CONFIG[proposal.impact];

  return (
    <motion.div className="paper-card" variants={staggerItem}>
      {/* Title row */}
      <div className="flex items-start gap-2.5 mb-3">
        <span
          className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 mt-0.5"
          style={{ color: impact.color, backgroundColor: impact.bg }}
        >
          影響度: {impact.label}
        </span>
        <h3 className="text-sm font-medium text-text-primary leading-snug">{proposal.title}</h3>
      </div>

      {/* Description */}
      <p className="text-sm text-text-secondary leading-relaxed mb-3">{proposal.description}</p>

      {/* Source feedback */}
      {feedback && (
        <div
          className="flex items-start gap-2 rounded-xl px-3 py-2.5 mb-4"
          style={{ background: '#FFF8F0', border: '1px solid #F5E6D3' }}
        >
          <span className="text-xs shrink-0 mt-0.5">💬</span>
          <div className="min-w-0">
            <span className="text-[10px] text-text-muted">{feedback.agentName}のフィードバック</span>
            <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{feedback.description}</p>
          </div>
        </div>
      )}

      {/* Decision buttons / Result */}
      {!decision ? (
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => onDecide(proposal.id, 'go')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{ color: '#059669', background: '#ECFDF5', border: '1.5px solid #A7F3D0' }}
          >
            <span>✓</span> Go
          </button>
          <button
            type="button"
            onClick={() => onDecide(proposal.id, 'nogo')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{ color: '#DC2626', background: '#FEF2F2', border: '1.5px solid #FECACA' }}
          >
            <span>✗</span> No-Go
          </button>
        </div>
      ) : (
        <motion.div
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium"
          style={
            decision === 'go'
              ? { color: '#059669', background: '#ECFDF5', border: '1.5px solid #A7F3D0' }
              : { color: '#DC2626', background: '#FEF2F2', border: '1.5px solid #FECACA' }
          }
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {decision === 'go' ? '✓ Go — 改善を適用' : '✗ No-Go — 見送り'}
        </motion.div>
      )}
    </motion.div>
  );
}

interface ProposalModalProps {
  onClose: () => void;
  proposals: ImprovementProposal[];
  decisions: Record<string, 'go' | 'nogo'>;
  onDecide: (proposalId: string, decision: 'go' | 'nogo') => void;
}

export default function ProposalModal({ onClose, proposals, decisions, onDecide }: ProposalModalProps) {
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

  const goCount = proposals.filter((p) => decisions[p.id] === 'go').length;
  const nogoCount = proposals.filter((p) => decisions[p.id] === 'nogo').length;
  const pendingCount = proposals.length - goCount - nogoCount;

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
                style={{ background: '#FFF8EE', boxShadow: '0 2px 8px rgba(255, 179, 71, 0.2)' }}
              >
                🗳️
              </div>
              <div>
                <h2 className="text-lg font-medium text-text-primary">改善提案レビュー</h2>
                <p className="text-xs text-text-muted mt-0.5">AIが提案し、人間がGo/NoGoを決める</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="modal-close">
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Summary badges */}
          <div className="flex gap-2 mt-4">
            <span
              className="text-[11px] font-medium px-3 py-1.5 rounded-full"
              style={{ color: '#059669', background: '#ECFDF5' }}
            >
              Go: {goCount}
            </span>
            <span
              className="text-[11px] font-medium px-3 py-1.5 rounded-full"
              style={{ color: '#DC2626', background: '#FEF2F2' }}
            >
              No-Go: {nogoCount}
            </span>
            <span
              className="text-[11px] font-medium px-3 py-1.5 rounded-full"
              style={{ color: '#9CA3AF', background: '#F9FAFB' }}
            >
              未決: {pendingCount}
            </span>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">
          <div className="px-7 py-6 space-y-6">
            {/* Explanation */}
            <div className="rounded-2xl p-5" style={{ border: '1.5px solid #FDE68A', backgroundColor: '#FFFBEB' }}>
              <p className="text-sm leading-relaxed" style={{ color: '#92400E' }}>
                AIエージェントが発見した問題に対して、改善提案を自動生成しました。
                各提案を確認し、適用するかどうかを判断してください。
              </p>
            </div>

            {/* Proposal cards */}
            <motion.div className="space-y-4" variants={staggerContainer} initial="hidden" animate="show">
              {proposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  decision={decisions[proposal.id]}
                  onDecide={onDecide}
                />
              ))}
            </motion.div>
          </div>
          <div className="h-4" />
        </div>
      </motion.div>
    </motion.div>
  );
}
