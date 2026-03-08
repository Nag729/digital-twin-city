import { useCallback, useEffect, useRef, useState } from 'react';

/** Handles backdrop click and Escape key to dismiss a modal/panel. */
export function useModalDismiss(onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return { panelRef, handleBackdropClick };
}

/** Returns [isOpen, onOpen, onClose] for a boolean modal state. */
export function useModalState(initial = false): [boolean, () => void, () => void] {
  const [isOpen, setIsOpen] = useState(initial);
  const onOpen = useCallback(() => setIsOpen(true), []);
  const onClose = useCallback(() => setIsOpen(false), []);
  return [isOpen, onOpen, onClose];
}
