import type { CustomerSummary } from '../domain/staff';
import { fmtRelativeDay } from '../lib/staff-format';

/** Renglón de cliente en búsquedas del panel. */
export function CustomerRow({ c, active, onSelect }: { c: CustomerSummary; active?: boolean; onSelect(): void }) {
  return (
    <button className={`sp-row ${active ? 'sp-row--active' : ''}`} onClick={onSelect}>
      <span className="sp-row__code">{c.code}</span>
      <span className="sp-row__main">
        <b>{c.full_name || 'Sin nombre'}</b>
        <small>{c.group.name} · {c.journey_status === 'complete' ? 'tarjeta completa' : `${c.visits_count}/${c.visits_goal} sellos`} · {fmtRelativeDay(c.last_visit_at)}</small>
      </span>
      <span className="sp-row__flags">
        {c.visited_today && <span className="sp-pill">Hoy ✓</span>}
        {c.rewards_ready > 0 && <span className="sp-pill sp-pill--gift">Bebida</span>}
        {!!c.coupons_available && c.coupons_available > c.rewards_ready && <span className="sp-pill">{c.coupons_available - c.rewards_ready} cupón{c.coupons_available - c.rewards_ready === 1 ? '' : 'es'}</span>}
        {!!c.needs_review && <span className="sp-pill sp-pill--warn">Revisar</span>}
      </span>
    </button>
  );
}
