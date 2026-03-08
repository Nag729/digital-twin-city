import type { Variants } from 'motion/react';

// ─── Stagger container + fade-up item variants ──────────────────
export function staggerVariants(staggerChildren = 0.15, delayChildren = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren, ...(delayChildren > 0 && { delayChildren }) } },
  };
}

export function fadeUpVariants(y = 12, duration = 0.4): Variants {
  return {
    hidden: { opacity: 0, y },
    show: { opacity: 1, y: 0, transition: { duration, ease: 'easeOut' as const } },
  };
}

// ─── Common presets ─────────────────────────────────────────────
export const staggerContainer = staggerVariants();
export const staggerItem = fadeUpVariants();

// ─── Backdrop fade in/out props ─────────────────────────────────
export const backdropMotionProps = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
} as const;

// ─── Modal slide-up props ───────────────────────────────────────
export const modalSlideUpProps = {
  initial: { y: 24, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: 24, opacity: 0 },
  transition: { duration: 0.3, ease: 'easeOut' as const },
} as const;
