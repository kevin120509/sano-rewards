import { useEffect, useState } from 'react';
import { api } from '../../data';
import { COUPON_INFO } from '../../domain/coupons';
import type { ProgramData, ProgramInput, PromotionRow } from '../../domain/staff';
import type { CouponKind } from '../../domain/types';
import { errMsg } from '../../lib/staff-format';

const toInput = (p: ProgramData): ProgramInput => ({
  drink_discount_id: p.settings.drink_discount_id ?? '',
  bakery_discount_id: p.settings.bakery_discount_id ?? '',
  coldfoam_discount_id: p.settings.coldfoam_discount_id ?? '',
  promo_category_ids: p.settings.promo_category_ids ?? [],
  dining_options_counted: p.settings.dining_options_counted,
});

/** Programa (dueña): conectar los cupones con Loyverse y publicar las promociones del mes. */
export function AdminProgram() {
  const [data, setData] = useState<ProgramData | null>(null);
  const [f, setF] = useState<ProgramInput | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.adminGetProgram().then((d) => { setData(d); setF(toInput(d)); }).catch((e) => setErr(errMsg(e))); }, []);

  const save = async () => {
    if (!f) return;
    setBusy(true); setErr(null); setMsg(null);
    try { const d = await api.adminSaveProgram(f); setData(d); setF(toInput(d)); setMsg('Guardado. Las compras nuevas ya usan esta configuración.'); }
    catch (e) { setErr(errMsg(e)); }
    finally { setBusy(false); }
  };

  if (err && !data) return <p className="note note--error" role="alert">{err}</p>;
  if (!data || !f) return <p className="muted">Cargando…</p>;
  const s = data.settings;
  const missing = (['drink', 'bakery', 'coldfoam'] as CouponKind[]).filter((k) => !f[`${k}_discount_id` as const]);
  const allDining = f.dining_options_counted === null;
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="sp-page">
      <header className="sp-head"><h1 className="sp-title">Programa</h1><p className="sp-head__sub">Reglas, cupones y promociones del <b>programa de lealtad</b></p></header>
      <section className="sp-section" aria-labelledby="p-reglas">
        <h2 id="p-reglas" className="sp-section__title">Reglas vigentes</h2>
        <div className="sp-rulegrid">
          <div className="sp-rule"><span>Sello</span><b>${s.stamp_min}+</b><small>1 por día</small></div>
          <div className="sp-rule"><span>Bebida gratis</span><b>{s.goal} sellos</b><small>vence en {s.drink_days} días</small></div>
          <div className="sp-rule"><span>Panadería</span><b>${s.bakery_min}+</b><small>en el sello 1 · {s.bakery_days} días</small></div>
          <div className="sp-rule"><span>Cold foam</span><b>${s.coldfoam_min}+</b><small>{s.coldfoam_days} días</small></div>
          <div className="sp-rule"><span>Cupones</span><b>1 por día</b><small>por cliente</small></div>
        </div>
        <p className="muted sp-small">Para cambiar montos o vigencias, pídelo a CODIA.</p>
      </section>

      <section className="sp-card">
        <h2 className="sp-h2">1. Descuentos de Loyverse para cada cupón</h2>
        <p className="muted sp-small">Crea en Loyverse un descuento para cada cupón y elígelo aquí. Cuando el mesero lo aplique en un ticket con el código del cliente, el cupón se marca como usado solo.</p>
        <div className="sp-form__grid">
          {(['drink', 'bakery', 'coldfoam'] as CouponKind[]).map((k) => (
            <label key={k} className="field"><span>{COUPON_INFO[k].title}</span>
              <select value={f[`${k}_discount_id` as const]} onChange={(e) => setF({ ...f, [`${k}_discount_id`]: e.target.value })}>
                <option value="">— Sin elegir —</option>
                {data.discounts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
          ))}
        </div>
        {missing.length > 0 && <p className="note note--info">Falta elegir: {missing.map((k) => COUPON_INFO[k].title).join(', ')}. Mientras tanto ese cupón solo se puede canjear desde el Mostrador.</p>}
        <p className="muted sp-small">¿No aparece? Los descuentos nuevos de Loyverse llegan solos en unos 5 minutos.</p>
      </section>

      <section className="sp-card">
        <h2 className="sp-h2">2. Paquetes y promociones</h2>
        <p className="muted sp-small">Marca la categoría de Loyverse donde están tus paquetes y promociones. Esos productos sí dan sello, pero no cuentan para los ${s.bakery_min} de panadería ni los ${s.coldfoam_min} de cold foam. Los productos con descuento tampoco cuentan.</p>
        {data.categories.length === 0 ? <p className="note note--info">Aún no llegan las categorías de Loyverse (se actualizan cada 5 minutos).</p> : (
          <div className="sp-checks">
            {data.categories.map((c) => (
              <label key={c.id} className="sp-check"><input type="checkbox" checked={f.promo_category_ids.includes(c.id)}
                onChange={() => setF({ ...f, promo_category_ids: toggle(f.promo_category_ids, c.id) })} /> {c.name}</label>
            ))}
          </div>
        )}
      </section>

      <section className="sp-card">
        <h2 className="sp-h2">3. Tipos de pedido que participan</h2>
        <p className="muted sp-small">Los pedidos de plataformas de reparto, catering y eventos no participan.</p>
        <label className="sp-check"><input type="radio" checked={allDining} onChange={() => setF({ ...f, dining_options_counted: null })} /> Todos participan</label>
        <label className="sp-check"><input type="radio" checked={!allDining} onChange={() => setF({ ...f, dining_options_counted: data.dining_options.filter((d) => !/rappi|uber|didi|envío|envio|domicilio|catering|evento/i.test(d)) })} /> Solo los que marque</label>
        {!allDining && (
          <div className="sp-checks">
            {data.dining_options.length === 0 && <p className="muted sp-small">Aparecerán aquí cuando lleguen tickets con tipo de pedido.</p>}
            {data.dining_options.map((d) => (
              <label key={d} className="sp-check"><input type="checkbox" checked={(f.dining_options_counted ?? []).includes(d)}
                onChange={() => setF({ ...f, dining_options_counted: toggle(f.dining_options_counted ?? [], d) })} /> {d}</label>
            ))}
          </div>
        )}
      </section>

      {err && <p className="note note--error" role="alert">{err}</p>}
      {msg && <p className="note sp-note-ok" role="status">{msg}</p>}
      <div className="sp-actions"><button className="btn btn--primary" disabled={busy} onClick={save}>{busy ? 'Guardando…' : 'Guardar configuración'}</button></div>

      <Promotions />
    </div>
  );
}

