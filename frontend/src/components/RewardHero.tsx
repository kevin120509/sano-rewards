import { motivation } from '../domain/card';
import { Drink, Sparkle } from './Icons';

interface Props {
  rewardName: string;
  visits: number;
  goal: number;
  readyCount: number;
}

/** El premio en grande, decorado como cupón de regalo. Dos estados: en camino y listo. */
export function RewardHero({ rewardName, visits, goal, readyCount }: Props) {
  const remaining = Math.max(0, goal - visits);
  const ready = readyCount > 0;
  const pct = Math.min(1, visits / Math.max(1, goal));
  const R = 52, C = 2 * Math.PI * R;

  return (
    <section className={`reward-hero ${ready ? 'reward-hero--ready' : ''}`} aria-live="polite">
      <span className="reward-hero__ribbon" aria-hidden="true" />
      <span className="reward-hero__spark s1" aria-hidden="true"><Sparkle size={16} /></span>
      <span className="reward-hero__spark s2" aria-hidden="true"><Sparkle size={11} /></span>
      <span className="reward-hero__spark s3" aria-hidden="true"><Sparkle size={14} /></span>
      {ready && <span className="confetti" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} />)}</span>}

      <p className="reward-hero__eyebrow">{ready ? '¡Tu premio está listo!' : 'Tu recompensa por visitarnos'}</p>

      <div className="reward-hero__body">
        <div className="reward-hero__visual">
          {ready ? (
            <span className="reward-hero__drink"><Drink size={76} /></span>
          ) : (
            <svg className="ring" viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r={R} className="ring__track" />
              <circle cx="60" cy="60" r={R} className="ring__bar" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
            </svg>
          )}
          {!ready && <span className="reward-hero__left"><b>{remaining}</b><small>{remaining === 1 ? 'visita' : 'visitas'}</small></span>}
        </div>
        <div className="reward-hero__text">
          <h2 className="reward-hero__name">{rewardName}</h2>
          {ready ? (
            <p>{readyCount > 1 ? `Tienes ${readyCount} premios. ` : ''}Pídelo en caja en tu próxima visita: el mesero lo aplica a tu cuenta.</p>
          ) : (
            <p><b>{motivation(remaining)}</b> Te {remaining === 1 ? 'falta' : 'faltan'} {remaining} de {goal} visitas.</p>
          )}
        </div>
      </div>
    </section>
  );
}
