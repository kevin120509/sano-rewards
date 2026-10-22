import { animate, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';

/** Número que sube hasta su valor al cargar. Sin movimiento si el usuario pidió menos animación.
 *  Siempre termina en el valor real: si la pestaña está oculta (el navegador pausa la animación),
 *  un temporizador lo fija igual, para que nunca se quede mostrando 0. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) { setN(value); return; }
    const c = animate(0, value, { duration: 0.7, ease: 'easeOut', onUpdate: (v) => setN(Math.round(v)) });
    const t = setTimeout(() => { c.stop(); setN(value); }, 900);
    return () => { c.stop(); clearTimeout(t); };
  }, [value, reduce]);
  return <b className={className}>{n}</b>;
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
