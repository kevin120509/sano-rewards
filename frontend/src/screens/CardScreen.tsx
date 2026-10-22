import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarIcon, CodeIcon, Cup, JourneyCard, SanoLogo } from '../components/Journey';
import { RewardModal } from '../components/RewardModal';
import { BRAND } from '../config/brand';
import { firstName, formatLongDate, formatTime } from '../domain/card';
import { COUPON_INFO, couponBadge, couponState, DEFAULT_RULES, fmtLocalDate, lastValidDay } from '../domain/coupons';
import type { CardView, Coupon, CouponKind, RewardReady } from '../domain/types';
import { useApp } from '../lib/app-context';
import { loadSeen, saveSeen } from '../lib/seen';

const POLL_MS = 20_000;      // mientras la tarjeta está abierta, revisa si ya se registró la compra
const FIRST_TIME_MS = 6 * 3600_000; // en un dispositivo nuevo, se anima el sello de las últimas 6 h

export function CardScreen() {
  const { card, refresh } = useApp();
  const [fresh, setFresh] = useState<number[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<RewardReady | null>(null);
  const [showCode, setShowCode] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const on = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', on);
    const id = window.setInterval(on, POLL_MS);
    return () => { document.removeEventListener('visibilitychange', on); window.clearInterval(id); };
  }, [refresh]);

  // Sellos nuevos desde la última vez que este dispositivo vio la tarjeta → animación + aviso; bebida lista → aviso al centro.
  useEffect(() => {
    if (!card) return;
    const seen = loadSeen(card.code);
    const since = seen.lastAt ? Date.parse(seen.lastAt) : Date.now() - FIRST_TIME_MS;
    const nuevas = card.recent_visits.filter((v) => Date.parse(v) > since);
    const cardVisits = card.card_visits ?? [];
    if (nuevas.length) {
      setFresh(cardVisits.map((v, i) => (Date.parse(v) > since ? i + 1 : 0)).filter(Boolean));
      const v = nuevas[0];
      setToast(`¡Se registró tu sello! ${formatLongDate(v)} a las ${formatTime(v)}`);
      timers.current.push(window.setTimeout(() => setFresh([]), 2600), window.setTimeout(() => setToast(null), 5200));
    }
    if (card.recent_visits[0] && (!seen.lastAt || Date.parse(card.recent_visits[0]) > Date.parse(seen.lastAt))) saveSeen(card.code, { lastAt: card.recent_visits[0] });
    const pending = card.rewards_ready.find((r) => !seen.rewards.includes(r.card_id));
    if (pending) timers.current.push(window.setTimeout(() => setModal(pending), nuevas.length ? 1700 : 400));
  }, [card]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const closeModal = () => {
    if (card && modal) saveSeen(card.code, { rewards: [...loadSeen(card.code).rewards, modal.card_id] });
    setModal(null);
  };

  if (!card) return null;
  const rules = card.rules ?? DEFAULT_RULES;
  const complete = card.journey_status === 'complete';
  const coupons = card.coupons ?? [];
  const drink = coupons.find((c) => c.kind === 'drink' && c.status === 'available');
  const subtitle = complete && drink
    ? `${couponState(drink) === 'soon' ? `Canjéala desde el ${fmtLocalDate(drink.valid_from)}` : 'Ya puedes canjearla'} · vence el ${lastValidDay(drink.expires_at)}`
    : undefined;

  return (
    <div className="sano">
      <img className="sano__leaves" src="/logo-hojas.svg" alt="" aria-hidden="true" />
      <header className="sano__head">
        <SanoLogo height={34} />
        <p className="sano__tag">Tu tarjeta de lealtad</p>
        <h1 className="sano__hello"><span>Hola,</span> {firstName(card.full_name)}</h1>
      </header>

      <div className="sano__cols">
        <div className="sano__main">
          <JourneyCard stamps={card.visits_count} goal={card.visits_goal || rules.goal} complete={complete}
                       dates={card.card_visits} fresh={fresh} subtitle={subtitle}
                       title={complete ? '¡Tu bebida va por nosotros!' : undefined} />
          <button type="button" className="sano__codebtn" onClick={() => setShowCode(true)}>
            <CodeIcon /> Mostrar mi código
          </button>
        </div>

        <div className="sano__side">
          <Benefits coupons={coupons} usedToday={!!card.coupon_redeemed_today} rules={rules} />
          <Promotions card={card} />
          <nav className="sano__links">
            <Link to="/condiciones">Cómo ganar beneficios y condiciones</Link>
            <a href={`https://instagram.com/${BRAND.handle.replace('@', '')}`} target="_blank" rel="noreferrer">{BRAND.handle}</a>
          </nav>
        </div>
      </div>

      {showCode && <CodeSheet card={card} onClose={() => setShowCode(false)} />}
      {toast && <div className="vtoast" role="status"><span aria-hidden="true">✓</span> {toast}</div>}
      {modal && <RewardModal rewardName="tu bebida gratis" code={card.code} onClose={closeModal} />}
    </div>
  );
}

