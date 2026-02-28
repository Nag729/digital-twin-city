import { useState, useEffect, useCallback } from 'react';
import type { PhaseNumber } from '../types';

interface HintBarProps {
  currentPhase: PhaseNumber;
  hints: string[];
}

export default function HintBar({ currentPhase, hints }: HintBarProps) {
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [fadeKey, setFadeKey] = useState(0);

  // Reset hint index when phase changes
  useEffect(() => {
    setCurrentHintIndex(0);
    setVisible(true);
    setFadeKey((k) => k + 1);
  }, [currentPhase]);

  const nextHint = useCallback(() => {
    if (currentHintIndex < hints.length - 1) {
      setCurrentHintIndex((i) => i + 1);
      setFadeKey((k) => k + 1);
    } else {
      setVisible(false);
    }
  }, [currentHintIndex, hints.length]);

  const prevHint = useCallback(() => {
    if (currentHintIndex > 0) {
      setCurrentHintIndex((i) => i - 1);
      setFadeKey((k) => k + 1);
    }
  }, [currentHintIndex]);

  if (!visible || hints.length === 0) return null;

  const hint = hints[currentHintIndex];

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4">
      <div
        key={fadeKey}
        className="relative flex items-start gap-3 px-5 py-3 rounded-xl border border-neon-cyan/20 animate-fade-in"
        style={{
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 0 20px rgba(6, 182, 212, 0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* Pulse indicator */}
        <div className="flex-shrink-0 mt-1">
          <div
            className="w-2 h-2 rounded-full bg-neon-cyan animate-[pulse-glow_2s_ease-in-out_infinite]"
            style={{ boxShadow: '0 0 6px var(--color-neon-cyan)' }}
          />
        </div>

        {/* Hint text */}
        <p className="flex-1 text-sm text-text-primary/90 leading-relaxed">
          {hint}
        </p>

        {/* Navigation controls */}
        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
          {hints.length > 1 && (
            <>
              <button
                onClick={prevHint}
                disabled={currentHintIndex === 0}
                className="p-1 text-text-secondary hover:text-neon-cyan transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <span className="text-[10px] text-text-secondary tabular-nums min-w-[24px] text-center">
                {currentHintIndex + 1}/{hints.length}
              </span>

              <button
                onClick={nextHint}
                className="p-1 text-text-secondary hover:text-neon-cyan transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {currentHintIndex < hints.length - 1 ? (
                    <polyline points="9 18 15 12 9 6" />
                  ) : (
                    <>
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </>
                  )}
                </svg>
              </button>
            </>
          )}

          {hints.length <= 1 && (
            <button
              onClick={() => setVisible(false)}
              className="p-1 text-text-secondary hover:text-neon-cyan transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Decorative dotted arrow pointing down */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5">
          <div className="w-px h-1.5 bg-neon-cyan/40" />
          <div className="w-px h-1 bg-neon-cyan/25" />
          <div className="w-px h-0.5 bg-neon-cyan/15" />
        </div>
      </div>
    </div>
  );
}
