import { PHASES } from '../data/mockData';
import type { PhaseNumber } from '../types';

interface PhaseNavProps {
  currentPhase: PhaseNumber;
  onPhaseChange: (phase: PhaseNumber) => void;
  maxReachedPhase: PhaseNumber;
}

export default function PhaseNav({ currentPhase, onPhaseChange, maxReachedPhase }: PhaseNavProps) {
  const canGoPrev = currentPhase > 1;
  const canGoNext = currentPhase < maxReachedPhase;

  const DOT_COLORS = ['#6ECFB0', '#87CEEB', '#FFD93D', '#FF8FAB', '#C4B5FD'];

  return (
    <nav className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
      {/* Prev arrow */}
      <button
        type="button"
        onClick={() => canGoPrev && onPhaseChange((currentPhase - 1) as PhaseNumber)}
        disabled={!canGoPrev}
        className="flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200"
        style={{
          background: 'rgba(255, 255, 255, 0.9)',
          border: '1.5px solid #F5E6D3',
          boxShadow: '0 2px 8px rgba(180, 140, 100, 0.1)',
          color: '#8B7355',
        }}
      >
        <svg
          width="14"
          height="14"
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

      {/* Phase dots and labels */}
      <div
        className="flex items-center gap-0 px-5 py-2.5 rounded-full"
        style={{
          background: 'rgba(255, 255, 255, 0.9)',
          border: '1.5px solid #F5E6D3',
          boxShadow: '0 2px 12px rgba(180, 140, 100, 0.08)',
        }}
      >
        {PHASES.map((phase, i) => {
          const phaseNum = phase.number;
          const isCurrent = phaseNum === currentPhase;
          const isReached = phaseNum <= maxReachedPhase;
          const dotColor = DOT_COLORS[i] || DOT_COLORS[0];

          return (
            <div key={phaseNum} className="flex items-center">
              {/* Connecting line */}
              {i > 0 && (
                <div
                  className="w-10 h-0.5 mx-0.5 rounded-full"
                  style={{
                    background:
                      phaseNum <= currentPhase
                        ? `linear-gradient(90deg, ${DOT_COLORS[i - 1]}88, ${dotColor}88)`
                        : '#F5E6D3',
                  }}
                />
              )}

              {/* Dot + label */}
              <button
                type="button"
                onClick={() => isReached && onPhaseChange(phaseNum)}
                disabled={!isReached}
                className="flex flex-col items-center gap-1 group relative"
              >
                <div
                  className="relative w-3.5 h-3.5 rounded-full transition-all duration-300"
                  style={{
                    background: isCurrent ? dotColor : isReached ? `${dotColor}66` : '#E8DDD0',
                    boxShadow: isCurrent ? `0 0 0 3px ${dotColor}30, 0 2px 6px ${dotColor}40` : 'none',
                    transform: isCurrent ? 'scale(1.15)' : 'scale(1)',
                  }}
                />

                {/* Label — hover/current only */}
                <span
                  className="absolute top-6 text-xs whitespace-nowrap font-medium transition-all duration-200 pointer-events-none opacity-0 group-hover:opacity-100"
                  style={{
                    color: isCurrent ? '#5D4E37' : isReached ? '#8B7355' : '#C4B5A0',
                    opacity: isCurrent ? 1 : undefined,
                  }}
                >
                  {phase.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Next arrow */}
      <button
        type="button"
        onClick={() => canGoNext && onPhaseChange((currentPhase + 1) as PhaseNumber)}
        disabled={!canGoNext}
        className="flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200"
        style={{
          background: 'rgba(255, 255, 255, 0.9)',
          border: '1.5px solid #F5E6D3',
          boxShadow: '0 2px 8px rgba(180, 140, 100, 0.1)',
          color: '#8B7355',
        }}
      >
        <svg
          width="14"
          height="14"
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
    </nav>
  );
}
