import type { PhaseNumber } from '../types';

interface HeaderProps {
  currentPhase: PhaseNumber;
}

export default function Header({ currentPhase }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 pointer-events-none">
      <div className="flex items-center gap-3 pointer-events-auto">
        <div className="relative">
          <h1 className="text-xl font-medium tracking-wide text-text-primary select-none">
            Digital Twin City
          </h1>
          <div className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded-full bg-gradient-to-r from-accent-mint/60 via-accent-coral/40 to-accent-lavender/60" />
        </div>
      </div>

      <div className="flex items-center gap-2 pointer-events-auto">
        <div
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full backdrop-blur-sm"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1.5px solid #F5E6D3',
            boxShadow: '0 2px 8px rgba(180, 140, 100, 0.08)',
          }}
        >
          <div
            className="w-2 h-2 rounded-full bg-accent-mint"
            style={{ boxShadow: '0 0 4px rgba(110, 207, 176, 0.4)' }}
          />
          <span className="text-xs text-text-secondary font-medium tracking-wide">
            Phase {currentPhase} / 5
          </span>
        </div>
      </div>
    </header>
  );
}
