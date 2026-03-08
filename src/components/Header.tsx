import { PHASES } from '../data/mockData';
import type { PhaseNumber } from '../types';

interface HeaderProps {
  currentPhase: PhaseNumber;
  onPhaseChange: (phase: PhaseNumber) => void;
  maxReachedPhase: PhaseNumber;
}

const DOT_COLORS = ['#6ECFB0', '#87CEEB', '#FFD93D', '#FF8FAB', '#C4B5FD'];

const TITLE_CHARS = [...'デジタルツインシティ'];
const TITLE_COLORS = [
  '#6ECFB0',
  '#87CEEB',
  '#FFB347',
  '#FF8FAB',
  '#C4B5FD',
  '#6ECFB0',
  '#87CEEB',
  '#FFB347',
  '#C4B5FD',
];

export default function Header({ currentPhase, onPhaseChange, maxReachedPhase }: HeaderProps) {
  const canGoPrev = currentPhase > 1;
  const canGoNext = currentPhase < maxReachedPhase;

  return (
    <header
      className="flex-shrink-0 z-40 flex items-center justify-between px-3 md:px-7 py-2.5 md:py-3.5"
      style={{
        background: 'rgba(255, 248, 240, 0.95)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1.5px solid #F5E6D3',
      }}
    >
      {/* Title */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <h1
          className="text-[15px] md:text-[22px] -tracking-[0.02em] select-none"
          style={{ fontFamily: "'Zen Maru Gothic', sans-serif" }}
        >
          {TITLE_CHARS.map((char, i) => (
            <span
              key={i}
              className="inline-block"
              style={{
                color: TITLE_COLORS[i % TITLE_COLORS.length],
                textShadow: '0 1px 2px rgba(0,0,0,0.06)',
              }}
            >
              {char}
            </span>
          ))}
        </h1>
      </div>

      {/* Phase Navigation — integrated in header */}
      <nav className="flex items-center gap-1 md:gap-2">
        {/* Prev arrow */}
        <button
          type="button"
          onClick={() => canGoPrev && onPhaseChange((currentPhase - 1) as PhaseNumber)}
          disabled={!canGoPrev}
          className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full transition-all duration-200 hover:bg-border-warm/30"
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
          className="flex items-center gap-0 px-2.5 md:px-4 py-1.5 md:py-2 rounded-full"
          style={{ background: 'rgba(255, 255, 255, 0.7)' }}
        >
          {PHASES.map((phase, i) => {
            const phaseNum = phase.number;
            const isCurrent = phaseNum === currentPhase;
            const isReached = phaseNum <= maxReachedPhase;
            const dotColor = DOT_COLORS[i];

            return (
              <div key={phaseNum} className="flex items-center">
                {/* Connecting line — hidden on mobile */}
                {i > 0 && (
                  <div
                    className="hidden md:block w-8 h-0.5 mx-0.5 rounded-full"
                    style={{
                      background:
                        phaseNum <= currentPhase
                          ? `linear-gradient(90deg, ${DOT_COLORS[i - 1]}88, ${dotColor}88)`
                          : '#F5E6D3',
                    }}
                  />
                )}
                {/* Mobile spacer */}
                {i > 0 && <div className="w-3 md:hidden" />}

                {/* Dot + label */}
                <button
                  type="button"
                  onClick={() => isReached && onPhaseChange(phaseNum)}
                  disabled={!isReached}
                  className="flex flex-col items-center gap-0.5 group relative"
                >
                  <div
                    className="relative w-2.5 h-2.5 md:w-3 md:h-3 rounded-full transition-all duration-300"
                    style={{
                      background: isCurrent ? dotColor : isReached ? `${dotColor}66` : '#E8DDD0',
                      boxShadow: isCurrent ? `0 0 0 3px ${dotColor}30, 0 2px 6px ${dotColor}40` : 'none',
                      transform: isCurrent ? 'scale(1.2)' : 'scale(1)',
                    }}
                  />

                  {/* Label — hidden on mobile */}
                  <span
                    className="absolute top-5 text-[10px] whitespace-nowrap font-medium transition-all duration-200 pointer-events-none hidden md:block"
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
          className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full transition-all duration-200 hover:bg-border-warm/30"
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
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1 md:py-1.5 rounded-full"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1.5px solid #F5E6D3',
          }}
        >
          <div
            className="w-2 h-2 rounded-full bg-accent-mint"
            style={{ boxShadow: '0 0 4px rgba(110, 207, 176, 0.4)' }}
          />
          <span className="text-[10px] md:text-xs text-text-primary font-medium">P{currentPhase}</span>
          <span className="text-[10px] text-text-muted hidden md:inline">/5</span>
        </div>
      </div>
    </header>
  );
}
