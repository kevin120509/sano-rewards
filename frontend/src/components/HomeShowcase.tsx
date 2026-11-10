import type { CSSProperties } from 'react';
import { PALETTES } from '../domain/themes';
import { LoyaltyCard } from './LoyaltyCard';

/** Vitrina verde exclusiva de la bienvenida; las pantallas QR conservan su Showcase actual. */
export function HomeCardPreview() {
  return (
    <div className="home-card-preview" style={PALETTES.classic as CSSProperties}>
      <LoyaltyCard
        theme="classic"
        interactive={false}
        stampGoal={8}
        subtitle={<>Registra tu visita y en la <b>8.ª</b> tu bebida va por nosotros</>}
        finePrint="Los sellos no vencen · 1 sello por día · Personal e intransferible"
        data={{ code: 'C-0000', fullName: 'Tu nombre aquí', groupName: 'Cliente Consentido', isDefaultGroup: true, premium: false,
          visits: 0, goal: 7, periodEndsAt: '', rewardName: 'bebida', rewardReady: true }}
      />
    </div>
  );
}

export function HomeShowcase() {
  return (
    <div className="home-showcase">
      <p className="home-showcase__eyebrow">Así se ve tu tarjeta</p>
      <h2 className="home-showcase__title">7 sellos y tu bebida va por nosotros</h2>
      <HomeCardPreview />
      <p className="home-showcase__note">Un sello por día con compras de $65 o más. Tus sellos no vencen.</p>
    </div>
  );
}
