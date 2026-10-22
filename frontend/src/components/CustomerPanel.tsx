import { useCallback, useEffect, useState } from 'react';
import { api } from '../data';
import { COUPON_INFO, couponBadge, couponState, lastValidDay } from '../domain/coupons';
import type { AdminGroup, CustomerDetail, CustomerSummary, RedeemResult, StaffCoupon } from '../domain/staff';
import { errMsg, fmtDateTime, receiptReason } from '../lib/staff-format';

type Confirm = null | 'visit' | { redeem: string } | { voidVisit: string } | { voidReceipt: string } | { voidCoupon: string }
  | { issue: 'bakery' | 'coldfoam' } | { resolve: string };

const REDEEM_MSG: Record<RedeemResult, string> = {
  redeemed: 'Cupón canjeado. Aplica el descuento en Loyverse con el código del cliente en la nota.',
  not_available: 'Ese cupón ya no está disponible.',
  expired: 'Ese cupón ya venció.',
  not_yet: 'La bebida se puede canjear desde el día siguiente a que se ganó.',
  daily_limit: 'Hoy ya canjeó un cupón. Solo se permite uno por día; los demás siguen disponibles.',
};

/**
 * Ficha de un cliente para el personal (tarjeta básica, spec 004).
 * Mostrador: ver sellos y cupones, +1 sello (1 por día) y canjear un cupón (1 por día).
 * Administración (admin=true): además quitar un sello (−1), anular una compra, quitar o dar cupones, revisar alertas y cambiar de grupo.
 */
