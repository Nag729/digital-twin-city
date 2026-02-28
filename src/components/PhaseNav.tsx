import type { PhaseNumber } from '../types';
import { PHASES } from '../data/mockData';

interface PhaseNavProps {
  currentPhase: PhaseNumber;
  onPhaseChange: (phase: PhaseNumber) => void;
  maxReachedPhase: PhaseNumber;
}

export default function PhaseNav({ currentPhase, onPhaseChange, maxReachedPhase }: PhaseNavProps) {
  const canGoPrev = currentPhase > 1;
  const canGoNext = currentPhase < maxReachedPhase;

  return (
    <nav className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
      {/* Prev arrow */}
      <button
        onClick={() => canGoPrev && onPhaseChange((currentPhase - 1) as PhaseNumber)}
        disabled={!canGoPrev}
        className="flex items-center justify-center w-8 h-8 rounded-full border border-border-glow/50 bg-bg-card/70 backdrop-blur-sm text-text-secondary transition-all duration-200 hover:border-neon-cyan/60 hover:text-neon-cyan disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-border-glow/50 disabled:hover:text-text-secondary"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Phase dots and labels */}
      <div className="flex items-center gap-0 px-4 py-2 rounded-full border border-border-glow/40 bg-bg-card/70 backdrop-blur-sm">
        {PHASES.map((phase, i) => {
          const phaseNum = phase.number;
          const isCurrent = phaseNum === currentPhase;
          const isReached = phaseNum <= maxReachedPhase;
          const isClickable = isReached;

          return (
            <div key={phaseNum} className="flex items-center">
              {/* Connecting line */}
              {i > 0 && (
                <div className="w-6 h-px mx-0.5 relative">
                  <div className="absolute inset-0 bg-border-glow/40" />
                  {phaseNum <= maxReachedPhase && (
                    <div
                      className="absolute inset-0 transition-all duration-700"
                      style={{
                        background: phaseNum <= currentPhase
                          ? 'linear-gradient(90deg, var(--color-neon-cyan), var(--color-neon-blue))'
                          : 'var(--color-border-glow)',
                        opacity: phaseNum <= currentPhase ? 0.8 : 0.3,
                        boxShadow: phaseNum <= currentPhase ? '0 0 6px var(--color-neon-cyan)' : 'none',
                      }}
                    />
                  )}
                </div>
              )}

              {/* Dot + label */}
              <button
                onClick={() => isClickable && onPhaseChange(phaseNum)}
                disabled={!isClickable}
                className="flex flex-col items-center gap-1 group relative disabled:cursor-not-allowed"
              >
                {/* Dot */}
                <div
                  className="relative w-3 h-3 rounded-full transition-all duration-300"
                  style={{
                    background: isCurrent
                      ? 'var(--color-neon-cyan)'
                      : isReached
                        ? 'var(--color-neon-blue)'
                        : 'var(--color-border-glow)',
                    boxShadow: isCurrent
                      ? '0 0 8px var(--color-neon-cyan), 0 0 16px rgba(6,182,212,0.4), inset 0 0 4px rgba(255,255,255,0.3)'
                      : isReached
                        ? '0 0 4px rgba(59,130,246,0.3)'
                        : 'none',
                  }}
                >
                  {isCurrent && (
                    <div className="absolute -inset-1 rounded-full border border-neon-cyan/30 animate-[pulse-glow_2s_ease-in-out_infinite]" />
                  )}
                </div>

                {/* Label */}
                <span
                  className="absolute top-5 text-[10px] whitespace-nowrap transition-colors duration-200"
                  style={{
                    color: isCurrent
                      ? 'var(--color-neon-cyan)'
                      : isReached
                        ? 'var(--color-text-secondary)'
                        : 'var(--color-border-glow)',
                    textShadow: isCurrent ? '0 0 8px var(--color-neon-cyan)' : 'none',
                  }}
                >
                  {phase.name}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Next arrow */}
      <button
        onClick={() => canGoNext && onPhaseChange((currentPhase + 1) as PhaseNumber)}
        disabled={!canGoNext}
        className="flex items-center justify-center w-8 h-8 rounded-full border border-border-glow/50 bg-bg-card/70 backdrop-blur-sm text-text-secondary transition-all duration-200 hover:border-neon-cyan/60 hover:text-neon-cyan disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-border-glow/50 disabled:hover:text-text-secondary"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </nav>
  );
}
