import { Link } from 'react-router-dom';
import { BrandMark, Page } from '../components/Layout';
import { BRAND } from '../config/brand';

/** Aviso de privacidad público (lo pide Google para publicar el inicio de sesión).
 *  BORRADOR: revisar con el negocio antes de producción (datos del responsable marcados [PENDIENTE]). */
export function Privacy() {
  return (
    <Page back={<Link to="/" className="back">← Volver</Link>}>
      <div className="hero hero--tight legal">
        <BrandMark small />
        <h1 className="h2">Aviso de privacidad</h1>
        <p className="muted small">Sano Rewards · programa de lealtad de Sano Bistro Café</p>
        <h2 className="h3">Qué datos usamos</h2>
        <p>Tu nombre, correo electrónico y número de teléfono, y el registro de tus visitas al local (fecha y ticket de compra).
          Si entras con Google, solo recibimos tu nombre, correo y foto de perfil; no accedemos a tus contactos, archivos ni a nada más de tu cuenta.</p>
        <h2 className="h3">Para qué</h2>
        <p>Únicamente para identificar tu tarjeta de lealtad, contar tus visitas, entregarte tus premios y enviarte el código de acceso por correo.
          No vendemos ni compartimos tus datos con terceros con fines comerciales.</p>
        <h2 className="h3">Tus derechos</h2>
        <p>Puedes pedir ver, corregir o borrar tus datos y tu tarjeta escribiendo a <a href="mailto:sanobistrocafe@gmail.com">sanobistrocafe@gmail.com</a>.</p>
        <h2 className="h3">Responsable</h2>
        <p>Sano Bistro Café. Domicilio: {BRAND.address} (<a href={BRAND.mapsUrl} target="_blank" rel="noreferrer">ver en Google Maps</a>). Última actualización: octubre de 2026.</p>
      </div>
    </Page>
  );
}
