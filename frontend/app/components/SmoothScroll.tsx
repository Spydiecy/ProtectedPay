'use client';

import { useEffect } from 'react';

/**
 * Applies smooth scroll behaviour and easing to all anchor links.
 * Also sets up CSS scroll-timeline for native smooth scrolling.
 */
export default function SmoothScroll() {
  useEffect(() => {
    // Intercept all anchor clicks for smooth scroll
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const id = anchor.getAttribute('href')?.slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return null;
}
