import { useRef, useState } from 'react';
import { BRAND } from '../config/brand';
import { validityLabel } from '../domain/card';
import type { ThemeKey } from '../domain/types';
import { Copy, Leaves, Star } from './Icons';
import { StampGrid } from './StampGrid';

export interface LoyaltyCardData {
  code: string;
  fullName: string;
  groupName: string;
  isDefaultGroup: boolean;
  premium: boolean;
  visits: number;
  goal: number;
  periodEndsAt: string;
  rewardName: string;
  rewardReady: boolean;
  /** Fecha y hora de cada visita de esta tarjeta (opcional). */
  visitDates?: string[];
  /** Casillas recién registradas que se animan. */
  freshStamps?: number[];
}

/**
 * Tarjeta con aspecto de tarjeta física (inspirada en la de Sano Bistro):
 * panel claro con la marca y los datos + franja de color "Sano rewards" con las casillas.
 * Se acomoda sola: horizontal cuando hay espacio, vertical en teléfono (container queries).
 */
export function LoyaltyCard({ data, theme, interactive = true }: { data: LoyaltyCardData; theme: ThemeKey; interactive?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  const tilt = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--ry', `${(x * 8).toFixed(2)}deg`);
    el.style.setProperty('--rx', `${(-y * 8).toFixed(2)}deg`);
    el.style.setProperty('--sx', `${((x + 0.5) * 100).toFixed(0)}%`);
  };
  const reset = () => { ref.current?.style.removeProperty('--rx'); ref.current?.style.removeProperty('--ry'); ref.current?.style.removeProperty('--sx'); };

  const copy = async () => {
    if (!interactive) return;
    try { await navigator.clipboard.writeText(data.code); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* sin permiso */ }
  };

  return (
    <div className="lcard-wrap">
      <article ref={ref} className={`lcard ${data.premium ? 'lcard--premium' : ''}`} onPointerMove={tilt} onPointerLeave={reset} aria-label={`Tarjeta ${BRAND.programName} de ${data.fullName}`}>
        <section className="lcard__paper">
          <div className="lcard__logo" aria-label={BRAND.businessName}>
            <span className="lcard__logo-word">{BRAND.logoTop}<br />{BRAND.logoBottom}</span>
            <span className="lcard__logo-leaves"><Leaves size={44} /></span>
            <span className="lcard__logo-sub">{BRAND.logoSub}</span>
          </div>

          <div className="lcard__tags">
            {data.premium && <span className="lcard__tag lcard__tag--gold"><Star size={13} /> Premium</span>}
            {!data.isDefaultGroup && <span className="lcard__tag">{data.groupName}</span>}
          </div>

          <dl className="lcard__fields">
            <div className="lfield"><dt>Nombre</dt><dd>{data.fullName}</dd></div>
            <div className="lfield lfield--code">
              <dt>Tu código</dt>
              <dd>
                <button type="button" onClick={copy} tabIndex={interactive ? 0 : -1} aria-label={`Copiar código ${data.code}`}>
                  <span>{data.code}</span>{interactive && <Copy size={16} />}
                </button>
              </dd>
            </div>
          </dl>
          <p className="lcard__hint" aria-live="polite">{copied ? '¡Código copiado!' : 'Díctalo al mesero al pagar'}</p>
          <p className="lcard__contact">{BRAND.handle} · {BRAND.phone}</p>
        </section>

        <section className="lcard__band">
          <h2 className="lcard__title">{BRAND.programName.split(' ')[0]} <span>{BRAND.programName.split(' ').slice(1).join(' ')}</span></h2>
          <p className="lcard__sub">Registra tu visita y en la <b>{data.goal}.ª</b> recibe <b>{data.rewardName}</b></p>
          <StampGrid visits={data.visits} goal={data.goal} theme={theme} rewardReady={data.rewardReady} dates={data.visitDates} fresh={data.freshStamps} />
          <p className="lcard__fine">Vigencia: {validityLabel(data.periodEndsAt)} · {BRAND.finePrint}</p>
        </section>
        <span className="lcard__sheen" aria-hidden="true" />
      </article>
    </div>
  );
}