const emptyPromo = { id: null as string | null, title: '', subtitle: '', image_url: '' as string | null, sort: 0, active: true };

/** Promociones del mes: lo que el cliente ve como publicidad en su tarjeta. */
function Promotions() {
  const [list, setList] = useState<PromotionRow[] | null>(null);
  const [edit, setEdit] = useState<typeof emptyPromo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.adminListPromotions().then(setList).catch((e) => setErr(errMsg(e))); }, []);

  const upload = async (file: File | undefined) => {
    if (!file || !edit) return;
    setBusy(true); setErr(null);
    try { setEdit({ ...edit, image_url: await api.uploadPromoImage(file) }); } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };
  const save = async (p: typeof emptyPromo) => {
    setBusy(true); setErr(null);
    try { setList(await api.adminSavePromotion({ ...p, subtitle: p.subtitle || null })); setEdit(null); } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <section className="sp-card">
      <div className="sp-titlebar">
        <h2 className="sp-h2">Promociones del mes</h2>
        {!edit && <button className="btn btn--primary" onClick={() => setEdit({ ...emptyPromo, sort: (list?.length ?? 0) + 1 })}>+ Nueva promoción</button>}
      </div>
      <p className="muted sp-small">Es publicidad: el cliente siempre la ve en su tarjeta. Ej. "Sandwich + bebida por $220" · "Solo lunes y jueves".</p>
      {err && <p className="note note--error" role="alert">{err}</p>}
      {edit && (
        <div className="sp-form">
          <div className="sp-form__grid">
            <label className="field"><span>Título</span><input value={edit.title} maxLength={60} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="Sandwich + bebida por $220" /></label>
            <label className="field"><span>Días o detalle</span><input value={edit.subtitle ?? ''} maxLength={60} onChange={(e) => setEdit({ ...edit, subtitle: e.target.value })} placeholder="Solo lunes y jueves" /></label>
          </div>
          <div className="sp-admin__row">
            {edit.image_url && <img className="sp-promo-img" src={edit.image_url} alt="" />}
            <label className="btn btn--ghost sp-upload">{busy ? 'Subiendo…' : edit.image_url ? 'Cambiar foto' : 'Subir foto'}
              <input type="file" accept="image/*" hidden disabled={busy} onChange={(e) => void upload(e.target.files?.[0])} />
            </label>
            <label className="field sp-sort"><span>Orden</span><input type="number" min={0} max={99} value={edit.sort} onChange={(e) => setEdit({ ...edit, sort: Number(e.target.value) || 0 })} /></label>
            <label className="sp-check"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Visible</label>
          </div>
          <div className="sp-actions">
            <button className="btn btn--primary" disabled={busy || edit.title.trim().length < 3} onClick={() => save(edit)}>Guardar</button>
            <button className="btn btn--ghost" disabled={busy} onClick={() => setEdit(null)}>Cancelar</button>
          </div>
        </div>
      )}
      {list === null ? <p className="muted">Cargando…</p> : list.length === 0 ? <p className="muted">Aún no hay promociones.</p> : (
        <ul className="sp-promos">
          {list.map((p) => (
            <li key={p.id} className={p.active ? '' : 'sp-promo--off'}>
              {p.image_url ? <img className="sp-promo-img" src={p.image_url} alt="" /> : <span className="sp-promo-img sp-promo-img--empty" />}
              <div><b>{p.title}</b><small>{p.subtitle}{p.active ? '' : ' · oculta'}</small></div>
              <button className="chip" onClick={() => setEdit({ id: p.id, title: p.title, subtitle: p.subtitle ?? '', image_url: p.image_url, sort: p.sort, active: p.active })}>Editar</button>
              <button className="chip" disabled={busy} onClick={() => save({ id: p.id, title: p.title, subtitle: p.subtitle ?? '', image_url: p.image_url, sort: p.sort, active: !p.active })}>{p.active ? 'Ocultar' : 'Mostrar'}</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
