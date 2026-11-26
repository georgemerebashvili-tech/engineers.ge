/** Smooth scrolling unless the visitor asked the OS for reduced motion (the design never checked). */
export function smoothBehavior(): ScrollBehavior {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 'instant';
  }
  return 'smooth';
}
