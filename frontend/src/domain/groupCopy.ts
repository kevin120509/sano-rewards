import type { ThemeKey } from './types';

/** Textos de la bienvenida de cada grupo (lo que ve quien escanea el QR de registro). */
export interface GroupCopy { eyebrow: string; title: string; highlight: string; perks: string[]; cta: string }

export const GROUP_COPY: Record<ThemeKey, GroupCopy> = {
  classic: {
    eyebrow: 'Programa Cliente Consentido',
    title: 'Regístrate y conviértete en',
    highlight: 'Cliente Consentido',
    perks: ['1 sello por compra de $65 o más (1 al día)', '7 sellos y tu 8.ª bebida va por nosotros', 'Cupones extra de panadería y cold foam'],
    cta: 'Crear mi tarjeta',
  },
  notebook: {
    eyebrow: 'Tarjeta para estudiantes',
    title: 'Estudia con buen café y',
    highlight: 'gana premios',
    perks: ['1 sello por compra de $65 o más (1 al día)', '7 sellos y tu 8.ª bebida va por nosotros', 'Cupones extra de panadería y cold foam'],
    cta: 'Crear mi tarjeta de estudiante',
  },
  sport: {
    eyebrow: 'Tarjeta GYM',
    title: 'Después del entreno,',
    highlight: 'recarga y gana',
    perks: ['1 sello por compra de $65 o más (1 al día)', '7 sellos y tu 8.ª bebida va por nosotros', 'Cupones extra de panadería y cold foam'],
    cta: 'Crear mi tarjeta GYM',
  },
  waves: {
    eyebrow: 'Beneficio para colaboradores',
    title: 'Un beneficio exclusivo para',
    highlight: 'el equipo',
    perks: ['1 sello por compra de $65 o más (1 al día)', '7 sellos y tu 8.ª bebida va por nosotros', 'Cupones extra de panadería y cold foam'],
    cta: 'Crear mi tarjeta',
  },
};