export function CustomerPanel({ id, admin = false, groups = [], onChanged, onClose }: {
  id: string;
  admin?: boolean;
  groups?: AdminGroup[];
  onChanged?: (c: CustomerSummary) => void;
  onClose?: () => void;
}) {
  const [c, setC] = useState<CustomerDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [reason, setReason] = useState('');
  const [groupSel, setGroupSel] = useState('');

  const load = useCallback(async () => {
    setErr(null);
    try { const d = await api.staffDetail(id); setC(d); setGroupSel(d.group.id); }
    catch (e) { setErr(errMsg(e)); }
  }, [id]);

  useEffect(() => { setC(null); setMsg(null); setConfirm(null); void load(); }, [load]);

  const run = async (fn: () => Promise<{ summary: CustomerSummary; text: string; kind?: 'ok' | 'info' }>) => {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const r = await fn();
      setMsg({ kind: r.kind ?? 'ok', text: r.text });
      onChanged?.(r.summary);
      await load();
    } catch (e) { setErr(errMsg(e)); }
    finally { setBusy(false); setConfirm(null); setReason(''); }
  };

  const addVisit = () => run(async () => {
    const r = await api.staffAddVisit(id);
    const res = r.result as string;
    if (res === 'visit') return { summary: r.customer, text: `Sello agregado. Lleva ${r.customer.visits_count} de ${r.customer.visits_goal}.${r.customer.journey_status === 'complete' ? ' ¡Completó su tarjeta! Su bebida gratis se puede canjear desde mañana.' : ''}` };
    if (res === 'card_complete') return { summary: r.customer, text: 'Su tarjeta ya está completa: primero debe canjear su bebida gratis.', kind: 'info' };
    return { summary: r.customer, text: 'Ya tenía su sello de hoy. No se agregó otro.', kind: 'info' };
  });
  const redeem = (couponId: string) => run(async () => {
    const r = await api.staffRedeemCoupon(couponId);
    return { summary: r.customer, text: REDEEM_MSG[r.result] ?? r.result, kind: r.result === 'redeemed' ? 'ok' : 'info' };
  });
  const voidVisit = (visitId: string) => run(async () => ({ summary: await api.adminVoidVisit(visitId, reason), text: 'Sello quitado.' }));
  const voidReceipt = (receiptId: string) => run(async () => ({ summary: await api.adminVoidReceipt(receiptId, reason), text: 'Compra anulada: se quitaron su sello y los cupones que no se habían usado. Si alguno ya se usó, quedó marcado para revisión.' }));
  const voidCoupon = (couponId: string) => run(async () => ({ summary: await api.adminVoidCoupon(couponId, reason), text: 'Cupón quitado.' }));
  const issue = (kind: 'bakery' | 'coldfoam') => run(async () => ({ summary: await api.adminIssueCoupon(id, kind, reason), text: `Se dio el cupón de ${COUPON_INFO[kind].short.toLowerCase()}.` }));
  const resolve = (couponId: string) => run(async () => ({ summary: await api.adminResolveReview(couponId, reason), text: 'Marcado como revisado.' }));
  const changeGroup = () => run(async () => {
    const s = await api.adminChangeGroup(id, groupSel);
    return { summary: s, text: `Ahora es del grupo ${s.group.name}. Su código nuevo es ${s.code}.` };
  });

  if (!c) {
    return (
      <section className="sp-card sp-detail">
        {onClose && <button className="sp-back" onClick={onClose}>← Volver</button>}
        {err ? <p className="note note--error" role="alert">{err}</p> : <p className="muted">Cargando cliente…</p>}
      </section>
    );
  }

  const complete = c.journey_status === 'complete';
  const coupons = c.coupons ?? [];
  const available = coupons.filter((k) => k.status === 'available');
  const reviews = coupons.filter((k) => k.needs_review);
  const history = coupons.filter((k) => k.status !== 'available' && !k.needs_review).slice(0, 8);
  const has = (kind: string) => coupons.some((k) => k.kind === kind && k.status !== 'voided' && k.status !== 'expired' && !k.redeemed_at) || false;
  const reasonInput = (
    <input className="sp-reason" placeholder="Motivo (obligatorio)" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
  );
  const isConfirm = <K extends string>(k: K, v: string) => typeof confirm === 'object' && confirm !== null && (confirm as Record<string, string>)[k] === v;

  return (
    <section className="sp-card sp-detail" aria-live="polite">
      {onClose && <button className="sp-back" onClick={onClose}>← Volver</button>}
      <header className="sp-detail__head">
        <div>
          <p className="sp-code">{c.code}</p>
          <h2 className="sp-detail__name">{c.full_name || 'Sin nombre'}</h2>
          <p className="muted sp-small">{[c.phone, c.email].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="sp-tags">
          <span className="sp-tag">{c.group.name}</span>
          {complete && <span className="sp-tag sp-tag--gold">Bebida pendiente</span>}
          {!!c.needs_review && <span className="sp-tag sp-tag--warn">Revisar</span>}
        </div>
      </header>

      {c.group.benefit && <p className="sp-benefit"><b>Beneficio en caja:</b> {c.group.benefit}</p>}

      <div className="sp-facts">
        <div><span>Sellos</span><b>{complete ? 'Completa' : `${c.visits_count} / ${c.visits_goal}`}</b></div>
        <div><span>Hoy</span><b className={c.visited_today ? 'sp-ok' : ''}>{c.visited_today ? 'Ya tiene sello' : 'Sin sello'}</b></div>
        <div><span>Cupones</span><b className={available.length ? 'sp-ok' : ''}>{available.length ? `${available.length} disponible${available.length === 1 ? '' : 's'}` : 'Ninguno'}</b></div>
        <div><span>Cupón hoy</span><b>{c.coupon_redeemed_today ? 'Ya usó uno' : 'Puede usar uno'}</b></div>
      </div>

      {msg && <p className={`note ${msg.kind === 'ok' ? 'sp-note-ok' : 'note--info'}`} role="status">{msg.text}</p>}
      {err && <p className="note note--error" role="alert">{err}</p>}

      <h3 className="sp-h3">Cupones disponibles</h3>
      {available.length === 0 ? <p className="muted sp-small">No tiene cupones por ahora.</p> : (
        <ul className="sp-coupons">
          {available.map((k) => {
            const st = couponState(k);
            return (
              <li key={k.id} className="sp-coupon">
                <div className="sp-coupon__body">
                  <b>{COUPON_INFO[k.kind].title}</b>
                  <small>{couponBadge(k)} · vence el {lastValidDay(k.expires_at)}{k.source_receipt ? ` · ticket ${k.source_receipt}` : ''}</small>
                  <small className="muted">{COUPON_INFO[k.kind].detail}</small>
                </div>
                {isConfirm('redeem', k.id) ? (
                  <span className="sp-inline">
                    <button className="btn btn--primary" disabled={busy} onClick={() => redeem(k.id)}>Sí, canjear</button>
                    <button className="btn btn--ghost" disabled={busy} onClick={() => setConfirm(null)}>No</button>
                  </span>
                ) : isConfirm('voidCoupon', k.id) ? (
                  <span className="sp-void">{reasonInput}
                    <button className="chip sp-chip-danger" disabled={busy || reason.trim().length < 3} onClick={() => voidCoupon(k.id)}>Quitar</button>
                    <button className="chip" disabled={busy} onClick={() => setConfirm(null)}>No</button>
                  </span>
                ) : (
                  <span className="sp-inline">
                    <button className="btn btn--primary" disabled={busy || st !== 'ready' || !!c.coupon_redeemed_today} onClick={() => setConfirm({ redeem: k.id })}>Canjear</button>
                    {admin && k.kind !== 'drink' && <button className="sp-link-danger" disabled={busy} onClick={() => { setReason(''); setConfirm({ voidCoupon: k.id }); }}>Quitar</button>}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="sp-actions">
        {confirm === 'visit' ? (
          <div className="sp-confirm">
            <span>¿Agregar el sello de hoy a <b>{c.code}</b>? Úsalo solo si la compra fue de $65 o más y no se registró sola.</span>
            <button className="btn btn--primary" disabled={busy} onClick={addVisit}>Sí, agregar</button>
            <button className="btn btn--ghost" disabled={busy} onClick={() => setConfirm(null)}>Cancelar</button>
          </div>
        ) : (
          <button className="btn btn--ghost" disabled={busy || c.visited_today || complete} onClick={() => setConfirm('visit')}>
            {complete ? 'Tarjeta completa: canjea la bebida' : c.visited_today ? 'Ya tiene su sello de hoy' : '+1 sello manual'}
          </button>
        )}
      </div>
      <p className="muted sp-small">Lo normal: escribe el código del cliente en la nota del ticket de Loyverse y aplica ahí el descuento del cupón. El sello y el canje se registran solos en menos de un minuto.</p>

      {admin && reviews.length > 0 && (
        <>
          <h3 className="sp-h3 sp-warn">Para revisión</h3>
          <ul className="sp-coupons">
            {reviews.map((k) => (
              <li key={k.id} className="sp-coupon sp-coupon--review">
                <div className="sp-coupon__body">
                  <b>{COUPON_INFO[k.kind].title} · {k.status === 'redeemed' ? 'canjeado' : k.status}</b>
                  <small>{k.review_note}</small>
                </div>
                {isConfirm('resolve', k.id) ? (
                  <span className="sp-void"><input className="sp-reason" placeholder="Nota (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
                    <button className="chip" disabled={busy} onClick={() => resolve(k.id)}>Listo</button>
                    <button className="chip" disabled={busy} onClick={() => setConfirm(null)}>No</button>
                  </span>
                ) : <button className="chip" disabled={busy} onClick={() => { setReason(''); setConfirm({ resolve: k.id }); }}>Marcar revisado</button>}
              </li>
            ))}
          </ul>
        </>
      )}

      {admin && (
        <div className="sp-admin">
          <h3 className="sp-h3">Herramientas de administración</h3>
          <div className="sp-admin__row sp-admin__row--wrap">
            <span className="sp-label">Dar cupón a mano</span>
            {(['bakery', 'coldfoam'] as const).map((kind) => (
              isConfirm('issue', kind) ? (
                <span key={kind} className="sp-void">{reasonInput}
                  <button className="chip" disabled={busy || reason.trim().length < 3} onClick={() => issue(kind)}>Dar {COUPON_INFO[kind].short.toLowerCase()}</button>
                  <button className="chip" disabled={busy} onClick={() => setConfirm(null)}>No</button>
                </span>
              ) : <button key={kind} className="chip" disabled={busy || has(kind)} onClick={() => { setReason(''); setConfirm({ issue: kind }); }}>{COUPON_INFO[kind].short}</button>
            ))}
          </div>
          <div className="sp-admin__row">
            <label className="field">
              <span>Grupo</span>
              <select value={groupSel} onChange={(e) => setGroupSel(e.target.value)} disabled={busy}>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.prefix}){g.active ? '' : ' · pausado'}</option>)}
              </select>
            </label>
            <button className="btn btn--ghost" disabled={busy || groupSel === c.group.id} onClick={changeGroup}>Cambiar grupo</button>
          </div>
          {groupSel !== c.group.id && <p className="muted sp-small">Conserva su número, sus sellos y cupones; solo cambia la letra del código.</p>}
        </div>
      )}

      {admin && (c.receipts ?? []).length > 0 && (
        <>
          <h3 className="sp-h3">Compras recientes (Loyverse)</h3>
          <ul className="sp-visits">
            {(c.receipts ?? []).map((r) => (
              <li key={r.id}>
                <span><b>{r.number}</b> · {fmtDateTime(r.at)}{r.paid != null ? ` · pagó $${r.paid}` : ''}{r.regular != null && r.regular !== r.paid ? ` (regular $${r.regular})` : ''}</span>
                <small className="sp-receipt-reason">{r.reversed_at ? `Anulada: ${r.reverse_reason ?? ''}` : receiptReason(r.reason, r.status)}</small>
                {!r.reversed_at && (isConfirm('voidReceipt', r.id) ? (
                  <span className="sp-void">{reasonInput}
                    <button className="chip sp-chip-danger" disabled={busy || reason.trim().length < 3} onClick={() => voidReceipt(r.id)}>Anular compra</button>
                    <button className="chip" disabled={busy} onClick={() => setConfirm(null)}>No</button>
                  </span>
                ) : <button className="sp-link-danger" disabled={busy} onClick={() => { setReason(''); setConfirm({ voidReceipt: r.id }); }}>Anular</button>)}
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 className="sp-h3">Sellos recientes</h3>
      {c.visits.length === 0 ? <p className="muted">Todavía no tiene sellos.</p> : (
        <ul className="sp-visits">
          {c.visits.map((v) => (
            <li key={v.id} className={v.current ? '' : 'sp-visit--old'}>
              <span>{fmtDateTime(v.visited_at)}{v.current ? '' : ' · recorrido anterior'}</span>
              <span className={`sp-src sp-src--${v.source}`}>{v.source === 'manual' ? `Manual${v.added_by ? ` · ${v.added_by}` : ''}` : `Loyverse${v.receipt ? ` · ${v.receipt}` : ''}`}</span>
              {admin && v.current && (isConfirm('voidVisit', v.id) ? (
                <span className="sp-void">{reasonInput}
                  <button className="chip sp-chip-danger" disabled={busy} onClick={() => voidVisit(v.id)}>Quitar</button>
                  <button className="chip" disabled={busy} onClick={() => setConfirm(null)}>No</button>
                </span>
              ) : (
                <button className="sp-link-danger" disabled={busy} onClick={() => { setReason(''); setConfirm({ voidVisit: v.id }); }}>−1</button>
              ))}
            </li>
          ))}
        </ul>
      )}

      {history.length > 0 && (
        <>
          <h3 className="sp-h3">Cupones anteriores</h3>
          <ul className="sp-visits">
            {history.map((k: StaffCoupon) => (
              <li key={k.id}>
                <span>{COUPON_INFO[k.kind].title}</span>
                <span className="sp-src">{k.status === 'redeemed' ? `Canjeado ${k.redeemed_at ? fmtDateTime(k.redeemed_at) : ''}${k.redeemed_by ? ` · ${k.redeemed_by}` : k.redeemed_receipt ? ` · ticket ${k.redeemed_receipt}` : ''}` : k.status === 'expired' ? 'Vencido' : 'Anulado'}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
