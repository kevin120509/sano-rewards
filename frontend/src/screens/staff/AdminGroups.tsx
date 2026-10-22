import { useEffect, useState } from 'react';
import { api } from '../../data';
import { CUSTOMER_SKIN } from '../../domain/themes';
import { THEME_LABELS, type AdminGroup, type Discount, type GroupInput } from '../../domain/staff';
import type { ThemeKey } from '../../domain/types';
import { downloadPoster, groupUrl, qrDataUrl } from '../../lib/qr-poster';
import { errMsg } from '../../lib/staff-format';

const THEME_COLOR: Record<ThemeKey, string> = { classic: '#2F7A22', sport: '#111411', notebook: '#D9620F', waves: '#174F8C' };
const empty: GroupInput = { id: null, name: '', prefix: '', theme: 'classic', benefit: '', welcome: '', discount_id: '', reward_text: '', active: true };

/** Grupos / convenios (dueña): crear, editar, premio de Loyverse y QR para imprimir. */
export function AdminGroups() {
  const [groups, setGroups] = useState<AdminGroup[] | null>(null);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [edit, setEdit] = useState<GroupInput | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    try { const [g, d] = await Promise.all([api.adminListGroups(), api.adminListDiscounts()]); setGroups(g); setDiscounts(d); }
    catch (e) { setErr(errMsg(e)); }
  };
  useEffect(() => { void load(); }, []);

  const startEdit = (g: AdminGroup) => {
    setMsg(null);
    setEdit({ id: g.id, name: g.name, prefix: g.prefix, theme: g.theme ?? 'classic', benefit: g.benefit ?? '', welcome: g.welcome_message ?? '',
      discount_id: g.reward?.discount_id ?? '', reward_text: g.reward?.description ?? '', active: g.active });
  };

  const saved = async (g: AdminGroup, isNew: boolean) => {
    setEdit(null); setMsg(isNew ? `Grupo “${g.name}” creado. Ya puedes descargar su QR.` : `Grupo “${g.name}” guardado.`);
    await load();
  };

  return (
    <div className="sp-page">
      <div className="sp-titlebar">
        <h1 className="sp-title">Grupos y convenios</h1>
        {!edit && <button className="btn btn--primary" onClick={() => { setMsg(null); setEdit({ ...empty }); }}>+ Nuevo grupo</button>}
      </div>
      <p className="muted sp-small">Cada grupo tiene su propio QR y su letra en el código. Por ahora todos los grupos tienen las mismas reglas y el mismo diseño de tarjeta; los beneficios especiales de cada convenio se definirán después.</p>
      {err && <p className="note note--error" role="alert">{err}</p>}
      {msg && <p className="note sp-note-ok" role="status">{msg}</p>}
      {edit && <GroupForm value={edit} discounts={discounts} groups={groups ?? []} onCancel={() => setEdit(null)} onSaved={saved} />}
      {groups === null ? <p className="muted">Cargando grupos…</p> : (
        <div className="sp-groups">
          {groups.map((g) => <GroupCard key={g.id} g={g} onEdit={() => startEdit(g)} onToken={load} />)}
        </div>
      )}
    </div>
  );
}

function GroupCard({ g, onEdit, onToken }: { g: AdminGroup; onEdit(): void; onToken(): void }) {
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const color = THEME_COLOR[g.theme ?? 'classic'];
  useEffect(() => { void qrDataUrl(groupUrl(g.registration_token), 240).then(setQr); }, [g.registration_token]);

  const download = async () => { setErr(null); try { await downloadPoster(g.name, g.registration_token, color); } catch (e) { setErr(errMsg(e)); } };
  const newToken = async () => {
    setBusy(true); setErr(null);
    try { await api.adminNewGroupToken(g.id); setConfirmNew(false); onToken(); } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <article className={`sp-card sp-group ${g.active ? '' : 'sp-group--off'}`} style={{ borderTopColor: color }}>
      <header className="sp-group__head">
        <span className="sp-group__letter" style={{ background: color }}>{g.prefix}</span>
        <div>
          <h3>{g.name}</h3>
          <p className="muted sp-small">{THEME_LABELS[g.theme ?? 'classic']} · {g.customers} cliente{g.customers === 1 ? '' : 's'}{g.is_default ? ' · General' : ''}{g.active ? '' : ' · Pausado'}</p>
        </div>
      </header>
      <dl className="sp-group__kv">
        <div><dt>Beneficio en caja</dt><dd>{g.benefit || <span className="muted">—</span>}</dd></div>
        <div><dt>Mensaje</dt><dd>{g.welcome_message || <span className="muted">—</span>}</dd></div>
      </dl>
      <div className="sp-group__qr">
        {qr && <img src={qr} alt={`QR del grupo ${g.name}`} width={120} height={120} />}
        <div className="stack">
          <button className="btn btn--primary" onClick={download} disabled={!g.active}>Descargar QR</button>
          <button className="btn btn--ghost" onClick={onEdit}>Editar</button>
        </div>
      </div>
      {confirmNew ? (
        <div className="sp-confirm">
          <span>El QR actual de “{g.name}” dejará de funcionar y habrá que imprimir el nuevo. ¿Seguir?</span>
          <button className="chip sp-chip-danger" disabled={busy} onClick={newToken}>Sí, generar nuevo</button>
          <button className="chip" disabled={busy} onClick={() => setConfirmNew(false)}>Cancelar</button>
        </div>
      ) : (
        <button className="sp-link-danger sp-small" onClick={() => setConfirmNew(true)}>Generar un QR nuevo (anula el actual)</button>
      )}
      {err && <p className="note note--error" role="alert">{err}</p>}
    </article>
  );
}

