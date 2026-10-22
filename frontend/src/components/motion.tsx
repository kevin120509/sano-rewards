import { animate, motion, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Número que sube hasta su valor al aparecer. Sin movimiento si el usuario pidió menos animación. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref, { once: true });
  const [n, setN] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) { setN(value); return; }
    if (!seen) return;
    const c = animate(0, value, { duration: 0.7, ease: 'easeOut', onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [value, seen, reduce]);
  return <b ref={ref} className={className}>{n}</b>;
}

/** Entrada suave (sube y aparece). `delay` escalona tarjetas hermanas. */
export function Rise({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: 'easeOut' }}>
      {children}
    </motion.div>
  );
}