function CouponArt({ kind }: { kind: CouponKind }) {
  return (
    <span className={`bart bart--${kind}`} aria-hidden="true">
      {kind === 'bakery' ? (
        <svg viewBox="0 0 48 48" width="40" height="40"><circle cx="24" cy="24" r="17" fill="#C98B4E" /><g fill="#4A2C17"><circle cx="17" cy="19" r="2.6" /><circle cx="28" cy="16" r="2.2" /><circle cx="30" cy="27" r="2.7" /><circle cx="20" cy="30" r="2.3" /><circle cx="24" cy="23" r="1.8" /></g></svg>
      ) : kind === 'coldfoam' ? (
        <svg viewBox="0 0 48 48" width="40" height="40"><path d="M13 14h22l-2.5 28a3 3 0 0 1-3 2.7H18.5a3 3 0 0 1-3-2.7z" fill="#B57A45" /><path d="M13 14h22l-.9 9H13.9z" fill="#F6F0E6" /><ellipse cx="24" cy="13" rx="12" ry="4" fill="#FFFBF4" /></svg>
      ) : <Cup size={38} />}
    </span>
  );
}

/** "Tus beneficios": cupones vigentes con su fecha exacta de vencimiento (y los recién usados). */
function Benefits({ coupons, usedToday, rules }: { coupons: Coupon[]; usedToday: boolean; rules: CardView['rules'] & object }) {
  const list = coupons.filter((c) => c.status === 'available' || (c.status === 'redeemed' && c.redeemed_at && Date.now() - Date.parse(c.redeemed_at) < 3 * 864e5));
  return (
    <section className="benefits" aria-labelledby="benefits-h">
      <h2 id="benefits-h" className="sano__h2">Tus beneficios</h2>
      {list.length === 0 ? (
        <p className="benefits__empty">
          Aún no tienes cupones. Si la compra de tu primer sello es de <b>${rules.bakery_min}</b> o más te regalamos <b>panadería</b>,
          y con una compra de <b>${rules.coldfoam_min}</b> o más, un <b>cold foam</b>.
        </p>
      ) : (
        <ul className="benefits__list">
          {list.map((c) => {
            const st = couponState(c);
            return (
              <li key={c.id} className={`bitem bitem--${st}`}>
                <CouponArt kind={c.kind} />
                <div className="bitem__body">
                  <b>{COUPON_INFO[c.kind].title}</b>
                  <span className="bitem__date"><CalendarIcon />
                    {st === 'redeemed' && c.redeemed_at ? `Canjeado el ${new Date(c.redeemed_at).toLocaleDateString('es-MX', { timeZone: 'America/Merida', day: 'numeric', month: 'short' })}` : `Vence el ${lastValidDay(c.expires_at)}`}
                  </span>
                </div>
                <span className={`bitem__pill bitem__pill--${st}`}>{couponBadge(c)}</span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="benefits__rule">Un cupón por día</p>
      {usedToday && list.some((c) => c.status === 'available') && <p className="benefits__note">Hoy ya usaste un cupón; los demás siguen disponibles hasta su fecha.</p>}
    </section>
  );
}

/** "Promociones del mes": publicidad que sube la dueña desde su panel. Siempre visible. */
function Promotions({ card }: { card: CardView }) {
  const promos = card.promotions ?? [];
  return (
    <section className="promos" aria-labelledby="promos-h">
      <h2 id="promos-h" className="sano__h2">Promociones del mes</h2>
      {promos.length === 0 ? <p className="promos__empty">Muy pronto verás aquí las promociones del mes.</p> : (
        <ul className="promos__list">
          {promos.map((p) => (
            <li key={p.id} className="promo">
              {p.image_url ? <img className="promo__img" src={p.image_url} alt="" loading="lazy" /> : <span className="promo__img promo__img--empty" aria-hidden="true"><Cup size={34} /></span>}
              <div className="promo__body">
                <b>{p.title}</b>
                {p.subtitle && <span className="bitem__date"><CalendarIcon /> {p.subtitle}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** "Mostrar mi código": código grande + datos para que el mesero lo escriba en la nota de Loyverse. */
function CodeSheet({ card, onClose }: { card: CardView; onClose(): void }) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    btn.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  const complete = card.journey_status === 'complete';
  return (
    <div className="codesheet" role="dialog" aria-modal="true" aria-labelledby="codesheet-code" onClick={onClose}>
      <div className="codesheet__box" onClick={(e) => e.stopPropagation()}>
        <p className="codesheet__stamps"><Cup size={30} /> {complete ? 'Tarjeta completa · bebida gratis' : `${card.visits_count} de ${card.visits_goal} sellos`}</p>
        <p className="codesheet__label">Tu código</p>
        <p id="codesheet-code" className="codesheet__code">{card.code}</p>
        <p className="codesheet__hint">Díctalo al mesero al pagar para que se registre tu sello.</p>
        <dl className="codesheet__data">
          <dd>{card.full_name}</dd>
          {card.phone && <dd>{card.phone.replace(/^\+52/, '').replace(/(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3')}</dd>}
          {card.email && <dd>{card.email}</dd>}
        </dl>
        <button ref={btn} type="button" className="btn btn--primary btn--block" onClick={onClose}>Listo</button>
      </div>
    </div>
  );
}
