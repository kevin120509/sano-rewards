import { useEffect, useRef } from 'react';
import { BRAND } from '../config/brand';

/** Taza de café (sello lleno). */
export function Cup({ size = 34, steam = true }: { size?: number; steam?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      {steam && (
        <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <path d="M19 6c-2 2.5 2 4.5 0 7.5" /><path d="M26 6c-2 2.5 2 4.5 0 7.5" />
        </g>
      )}
      <path fill="currentColor" d="M8 18h28v9a12 12 0 0 1-12 12h-4A12 12 0 0 1 8 27z" />
      <path fill="none" stroke="currentColor" strokeWidth="3.2" d="M36 21h2.5a5 5 0 0 1 0 10H35" />
      <rect x="6" y="41" width="32" height="3.2" rx="1.6" fill="currentColor" />
    </svg>
  );
}

export function CalendarIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function CodeIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
      <path d="M8 9v6M11 9v6M14 9v6M17 9v6" />
    </svg>
  );
}

/** Logo nuevo de la dueña (PDF "NUEVO LOGO CAFÉ"): @sanobistro + hojas. */
export function SanoLogo({ height = 30 }: { height?: number }) {
  return <img className="sano-logo" src="/logo-sanobistro.svg" alt={BRAND.handle} height={height} style={{ height }} />;
}

interface JourneyProps {
  stamps: number;
  goal: number;
  complete: boolean;
  /** Fechas de cada sello (para el título del círculo). */
  dates?: string[];
  /** Sellos recién llegados (1-based) para animarlos. */
  fresh?: number[];
  title?: string;
  subtitle?: string;
}

/**
 * Tarjeta café del recorrido: 7 sellos + la bebida gratis en el lugar 8.
 * Igual a la captura de la dueña. El 8 se pinta verde con "GRATIS"; brilla cuando la bebida está lista.
 */
export function JourneyCard({ stamps, goal, complete, dates = [], fresh = [], title, subtitle }: JourneyProps) {
  const slots = Array.from({ length: goal + 1 }, (_, i) => i + 1);
  return (
    <section className={`jcard ${complete ? 'jcard--complete' : ''}`} aria-label={`Llevas ${stamps} de ${goal} sellos`}>
      <h2 className="jcard__title">{title ?? (complete ? '¡Tu bebida va por nosotros!' : 'Tu próxima bebida va por nosotros')}</h2>
      <p className="jcard__sub">{subtitle ?? `${goal} compras desde $65. Bebida gratis en tu ${goal + 1}.ª visita.`}</p>
      <ol className="jcard__grid">
        {slots.map((n) => {
          const gift = n === goal + 1;
          const filled = !gift && n <= stamps;
          const isFresh = fresh.includes(n);
          const date = dates[n - 1];
          return (
            <li key={n} className={`jslot ${filled ? 'jslot--on' : ''} ${gift ? 'jslot--gift' : ''} ${gift && complete ? 'jslot--ready' : ''} ${isFresh ? 'jslot--fresh' : ''}`}
                title={date ? new Date(date).toLocaleString('es-MX', { timeZone: 'America/Merida', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : undefined}>
              {gift ? (<><span className="jslot__cup"><Cup size={34} /></span><span className="jslot__free">GRATIS</span></>)
                : (<><span className="jslot__cup"><Cup size={34} /></span><span className="jslot__n">{n}</span><span className="jslot__num">{n}</span></>)}
            </li>
          );
        })}
      </ol>
      <p className="jcard__fine">1 visita por día. Personal e intransferible</p>
    </section>
  );
}

/** Tarjeta de muestra que se va sellando sola (bienvenida y QR). */
export function JourneyPreview({ goal = 7 }: { goal?: number }) {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduce || !ref.current) return;
    let n = 0;
    const el = ref.current;
    const id = window.setInterval(() => {
      n = n >= goal + 2 ? 0 : n + 1;
      el.dataset.n = String(n);
      el.querySelectorAll<HTMLElement>('.jslot').forEach((s, i) => {
        const gift = i === goal;
        s.classList.toggle('jslot--on', !gift && i < n);
        s.classList.toggle('jslot--ready', gift && n >= goal);
      });
    }, 650);
    return () => window.clearInterval(id);
  }, [goal, reduce]);
  return <div ref={ref} className="jpreview"><JourneyCard stamps={reduce ? goal : 0} goal={goal} complete={!!reduce} /></div>;
}
