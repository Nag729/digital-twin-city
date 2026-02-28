import { useCallback, useEffect, useRef } from 'react';
import type { PhaseNumber, Vision } from '../types';

interface VisionModalProps {
  open: boolean;
  onClose: () => void;
  vision: Vision;
  currentPhase: PhaseNumber;
}

export default function VisionModal({ open, onClose, vision, currentPhase }: VisionModalProps) {
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

  const isPhase5 = currentPhase >= 5;

  // Loop steps
  const steps = [
    {
      label: 'AI探索',
      desc: 'エージェントがプロダクトを自律的に利用・テスト',
      icon: '🔍',
      color: '#87CEEB',
      active: currentPhase >= 2,
    },
    {
      label: 'フィードバック発見',
      desc: 'バグ・UX問題・パフォーマンス課題を検出',
      icon: '💡',
      color: '#FFB347',
      active: currentPhase >= 3,
    },
    {
      label: '外部ナレッジ注入',
      desc: 'AIだけでは知り得ない現実世界の知識を補完',
      icon: '📡',
      color: '#87CEEB',
      active: currentPhase >= 3,
    },
    {
      label: 'プロダクト改善',
      desc: 'フィードバックに基づく自律的な品質向上',
      icon: '🔧',
      color: '#6ECFB0',
      active: currentPhase >= 4,
    },
    {
      label: '人間のビジョン',
      desc: 'プロダクトの目的と方向性を人間が定義',
      icon: '🧭',
      color: '#C4B5FD',
      active: isPhase5,
    },
  ];

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
                style={{ background: '#FAF5FF', boxShadow: '0 2px 8px rgba(196, 181, 253, 0.2)' }}
              >
                🧭
              </div>
              <div>
                <h2 className="text-lg font-medium text-text-primary">ヒューマンビジョン</h2>
                <p className="text-xs text-text-muted mt-0.5">プロダクトの進化に方向性を与える人間の意思</p>
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
          {/* Vision Statement */}
          <div className="rounded-2xl p-5" style={{ border: '1.5px solid #E9D5FF', backgroundColor: '#FAF5FF' }}>
            <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#C4B5FD' }}>
              ビジョンステートメント
            </p>
            <p className="text-lg font-medium leading-relaxed" style={{ color: '#7C3AED' }}>
              &ldquo;{vision.statement}&rdquo;
            </p>
          </div>

          {/* Priorities */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-secondary mb-3.5">優先事項</p>
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

          {/* Semi-Closed Loop */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-secondary mb-3.5">
              セミクローズドループ
            </p>
            <div className="space-y-0">
              {steps.map((step, i) => (
                <div key={i} className="flex items-stretch gap-0">
                  {/* Timeline */}
                  <div className="flex flex-col items-center w-8 shrink-0">
                    <div
                      className="w-3 h-3 rounded-full shrink-0 mt-3.5 transition-all duration-500"
                      style={{
                        background: step.active ? step.color : '#E8DDD0',
                        boxShadow: step.active ? `0 0 0 3px ${step.color}25` : 'none',
                      }}
                    />
                    {i < steps.length - 1 && (
                      <div
                        className="w-0.5 flex-1 my-1 rounded-full transition-all duration-500"
                        style={{
                          background: steps[i + 1].active
                            ? `linear-gradient(180deg, ${step.color}60, ${steps[i + 1].color}60)`
                            : '#E8DDD0',
                        }}
                      />
                    )}
                    {i === steps.length - 1 && (
                      <div className="w-0.5 flex-1 my-1 rounded-full" style={{ background: `${step.color}30` }} />
                    )}
                  </div>

                  {/* Content */}
                  <div
                    className="flex-1 rounded-xl px-4 py-3.5 mb-2 transition-all duration-500"
                    style={{
                      background: step.active ? `${step.color}08` : 'transparent',
                      opacity: step.active ? 1 : 0.5,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{step.icon}</span>
                      <span className="text-sm font-medium text-text-primary">{step.label}</span>
                      {!step.active && (
                        <span className="text-[10px] text-text-muted px-2 py-0.5 rounded-full bg-border-warm/30">
                          未到達
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed ml-[22px]">{step.desc}</p>
                  </div>
                </div>
              ))}

              {/* Loop-back arrow */}
              {isPhase5 && (
                <div className="flex items-center gap-2 ml-2 mt-1">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M16 14 C16 6, 4 6, 4 10"
                      stroke="#C4B5FD"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <path
                      d="M6 8 L4 10 L6 12"
                      stroke="#C4B5FD"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                  <span className="text-xs font-medium" style={{ color: '#7C3AED' }}>
                    ループ継続 — ビジョンに沿って再探索
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Key insight */}
          <div
            className="rounded-2xl p-5 text-center"
            style={{ background: 'linear-gradient(135deg, #FAF5FF, #F0F8FF)', border: '1px solid #E9D5FF' }}
          >
            <p className="text-sm leading-relaxed" style={{ color: '#5D4E37' }}>
              AIは<strong style={{ color: '#6ECFB0' }}>「適応」</strong>が得意。 でも
              <strong style={{ color: '#C4B5FD' }}>「目的」</strong>は定義できない。
            </p>
            <p className="text-xs text-text-muted mt-1">これがセミクローズドループ — 人間とAIの理想的な役割分担</p>
          </div>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
