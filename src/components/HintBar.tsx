import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import type { PhaseNumber } from '../types';

interface HintBarProps {
  currentPhase: PhaseNumber;
  hints: string[];
}

export default function HintBar({ currentPhase, hints }: HintBarProps) {
  const [currentHintIndex, setCurrentHintIndex] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset hints when phase changes
  useEffect(() => {
    setCurrentHintIndex(0);
  }, [currentPhase]);

  const nextHint = useCallback(() => {
    if (currentHintIndex < hints.length - 1) {
      setCurrentHintIndex((i) => i + 1);
    }
  }, [currentHintIndex, hints.length]);

  const prevHint = useCallback(() => {
    if (currentHintIndex > 0) {
      setCurrentHintIndex((i) => i - 1);
    }
  }, [currentHintIndex]);

  if (hints.length === 0) return null;

  const hint = hints[currentHintIndex];

  return (
    <div className="absolute top-2 left-2 right-2 md:top-4 md:left-4 md:right-4 z-30 pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentPhase}-${currentHintIndex}`}
          className="glass-panel relative flex items-start gap-2 md:gap-3 px-3 md:px-5 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl pointer-events-auto"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {/* Pulse indicator */}
          <div className="flex-shrink-0 mt-1.5">
            <div
              className="w-2 h-2 rounded-full bg-accent-coral animate-pulse"
              style={{ boxShadow: '0 0 4px rgba(255, 143, 171, 0.4)' }}
            />
          </div>

          {/* Hint text */}
          <p className="flex-1 text-xs md:text-sm text-text-primary/90 leading-relaxed">{hint}</p>

          {/* Navigation controls */}
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
            {hints.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevHint}
                  disabled={currentHintIndex === 0}
                  className="p-1 text-text-muted hover:text-accent-coral transition-colors"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>

                <span className="text-[10px] text-text-muted tabular-nums min-w-[24px] text-center font-medium">
                  {currentHintIndex + 1}/{hints.length}
                </span>

                <button
                  type="button"
                  onClick={nextHint}
                  disabled={currentHintIndex === hints.length - 1}
                  className="p-1 text-text-muted hover:text-accent-coral transition-colors"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
