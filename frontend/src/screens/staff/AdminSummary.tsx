import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../data';
import { COUPON_INFO } from '../../domain/coupons';
import type { AdminDashboard, ReviewItem } from '../../domain/staff';
import { CountUp, Rise } from '../../components/motion';
import { errMsg, fmtDateTime } from '../../lib/staff-format';

/** Resumen de la dueña: sellos y cupones del programa. Las ventas se ven en Loyverse. */
export function AdminSummary() {
  const [d, setD] = useState<AdminDashboard | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api.adminDashboard().then(setD).catch((e) => setErr(errMsg(e)));
    api.adminReviewList().then(setReviews).catch(() => setReviews([]));
  }, []);

  if (err) return <p className="note note--error" role="alert">{err}</p>;
  if (!d) return <p className="muted">Cargando resumen…</p>;
  const month = new Date().toLocaleDateString('es-MX', { timeZone: 'America/Merida', month: 'long' });
  const k = d.coupons;
  const review = d.needs_review ?? 0;
  const coupons = [
    { title: 'Bebida', big: k?.drink.issued_month ?? 0, rows: [['Canjeadas', k?.drink.redeemed_month ?? 0], ['Por canjear', k?.drink.available ?? d.rewards_pending]] },
    { title: 'Panadería', big: k?.bakery.issued_month ?? 0, rows: [['Canjeadas', k?.bakery.redeemed_month ?? 0], ['Vigentes', k?.bakery.available ?? 0]] },
    { title: 'Cold foam', big: k?.coldfoam.issued_month ?? 0, rows: [['Canjeados', k?.coldfoam.redeemed_month ?? 0], ['Vigentes', k?.coldfoam.available ?? 0]] },
  ];
  return (
    <div className="sp-page">
      <header className="sp-head">
        <h1 className="sp-title">Resumen</h1>
        <p className="sp-head__sub">Programa de lealtad · <b className="sp-month">{month}</b></p>
      </header>

      {review > 0 && (
        <a className="sp-alert" href="#revision">
          <b>{review} {review === 1 ? 'cupón necesita' : 'cupones necesitan'} revisión</b>
          <span>Ver detalle</span>
        </a>
      )}

      <section className="sp-section" aria-labelledby="s-clientes">
        <h2 id="s-clientes" className="sp-section__title">Clientes</h2>
        <div className="sp-stats sp-stats--3">
          <Rise className="sp-stat"><span>Clientes registrados</span><CountUp value={d.customers_total} /></Rise>
          <Rise className="sp-stat"><span>Nuevos en {month}</span><CountUp value={d.new_this_month} /></Rise>
          <Rise className="sp-stat"><span>Tarjetas completas</span><CountUp value={d.journeys_complete ?? 0} /></Rise>
        </div>
      </section>

      <section className="sp-section" aria-labelledby="s-sellos">
        <h2 id="s-sellos" className="sp-section__title">Sellos</h2>
        <div className="sp-stats sp-stats--2">
          <Rise className="sp-stat"><span>Hoy</span><CountUp value={d.visits_today} /></Rise>
          <Rise className="sp-stat"><span>En {month}</span><CountUp value={d.visits_month} /></Rise>
        </div>
      </section>

      <section className="sp-section" aria-labelledby="s-cupones">
        <h2 id="s-cupones" className="sp-section__title">Cupones ganados en {month}</h2>
        <div className="sp-ctiles">
          {coupons.map((c, i) => (
            <Rise key={c.title} className="sp-ctile" delay={i * 0.06}>
              <h3>{c.title}</h3>
              <p className="sp-ctile__big"><CountUp value={c.big} /><span>ganados</span></p>
              <dl>{c.rows.map(([l, v]) => <div key={l as string}><dt>{l}</dt><dd><CountUp value={v as number} /></dd></div>)}</dl>
            </Rise>
          ))}
        </div>
      </section>

      {reviews.length > 0 && (
        <section className="sp-section" id="revision">
          <h2 className="sp-section__title">Para revisión</h2>
          <div className="sp-card">
            <p className="muted sp-small">Cupones que ya se habían usado cuando se anuló la compra o el sello que los generó. Revisa con el cliente y márcalos como revisados en su ficha.</p>
            <ul className="sp-visits">
              {reviews.map((r) => (
                <li key={r.id}>
                  <span><b>{r.customer.code}</b> {r.customer.full_name} · {COUPON_INFO[r.kind].title}{r.redeemed_at ? ` · canjeado ${fmtDateTime(r.redeemed_at)}` : ''}</span>
                  <small className="sp-receipt-reason">{r.review_note}</small>
                  <Link className="chip" to={`/admin/clientes?cliente=${r.customer.id}`}>Ver cliente</Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="sp-section">
      <h2 className="sp-section__title">Clientes por grupo</h2>
      <div className="sp-card">
        <ul className="sp-bars">
          {d.groups.map((g) => {
            const pct = d.customers_total ? Math.round((g.customers / d.customers_total) * 100) : 0;
            return (
              <li key={g.id}>
                <Link to={`/admin/clientes?grupo=${g.id}`} className="sp-bars__name">{g.name} <small>({g.prefix})</small></Link>
                <span className="sp-bars__track"><span style={{ width: `${pct}%` }} /></span>
                <b>{g.customers}</b>
              </li>
            );
          })}
        </ul>
      </div>
      </section>
      <p className="muted sp-small">Las ventas y los cobros se consultan en Loyverse. Aquí solo se ve el programa de lealtad.</p>
    </div>
  );
}