function GroupForm({ value, groups, onCancel, onSaved }: {
  value: GroupInput; discounts: Discount[]; groups: AdminGroup[]; onCancel(): void; onSaved(g: AdminGroup, isNew: boolean): void;
}) {
  const [f, setF] = useState<GroupInput>(value);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof GroupInput>(k: K, v: GroupInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const current = groups.find((g) => g.id === f.id);
  const letterLocked = !!current && current.customers > 0;
  const usedLetters = groups.filter((g) => g.id !== f.id).map((g) => g.prefix);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    if (f.name.trim().length < 2) { setErr('Escribe el nombre del grupo.'); return; }
    if (!/^[A-Za-z]$/.test(f.prefix.trim())) { setErr('La letra debe ser una sola letra (A-Z).'); return; }
    if (usedLetters.includes(f.prefix.trim().toUpperCase())) { setErr('Esa letra ya la usa otro grupo.'); return; }
    setBusy(true);
    try { onSaved(await api.adminSaveGroup({ ...f, prefix: f.prefix.trim().toUpperCase() }), f.id === null); }
    catch (ex) { setErr(errMsg(ex)); }
    finally { setBusy(false); }
  };

  return (
    <form className="sp-card sp-form" onSubmit={submit}>
      <h2 className="sp-h2">{f.id ? `Editar “${value.name}”` : 'Nuevo grupo'}</h2>
      <div className="sp-form__grid">
        <label className="field"><span>Nombre</span><input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej. Gimnasio Fit" maxLength={40} /></label>
        <label className="field"><span>Letra del código</span>
          <input value={f.prefix} onChange={(e) => set('prefix', e.target.value.slice(-1).toUpperCase())} maxLength={1} disabled={letterLocked} placeholder="Ej. F" />
          <small className="muted">{letterLocked ? 'No se cambia porque ya hay clientes con esta letra.' : `Ya usadas: ${usedLetters.join(', ') || '—'}`}</small>
        </label>
      </div>
      {CUSTOMER_SKIN === 'sano' ? (
        <p className="muted">Todas las tarjetas usan el diseño Sano.</p>
      ) : (
        <fieldset className="sp-themes">
          <legend>Diseño de la tarjeta</legend>
          {(Object.keys(THEME_LABELS) as ThemeKey[]).map((t) => (
            <label key={t} className={`sp-theme ${f.theme === t ? 'sp-theme--on' : ''}`}>
              <input type="radio" name="theme" checked={f.theme === t} onChange={() => set('theme', t)} />
              <span className="sp-theme__swatch" style={{ background: THEME_COLOR[t] }} />
              <span>{THEME_LABELS[t]}</span>
            </label>
          ))}
        </fieldset>
      )}
      <label className="field"><span>Beneficio que ve la caja</span><input value={f.benefit} onChange={(e) => set('benefit', e.target.value)} placeholder="Ej. 10% en bebidas presentando credencial" maxLength={120} /></label>
      <label className="field"><span>Mensaje de bienvenida</span><textarea rows={2} value={f.welcome} onChange={(e) => set('welcome', e.target.value)} placeholder="Lo ve el cliente al escanear el QR" maxLength={200} /></label>
      {!current?.is_default && (
        <label className="sp-check"><input type="checkbox" checked={f.active} onChange={(e) => set('active', e.target.checked)} /> Activo (si lo pausas, su QR deja de registrar clientes nuevos)</label>
      )}
      {err && <p className="note note--error" role="alert">{err}</p>}
      <div className="sp-actions">
        <button className="btn btn--primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
