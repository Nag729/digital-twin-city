import { motion } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';
import type { PhaseNumber, Vision } from '../types';
import { backdropMotionProps, modalSlideUpProps } from '../utils/motionVariants';

interface VisionModalProps {
  onClose: () => void;
  vision: Vision;
  currentPhase: PhaseNumber;
}

export default function VisionModal({ onClose, vision, currentPhase }: VisionModalProps) {
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
      {...backdropMotionProps}
    >
      <motion.div
        ref={panelRef}
        className="w-[560px] max-w-[90vw] max-h-[85vh] overflow-y-auto rounded-3xl bg-white shadow-[0_8px_40px_rgba(180,140,100,0.2)]"
        {...modalSlideUpProps}
      >
        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b border-border-warm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl"
                style={{ background: '#FAF5FF', boxShadow: '0 2px 8px rgba(196, 181, 253, 0.2)' }}
              >
                🧭
              </div>
              <div>
                <h2 className="text-lg font-medium text-text-primary">ヒューマンビジョン</h2>
                <p className="text-xs text-text-muted mt-0.5">プロダクトの進化に方向性を与える人間の意思</p>
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
          {/* Vision Statement */}
          <div className="rounded-2xl p-5" style={{ border: '1.5px solid #E9D5FF', backgroundColor: '#FAF5FF' }}>
            <p className="section-label mb-3" style={{ color: '#C4B5FD' }}>
              ビジョンステートメント
            </p>
            <p className="text-lg font-medium leading-relaxed" style={{ color: '#7C3AED' }}>
              &ldquo;{vision.statement}&rdquo;
            </p>
          </div>

          {/* Priorities — Phase 5 only */}
          {currentPhase >= 5 && (
            <div>
              <div className="flex items-center gap-2 mb-3.5">
                <p className="section-label">優先事項</p>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse"
                  style={{ color: '#7C3AED', background: '#EDE9FE' }}
                >
                  New
                </span>
              </div>
              <div className="space-y-3.5">
                {vision.priorities.map((p, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl p-4" style={{ background: '#FAF5FF' }}>
                    <span
                      className="font-medium text-xs rounded-full w-6 h-6 flex items-center justify-center shrink-0"
                      style={{ color: '#C4B5FD', background: '#F0EAFF' }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm text-text-primary leading-relaxed">{p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-4" />
      </motion.div>
    </motion.div>
  );
}
