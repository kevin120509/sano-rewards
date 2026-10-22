import { useEffect, useRef, useState } from 'react';
import { CustomerPanel } from '../../components/CustomerPanel';
import { CustomerRow } from '../../components/CustomerRow';
import { api } from '../../data';
import type { CustomerSummary } from '../../domain/staff';
import { errMsg } from '../../lib/staff-format';

/** Mostrador del mesero/caja: buscar al cliente, ver si ya vino hoy, +1 sello o canjear premio. */
export function Mostrador() {
  const [q, setQ] = useState('');
  const [list, setList] = useState<CustomerSummary[] | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { input.current?.focus(); }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setList(null); setErr(null); return; }
    let alive = true;
    const t = setTimeout(async () => {
      setLoading(true);
      try { const r = await api.staffSearch(term); if (alive) { setList(r); setErr(null); } }
      catch (e) { if (alive) setErr(errMsg(e)); }
      finally { if (alive) setLoading(false); }
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  const updateRow = (c: CustomerSummary) => setList((l) => l?.map((x) => (x.id === c.id ? c : x)) ?? l);

  return (
    <div className={`sp-split ${sel ? 'sp-split--open' : ''}`}>
      <section className="sp-list">
        <h1 className="sp-title">Mostrador</h1>
        <label className="sp-search">
          <span className="sr-only">Buscar cliente</span>
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Código (C-1234), nombre o teléfono" autoComplete="off" inputMode="search" />
        </label>
        {err && <p className="note note--error" role="alert">{err}</p>}
        {list === null ? (
          <p className="muted sp-small">Escribe al menos 2 letras. Para el código basta con los 4 números.</p>
        ) : list.length === 0 ? (
          <p className="muted">{loading ? 'Buscando…' : 'No se encontró a nadie con eso.'}</p>
        ) : (
          <div className="sp-rows">{list.map((c) => <CustomerRow key={c.id} c={c} active={c.id === sel} onSelect={() => setSel(c.id)} />)}</div>
        )}
      </section>
      <div className="sp-side">
        {sel ? <CustomerPanel id={sel} onChanged={updateRow} onClose={() => setSel(null)} />
          : <div className="sp-empty"><p>Busca a un cliente para ver su tarjeta.</p></div>}
      </div>
    </div>
  );
}
