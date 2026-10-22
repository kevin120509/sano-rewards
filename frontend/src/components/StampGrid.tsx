import { formatDateTime, formatDayMonth, stampTilt, stampsFor } from '../domain/card';
import type { ThemeKey } from '../domain/types';
import { Drink, StampIcon } from './Icons';

interface Props {
  visits: number;
  goal: number;
  theme: ThemeKey;
  /** El premio ya se ganó (la última casilla brilla). */
  rewardReady?: boolean;
  /** Fecha y hora de cada visita (en orden) para mostrarla bajo su sello. */
  dates?: string[];
  /** Números de casilla que se acaban de registrar: se "sellan" con animación. */
  fresh?: number[];
}

/** Casillas como en la tarjeta física: círculos claros; las visitas quedan "selladas" con tinta. */
export function StampGrid({ visits, goal, theme, rewardReady = false, dates = [], fresh = [] }: Props) {
  const stamps = stampsFor({ visits_count: visits, visits_goal: goal });
  return (
    <ol className="stamps" data-count={stamps.length} aria-label={`${visits} de ${goal} visitas`}>
      {stamps.map((s) => {
        const last = s.filled && s.index === Math.min(visits, goal);
        const isFresh = s.filled && fresh.includes(s.index);
        const date = s.filled ? dates[s.index - 1] : undefined;
        const cls = ['stamp', s.filled && 'stamp--on', s.isGift && 'stamp--gift', last && !isFresh && 'stamp--last', isFresh && 'stamp--fresh', s.isGift && (rewardReady || s.filled) && 'stamp--won', date && 'stamp--dated'].filter(Boolean).join(' ');
        return (
          <li key={s.index} className={cls} title={date ? `Visita ${s.index}: ${formatDateTime(date)}` : undefined}
              aria-label={s.isGift ? 'Premio' : `Visita ${s.index}${s.filled ? ` registrada${date ? ` el ${formatDateTime(date)}` : ''}` : ''}`}>
            {s.isGift ? (
              <span className="stamp__gift"><Drink size={34} /></span>
            ) : s.filled ? (
              <span className="stamp__ink" style={{ ['--tilt' as string]: `${stampTilt(s.index)}deg` }}>
                <StampIcon theme={theme} size={26} />
              </span>
            ) : (
              <span className="stamp__n">{s.index}</span>
            )}
            {date && !s.isGift && <span className="stamp__date">{formatDayMonth(date)}</span>}
          </li>
        );
      })}
    </ol>
  );
}
