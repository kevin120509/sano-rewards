import { Link } from 'react-router-dom';
import { SanoLogo } from '../components/Journey';
import { BRAND } from '../config/brand';
import { DEFAULT_RULES } from '../domain/coupons';
import { useApp } from '../lib/app-context';

/** "Cómo ganar beneficios y condiciones" (texto del PDF de la dueña, 12-oct-2026). Pública. */
export function Conditions() {
  const { card, session } = useApp();
  const r = card?.rules ?? DEFAULT_RULES;
  const next = r.goal + 1;
  return (
    <div className="sano sano--page">
      <img className="sano__leaves" src="/logo-hojas.svg" alt="" aria-hidden="true" />
      <Link to={session ? '/tarjeta' : '/'} className="back">← Volver</Link>
      <header className="sano__head">
        <SanoLogo height={30} />
        <h1 className="sano__title">Cómo ganar beneficios y condiciones</h1>
        <p className="sano__tag">Una tarjeta digital gratuita por persona. Cada recorrido tiene {next} espacios: {r.goal} sellos y una bebida gratis en la {next}.ª visita.</p>
      </header>

      <article className="legal sano__legal">
        <h2>1. Sellos y bebida gratis</h2>
        <ul>
          <li>Una compra de <b>${r.stamp_min} o más</b> efectivamente pagados genera un sello.</li>
          <li>Máximo <b>un sello por persona al día</b>.</li>
          <li>Al completar {r.goal} sellos se genera el cupón de bebida.</li>
          <li>Se canjea en la {next}.ª visita, <b>desde el día siguiente</b>, sin compra adicional.</li>
          <li>Incluye una bebida de hasta $98. Si cuesta más, pagas la diferencia; los extras se cobran aparte. No genera cambio ni saldo a favor.</li>
          <li>El cupón dura <b>{r.drink_days} días</b> desde que se emite.</li>
        </ul>

        <h2>2. Galleta o panadería al iniciar cada recorrido</h2>
        <ul>
          <li>Si la compra que genera el primer sello del recorrido incluye <b>${r.bakery_min} o más</b> en productos a precio regular, se genera un cupón.</li>
          <li>Premio: una galleta de chispas o una pieza de panadería de la selección disponible.</li>
          <li>Se otorga una vez por recorrido. Si la primera compra no cumple el mínimo, ya no se obtiene en ese recorrido.</li>
          <li>Para canjearlo debes comprar una bebida a precio regular. Puedes usarlo en la misma compra que lo genera si ya incluye una bebida.</li>
          <li>Vigencia: <b>{r.bakery_days} días</b> desde su emisión.</li>
        </ul>

        <h2>3. Extra de cold foam</h2>
        <ul>
          <li>Una compra con <b>${r.coldfoam_min} o más</b> en productos a precio regular genera un cupón para una porción de cold foam gratis.</li>
          <li>Se otorga una vez por recorrido.</li>
          <li>Para canjearlo debes comprar una bebida participante a precio regular: americano frío, latte frío o latte frío de vainilla, caramelo o mocha. Puedes usarlo en la compra que lo genera si incluye una bebida participante.</li>
          <li>No incluye la bebida ni aplica como descuento en bebidas que ya llevan cold foam.</li>
          <li>Vigencia: <b>{r.coldfoam_days} días</b> desde su emisión.</li>
        </ul>

        <h2>4. Reglas comunes</h2>
        <ul>
          <li>Cada monto mínimo se cumple en un solo ticket; no se suman tickets.</li>
          <li>No cuentan propinas, envío ni cortesías.</li>
          <li>Una compra puede generar sello, panadería y cold foam si cumple las condiciones.</li>
          <li><b>Máximo un cupón canjeado por persona al día</b>; los demás quedan disponibles hasta su vencimiento.</li>
          <li>Canjear panadería o cold foam no borra sellos.</li>
          <li>Recoger únicamente una cortesía no genera sello. Si además pagas ${r.stamp_min} o más, sí puede generarlo.</li>
          <li>Cupones personales, de un solo uso y sin intercambio por efectivo.</li>
          <li>Si no hay producto disponible, el cupón permanece sin usar hasta su fecha de vencimiento.</li>
          <li>Aplica en cafetería y pedidos directos para recoger. Excluye plataformas de reparto, catering y eventos.</li>
          <li>Un ticket solo puede registrarse en una tarjeta.</li>
          <li>Las compras de paquetes o promociones sí pueden generar sello, pero su importe no cuenta para desbloquear panadería o cold foam.</li>
        </ul>

        <h2>5. Reinicio del recorrido</h2>
        <ul>
          <li><b>Los sellos no vencen.</b></li>
          <li>Mientras la bebida final esté pendiente de canje, el recorrido queda completo y no acumula nuevos sellos.</li>
          <li>Al canjear o vencer la bebida final, comienza otro recorrido en cero y se habilitan otra vez panadería y cold foam.</li>
          <li>Si al canjear la bebida pagas además ${r.stamp_min} o más, obtienes el primer sello del nuevo recorrido (y esa compra puede desbloquear los extras).</li>
          <li>Los cupones de panadería o cold foam pendientes conservan su vigencia original aunque comience otro recorrido.</li>
        </ul>
        <p className="muted">{BRAND.businessName} · {BRAND.address}</p>
      </article>
    </div>
  );
}
