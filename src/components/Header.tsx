import { PHASES } from '../data/mockData';
import type { PhaseNumber } from '../types';

interface HeaderProps {
  currentPhase: PhaseNumber;
  onPhaseChange: (phase: PhaseNumber) => void;
  maxReachedPhase: PhaseNumber;
}

const DOT_COLORS = ['#6ECFB0', '#87CEEB', '#FFD93D', '#FF8FAB', '#C4B5FD'];

export default function Header({ currentPhase, onPhaseChange, maxReachedPhase }: HeaderProps) {
  const canGoPrev = currentPhase > 1;
  const canGoNext = currentPhase < maxReachedPhase;

  return (
    <header
      className="flex-shrink-0 z-40 flex items-center justify-between px-7 py-3.5"
      style={{
        background: 'rgba(255, 248, 240, 0.95)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1.5px solid #F5E6D3',
      }}
    >
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <h1 className="text-xl font-medium tracking-wide text-text-primary select-none">デジタルツインシティ</h1>
          <div className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded-full bg-gradient-to-r from-accent-mint/60 via-accent-coral/40 to-accent-lavender/60" />
        </div>
      </div>

      {/* Phase Navigation — integrated in header */}
      <nav className="flex items-center gap-2">
        {/* Prev arrow */}
        <button
          type="button"
          onClick={() => canGoPrev && onPhaseChange((currentPhase - 1) as PhaseNumber)}
          disabled={!canGoPrev}
          className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-border-warm/30"
          style={{ color: '#8B7355' }}
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
          className="flex items-center gap-0 px-4 py-2 rounded-full"
          style={{ background: 'rgba(255, 255, 255, 0.7)' }}
        >
          {PHASES.map((phase, i) => {
            const phaseNum = phase.number;
            const isCurrent = phaseNum === currentPhase;
            const isReached = phaseNum <= maxReachedPhase;
            const dotColor = DOT_COLORS[i];

            return (
              <div key={phaseNum} className="flex items-center">
                {/* Connecting line */}
                {i > 0 && (
                  <div
                    className="w-8 h-0.5 mx-0.5 rounded-full"
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
                  className="flex flex-col items-center gap-0.5 group relative disabled:cursor-not-allowed"
                >
                  <div
                    className="relative w-3 h-3 rounded-full transition-all duration-300"
                    style={{
                      background: isCurrent ? dotColor : isReached ? `${dotColor}66` : '#E8DDD0',
                      boxShadow: isCurrent ? `0 0 0 3px ${dotColor}30, 0 2px 6px ${dotColor}40` : 'none',
                      transform: isCurrent ? 'scale(1.2)' : 'scale(1)',
                    }}
                  />

                  {/* Label */}
                  <span
                    className="absolute top-5 text-[10px] whitespace-nowrap font-medium transition-all duration-200 pointer-events-none"
                    style={{
                      color: isCurrent ? '#5D4E37' : '#C4B5A0',
                      opacity: isCurrent ? 1 : 0,
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
          className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-border-warm/30"
          style={{ color: '#8B7355' }}
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

      {/* Phase badge */}
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-2 px-4 py-1.5 rounded-full"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1.5px solid #F5E6D3',
          }}
        >
          <div
            className="w-2 h-2 rounded-full bg-accent-mint"
            style={{ boxShadow: '0 0 4px rgba(110, 207, 176, 0.4)' }}
          />
          <span className="text-xs text-text-primary font-medium">フェーズ {currentPhase}</span>
          <span className="text-[10px] text-text-muted">/5</span>
        </div>
      </div>
    </header>
  );
}
