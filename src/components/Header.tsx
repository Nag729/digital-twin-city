import type { PhaseNumber } from '../types';

interface HeaderProps {
  currentPhase: PhaseNumber;
}

export default function Header({ currentPhase }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 pointer-events-none">
      <div className="flex items-center gap-3 pointer-events-auto">
        <div className="relative">
          <h1 className="text-xl font-bold tracking-widest text-neon-cyan select-none"
              style={{
                textShadow: '0 0 8px var(--color-neon-cyan), 0 0 20px rgba(6,182,212,0.3)',
              }}>
            Digital Twin City
          </h1>
          <div className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-50" />
        </div>
      </div>

      <div className="flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-border-glow/40 bg-bg-card/60 backdrop-blur-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-[pulse-glow_2s_ease-in-out_infinite]" />
          <span className="text-xs text-text-secondary tracking-wide">
            Phase {currentPhase} / 5
          </span>
        </div>
      </div>
    </header>
  );
}
