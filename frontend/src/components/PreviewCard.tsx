import type { GroupInfo } from '../domain/types';
import { JourneyPreview } from './Journey';

/** Tarjeta de muestra que se va sellando sola (bienvenida y QR). */
export function PreviewCard(_props: { group?: Pick<GroupInfo, 'name' | 'prefix' | 'theme'> | null; goal?: number }) {
  return <JourneyPreview />;
}
