import { useCallback, useEffect, useState } from 'react';

interface IntroOverlayProps {
  onClose: () => void;
}

const STEPS_DATA = [
  { icon: '🏙️', label: 'デジタルツインを構築', desc: 'プロダクトの現実を模した仮想世界を作る', color: '#6ECFB0' },
  {
    icon: '🤖',
    label: 'AIエージェントを投入',
    desc: '人間のように振る舞うエージェントが自律的に探索',
    color: '#87CEEB',
  },
  { icon: '🔍', label: '問題を自動発見', desc: 'バグ・UX課題・パフォーマンス問題を検出', color: '#FFD93D' },
  { icon: '🔄', label: '自律的に改善を回す', desc: 'フィードバックループで品質が継続的に向上', color: '#FF8FAB' },
];

export default function IntroOverlay({ onClose }: IntroOverlayProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    if (step < 3) {
      const timer = setTimeout(() => setStep((s) => s + 1), 400);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{
        background: 'rgba(93, 78, 55, 0.45)',
        backdropFilter: 'blur(6px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease-out',
      }}
    >
      <div
        className="w-[520px] max-w-[90vw] rounded-3xl bg-white overflow-hidden"
        style={{
          boxShadow: '0 12px 48px rgba(180, 140, 100, 0.25)',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease-out',
        }}
      >
        {/* Top accent band */}
        <div
          className="h-1.5"
          style={{
            background: 'linear-gradient(90deg, #6ECFB0, #87CEEB, #FFD93D, #FF8FAB, #C4B5FD)',
          }}
        />

        <div className="px-8 pt-8 pb-3">
          {/* Headline */}
          <div className="text-center mb-6">
            <p
              className="text-xs font-medium tracking-widest uppercase mb-3"
              style={{
                color: '#6ECFB0',
                opacity: step >= 0 ? 1 : 0,
                transform: step >= 0 ? 'translateY(0)' : 'translateY(8px)',
                transition: 'all 0.4s ease-out',
              }}
            >
              Concept Demo
            </p>
            <h1
              className="text-2xl font-bold leading-snug"
              style={{
                color: '#5D4E37',
                opacity: step >= 0 ? 1 : 0,
                transform: step >= 0 ? 'translateY(0)' : 'translateY(8px)',
                transition: 'all 0.5s ease-out 0.1s',
              }}
            >
              生成AIがコードを書く時代。
              <br />
              <span style={{ color: '#6ECFB0' }}>次に変わるのは「品質保証」です。</span>
            </h1>
          </div>

          {/* Context */}
          <div
            className="rounded-2xl p-5 mb-6"
            style={{
              background: '#FFFAF5',
              border: '1.5px solid #F5E6D3',
              opacity: step >= 1 ? 1 : 0,
              transform: step >= 1 ? 'translateY(0)' : 'translateY(12px)',
              transition: 'all 0.5s ease-out',
            }}
          >
            <p className="text-sm leading-relaxed" style={{ color: '#8B7355' }}>
              プロダクトの世界をデジタルツインとして再現し、その中で
              <span className="font-medium" style={{ color: '#5D4E37' }}>
                AIエージェントが人間のように振る舞いながら品質を検証する
              </span>
              ——このデモでは、物流システムを題材にその未来を体験できます。
            </p>
          </div>

          {/* How it works */}
          <div
            style={{
              opacity: step >= 2 ? 1 : 0,
              transform: step >= 2 ? 'translateY(0)' : 'translateY(12px)',
              transition: 'all 0.5s ease-out',
            }}
          >
            <p className="text-xs font-medium tracking-wide uppercase text-center mb-4" style={{ color: '#B8A590' }}>
              AIが品質を保証する仕組み
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {STEPS_DATA.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
                  style={{
                    background: `${s.color}08`,
                    border: `1px solid ${s.color}25`,
                    opacity: step >= 2 ? 1 : 0,
                    transform: step >= 2 ? 'translateY(0)' : 'translateY(8px)',
                    transition: `all 0.4s ease-out ${i * 0.08}s`,
                  }}
                >
                  <span className="text-base shrink-0">{s.icon}</span>
                  <div className="min-w-0">
                    <span className="text-xs font-medium block" style={{ color: '#5D4E37' }}>
                      {s.label}
                    </span>
                    <span className="text-[11px] block" style={{ color: '#B8A590' }}>
                      {s.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="px-8 pt-4 pb-7">
          <button
            type="button"
            onClick={handleClose}
            className="w-full py-3.5 rounded-2xl text-sm font-medium transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: 'linear-gradient(135deg, #6ECFB0, #87CEEB)',
              color: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(110, 207, 176, 0.3)',
              opacity: step >= 3 ? 1 : 0,
              transform: step >= 3 ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.4s ease-out, transform 0.4s ease-out, scale 0.15s',
            }}
          >
            体験を始める
          </button>
        </div>
      </div>
    </div>
  );
}
