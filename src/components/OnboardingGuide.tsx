import { CircleDot, MessageCircle, MousePointerClick, ZoomIn } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

interface OnboardingGuideProps {
  onClose: () => void;
}

const STEPS = [
  {
    target: '[data-onboarding="phase-nav"]',
    icon: CircleDot,
    title: 'フェーズを切り替え',
    desc: 'ドットや矢印をクリックして、5つのフェーズを進めましょう',
    color: '#6ECFB0',
  },
  {
    target: '[data-onboarding="hint-bar"]',
    icon: MessageCircle,
    title: 'ヒントテキスト',
    desc: 'フェーズごとの解説やアドバイスが表示されます。矢印で切り替えられます',
    color: '#FF8FAB',
  },
  {
    target: '[data-onboarding="canvas"]',
    icon: MousePointerClick,
    title: 'キャラクターをクリック',
    desc: 'エージェントやトラックをクリックすると詳細を確認できます',
    color: '#87CEEB',
  },
  {
    target: '[data-onboarding="canvas"]',
    icon: ZoomIn,
    title: 'ズーム & スクロール',
    desc: 'ホイールやピンチで拡大縮小、ドラッグで移動できます',
    color: '#FFD93D',
  },
];

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function OnboardingGuide({ onClose }: OnboardingGuideProps) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<TargetRect | null>(null);

  const current = STEPS[step];

  const measure = useCallback(() => {
    const el = document.querySelector(current.target);
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [current.target]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' || e.key === 'ArrowRight') {
        if (step < STEPS.length - 1) setStep((s) => s + 1);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, onClose]);

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else onClose();
  };

  if (!rect) return null;

  const isLargeTarget = rect.height > 300;
  const padding = isLargeTarget ? -8 : 6;
  const highlightRect = {
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };

  // Tooltip position: inside the canvas area for large targets, below for small
  const tooltipWidth = 320;
  const tooltipStyle: React.CSSProperties = { maxWidth: 'calc(100vw - 24px)' };

  if (isLargeTarget) {
    // Center tooltip inside the highlighted area
    tooltipStyle.top = highlightRect.top + highlightRect.height * 0.35;
    tooltipStyle.left = Math.max(12, highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2);
  } else {
    tooltipStyle.top = highlightRect.top + highlightRect.height + 12;
    tooltipStyle.left = Math.max(12, highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2);
  }

  const Icon = current.icon;

  const arrowLeft = isLargeTarget ? tooltipWidth / 2 : Math.min(highlightRect.width / 2, tooltipWidth / 2);

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Semi-transparent overlay with cutout */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: keyboard handled globally */}
      <svg className="absolute inset-0 w-full h-full" role="presentation" onClick={handleNext} onKeyDown={() => {}}>
        <defs>
          <mask id="onboarding-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={highlightRect.left}
              y={highlightRect.top}
              width={highlightRect.width}
              height={highlightRect.height}
              rx="12"
              fill="black"
            />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(93, 78, 55, 0.45)" mask="url(#onboarding-mask)" />
      </svg>

      {/* Highlight border */}
      <div
        className="absolute rounded-xl pointer-events-none"
        style={{
          top: highlightRect.top,
          left: highlightRect.left,
          width: highlightRect.width,
          height: highlightRect.height,
          border: `2px solid ${current.color}`,
          boxShadow: `0 0 0 4px ${current.color}25, 0 0 20px ${current.color}30`,
        }}
      />

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="absolute"
          style={{ ...tooltipStyle, width: tooltipWidth }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {/* Arrow */}
          <div className="absolute w-3 h-3 rotate-45" style={{ background: '#FFFFFF', top: -6, left: arrowLeft }} />

          {/* Card */}
          <div
            className="relative rounded-2xl bg-white overflow-hidden"
            style={{ boxShadow: '0 8px 32px rgba(180, 140, 100, 0.2)' }}
          >
            <div className="flex items-start gap-3 px-4 pt-4 pb-3">
              <div
                className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mt-0.5"
                style={{ background: `${current.color}18` }}
              >
                <Icon size={18} color={current.color} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold block" style={{ color: '#5D4E37' }}>
                  {current.title}
                </span>
                <span className="text-[11px] block mt-1 leading-relaxed" style={{ color: '#8B7355' }}>
                  {current.desc}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 pb-3">
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full transition-all duration-200"
                    style={{
                      background: i === step ? current.color : '#E8DDD0',
                      transform: i === step ? 'scale(1.3)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="text-[11px] font-medium px-3.5 py-1.5 rounded-lg transition-all duration-200 active:scale-[0.96]"
                style={{
                  background: `${current.color}18`,
                  color: current.color === '#FFD93D' ? '#B45309' : current.color,
                }}
              >
                {step < STEPS.length - 1 ? '次へ' : 'OK'}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
