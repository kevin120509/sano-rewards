import { useEffect } from 'react';
import { formatDate, formatLongDate, formatMonth, formatTime } from '../domain/card';
import { useApp } from '../lib/app-context';

export function History() {
  const { card, refresh } = useApp();
  useEffect(() => { void refresh(); }, [refresh]);
  if (!card) return null;
  return (
    <div className="screen">
      <h1 className="h2">Historial</h1>
      <section className="tile">
        <h3>Premios</h3>
        {card.rewards_ready.length === 0
          ? <p className="muted">Aún no tienes premios listos. ¡Vas bien!</p>
          : <ul className="list">{card.rewards_ready.map((r) => (
              <li key={r.card_id}><b>{r.discount_name ?? 'Premio de cortesía'}</b><br /><small>Listo desde el {formatDate(r.completed_at)}{r.description && r.description !== r.discount_name ? ` · ${r.description}` : ''}</small></li>
            ))}</ul>}
      </section>
      <section className="tile">
        <h3>Tus visitas</h3>
        {card.recent_visits.length === 0
          ? <p className="muted">Todavía no registramos visitas.</p>
          : Object.entries(card.recent_visits.reduce<Record<string, string[]>>((acc, v) => { (acc[formatMonth(v)] ??= []).push(v); return acc; }, {})).map(([mes, vs]) => (
              <div key={mes} className="vmonth">
                <h4 className="vmonth__title">{mes}</h4>
                <ol className="vlist">{vs.map((v) => (
                  <li key={v}><span className="vlist__day">{formatLongDate(v)}</span><span className="vlist__time">{formatTime(v)}</span></li>
                ))}</ol>
              </div>
            ))}
        <p className="muted small">Cada visita muestra el día y la hora en que el mesero cobró con tu código. Tus sellos no vencen; al canjear tu bebida gratis empiezas una tarjeta nueva.</p>
      </section>
    </div>
  );
}
