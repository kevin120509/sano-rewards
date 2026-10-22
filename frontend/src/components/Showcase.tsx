import type { GroupInfo } from '../domain/types';
import { JourneyPreview } from './Journey';

/** Panel lateral en compu: tarjeta de muestra animada + mensaje. */
export function Showcase(_props: { group?: Pick<GroupInfo, 'name' | 'prefix' | 'theme'> | null }) {
  return (
    <div className="showcase">
      <p className="showcase__eyebrow">Así se ve tu tarjeta</p>
      <h2 className="showcase__title">7 sellos y tu bebida va por nosotros</h2>
      <div className="showcase__card"><JourneyPreview /></div>
      <p className="showcase__note">Un sello por día con compras de $65 o más. Tus sellos no vencen.</p>
    </div>
  );
}
