import { useEffect, useRef, useState } from 'react';

interface FooterProps {
  description: string;
}

export default function Footer({ description }: FooterProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevDescRef = useRef(description);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (description !== prevDescRef.current || displayedText === '') {
      prevDescRef.current = description;
      setDisplayedText('');
      setIsTyping(true);

      let charIndex = 0;
      intervalRef.current = setInterval(() => {
        charIndex++;
        if (charIndex <= description.length) {
          setDisplayedText(description.slice(0, charIndex));
        } else {
          setIsTyping(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }, 30);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, displayedText]);

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="flex items-center justify-center px-6 py-3">
        <div
          className="max-w-2xl text-center px-5 py-2.5 rounded-2xl animate-fade-in"
          style={{
            background: 'rgba(255, 248, 240, 0.92)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1.5px solid #F5E6D3',
            boxShadow: '0 2px 12px rgba(180, 140, 100, 0.08)',
          }}
        >
          <p className="text-sm text-text-secondary leading-relaxed">
            {displayedText}
            {isTyping && (
              <span className="inline-block w-0.5 h-3.5 ml-0.5 bg-accent-mint rounded-full align-text-bottom animate-pulse" />
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}
