import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CustomerPanel } from '../../components/CustomerPanel';
import { CustomerRow } from '../../components/CustomerRow';
import { api } from '../../data';
import type { AdminGroup, CustomerSummary } from '../../domain/staff';
import { errMsg } from '../../lib/staff-format';

/** Clientes (dueña): buscar, filtrar por grupo y administrar la ficha. */
export function AdminCustomers() {
  const [params, setParams] = useSearchParams();
  const group = params.get('grupo');
  const [q, setQ] = useState('');
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [list, setList] = useState<CustomerSummary[] | null>(null);
  const [sel, setSel] = useState<string | null>(params.get('cliente'));
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { api.adminListGroups().then(setGroups).catch((e) => setErr(errMsg(e))); }, []);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      try { const r = await api.adminListCustomers(q.trim(), group); if (alive) { setList(r); setErr(null); } }
      catch (e) { if (alive) setErr(errMsg(e)); }
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [q, group]);

  const setGroup = (g: string) => { const p = new URLSearchParams(params); if (g) p.set('grupo', g); else p.delete('grupo'); setParams(p, { replace: true }); };
  const updateRow = (c: CustomerSummary) => setList((l) => {
    if (!l) return l;
    // Si cambió de grupo y hay filtro, sale de la lista filtrada.
    if (group && c.group.id !== group) return l.filter((x) => x.id !== c.id);
    return l.map((x) => (x.id === c.id ? c : x));
  });

  return (
    <div className={`sp-split ${sel ? 'sp-split--open' : ''}`}>
      <section className="sp-list">
        <h1 className="sp-title">Clientes</h1>
        <div className="sp-filters">
          <input className="sp-search__input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, correo, código o teléfono" autoComplete="off" />
          <select value={group ?? ''} onChange={(e) => setGroup(e.target.value)} aria-label="Grupo">
            <option value="">Todos los grupos</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        {err && <p className="note note--error" role="alert">{err}</p>}
        {list === null ? <p className="muted">Cargando…</p> : list.length === 0 ? <p className="muted">No hay clientes con ese filtro.</p> : (
          <>
            <p className="muted sp-small">{list.length === 100 ? 'Mostrando los 100 más recientes. Busca para afinar.' : `${list.length} cliente${list.length === 1 ? '' : 's'}`}</p>
            <div className="sp-rows">{list.map((c) => <CustomerRow key={c.id} c={c} active={c.id === sel} onSelect={() => setSel(c.id)} />)}</div>
          </>
        )}
      </section>
      <div className="sp-side">
        {sel ? <CustomerPanel id={sel} admin groups={groups} onChanged={updateRow} onClose={() => setSel(null)} />
          : <div className="sp-empty"><p>Elige un cliente para ver su ficha.</p></div>}
      </div>
    </div>
  );
}
