import { useEffect, useRef } from 'react';
import { Drink } from './Icons';

interface Props { rewardName: string; code: string; onClose: () => void }

/** Aviso en medio de la pantalla: el cliente completó su tarjeta y canjea en su siguiente visita. */
export function RewardModal({ rewardName, code, onClose }: Props) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    btn.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div className="rmodal" role="dialog" aria-modal="true" aria-labelledby="rmodal-title" onClick={onClose}>
      <div className="rmodal__box" onClick={(e) => e.stopPropagation()}>
        <div className="rmodal__confetti" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ ['--i' as string]: i }} />)}</div>
        <div className="rmodal__icon" aria-hidden="true"><Drink size={46} /></div>
        <p className="rmodal__eyebrow">¡Juntaste tus 7 sellos!</p>
        <h2 id="rmodal-title" className="rmodal__title">Ya puedes canjear <span>{rewardName}</span></h2>
        <p className="rmodal__text">Pídela <b>desde mañana</b> en tu siguiente visita: dile al mesero tu código <b className="rmodal__code">{code}</b>. Tienes 30 días para canjearla.</p>
        <button ref={btn} type="button" className="btn btn--primary btn--block" onClick={onClose}>¡Entendido!</button>
      </div>
    </div>
  );
}
