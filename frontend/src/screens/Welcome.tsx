import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark, Page } from '../components/Layout';
import { PreviewCard } from '../components/PreviewCard';
import { Showcase } from '../components/Showcase';
import { GROUP_LINKS, SHOW_GROUP_LINKS } from '../config/brand';
import { useApp } from '../lib/app-context';

/** Inicio para quien NO tiene sesión. El registro nuevo solo llega por el QR físico del local (/r/<token>). */
export function Welcome() {
  const { setPreviewGroup } = useApp();
  useEffect(() => setPreviewGroup(null), [setPreviewGroup]);

  return (
    <Page showcase={<Showcase />}>
      <div className="hero">
        <BrandMark />
        <h1 className="hero__title">Tu tarjeta <em>Cliente Consentido</em></h1>
        <p className="lede">Suma <b>una visita por día</b>. En tu <b>visita 8</b>, te consentimos con un premio.</p>
        <div className="only-compact" aria-hidden="true"><PreviewCard /></div>
        <Link to="/entrar" className="btn btn--primary btn--block">Entrar a mi tarjeta</Link>
        <p className="muted center">¿Aún no tienes tarjeta? Escanea el QR que está en el local para crearla.</p>

        {SHOW_GROUP_LINKS && (
          <div className="demo-groups">
            <p className="muted center small">Registro por grupo (lo mismo que abre cada QR)</p>
            <div className="chips">
              {GROUP_LINKS.map((g) => <Link key={g.token} className="chip" to={`/r/${g.token}`}>{g.name}</Link>)}
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
