// Movement: content that rises in when it scrolls into view, and numbers that travel to their value.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { VStack } from '@astryxdesign/core/Layout';
import { useAnimator } from '@astryxdesign/core/hooks';

export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Rises into place the first time it is seen. Takes the same props as VStack.
export function Reveal({ children, delay = 0, rise = 18, ...stack }) {
  const ref = useRef(null);
  const animator = useAnimator(ref);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window) || prefersReducedMotion()) return undefined;
    animator.set({ y: rise, opacity: 0 });
    let timer;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      timer = setTimeout(() => animator.animate({ y: 0, opacity: 1 }), delay);
    }, { rootMargin: '0px 0px -6% 0px' });
    io.observe(el);
    return () => { io.disconnect(); clearTimeout(timer); animator.stop(); animator.set({ y: 0, opacity: 1 }); };
  }, [animator, delay, rise]);
  return <VStack ref={ref} {...stack}>{children}</VStack>;
}

const easeOut = (t) => 1 - (1 - t) ** 3;

// A number that moves from where it is to its new value. `from` is where it starts the first time.
export function useAnimatedNumber(target, { from = target, ms = 800 } = {}) {
  const [shown, setShown] = useState(prefersReducedMotion() ? target : from);
  const current = useRef(shown);
  useEffect(() => {
    if (target == null) return undefined;
    const start = current.current ?? target;
    if (prefersReducedMotion() || start === target) { current.current = target; setShown(target); return undefined; }
    let frame;
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      current.current = start + (target - start) * easeOut(t);
      setShown(current.current);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return target == null ? target : shown;
}

// 0 to 1 once, when the component appears.
export function useAppear(ms = 900) {
  return useAnimatedNumber(1, { from: 0, ms });
}

export function CountUp({ value, format = (n) => `${Math.round(n)}`, from = 0 }) {
  return format(useAnimatedNumber(value, { from }));
}
