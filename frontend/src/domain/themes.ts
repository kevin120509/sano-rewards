import type { CardView, GroupInfo, ThemeKey } from './types';
import { isPremium, resolveTheme } from './card';

/** Variables CSS por diseño de grupo. El Premium es una piel dorada sobre el mismo diseño. */
const PALETTES: Record<ThemeKey, Record<string, string>> = {
  classic:  { '--card-paper': '#FFFFFF', '--card-paper-ink': '#151515', '--card-brand': '#121212', '--card-leaf': '#46A834', '--card-band': 'linear-gradient(135deg, #63C14A 0%, #43A62F 48%, #2F7A22 100%)', '--card-band-ink': '#FFFFFF', '--card-hole': '#F3F6F0', '--card-hole-ink': '#9DB596', '--card-ink': '#1E5A17', '--card-field': '#43A62F', '--bg': '#FFF9EE', '--surface': '#FFFFFF', '--ink': '#1F2A1C', '--muted': '#6B7466', '--primary': '#2F7A22', '--on-primary': '#FFFFFF', '--accent': '#8DBF4F', '--line': '#E7E0CF', '--font-display': "'Fraunces', Georgia, serif", '--font-body': "'Outfit', Arial, sans-serif", '--radius': '22px', '--display-transform': 'none', '--display-weight': '700' },
  sport:    { '--card-paper': '#1B201B', '--card-paper-ink': '#F2F5EC', '--card-brand': '#F2F5EC', '--card-leaf': '#C6F432', '--card-band': 'linear-gradient(135deg, #DDFF5C 0%, #C6F432 50%, #A6D11A 100%)', '--card-band-ink': '#111411', '--card-hole': '#151915', '--card-hole-ink': '#55604F', '--card-ink': '#C6F432', '--card-field': '#C6F432', '--bg': '#111411', '--surface': '#1B201B', '--ink': '#F2F5EC', '--muted': '#9AA495', '--primary': '#C6F432', '--on-primary': '#111411', '--accent': '#C6F432', '--line': '#2B322B', '--font-display': "'Barlow Condensed', Arial Narrow, sans-serif", '--font-body': "'Outfit', Arial, sans-serif", '--radius': '10px', '--display-transform': 'uppercase', '--display-weight': '700' },
  notebook: { '--card-paper': '#FFFDF6', '--card-paper-ink': '#3A2A1C', '--card-brand': '#3A2A1C', '--card-leaf': '#D9620F', '--card-band': 'linear-gradient(135deg, #F5A05A 0%, #E7792A 50%, #D9620F 100%)', '--card-band-ink': '#FFFFFF', '--card-hole': '#FFF6E8', '--card-hole-ink': '#D8B48C', '--card-ink': '#A8410A', '--card-field': '#D9620F', '--bg': '#FFF9EE', '--surface': '#FFFFFF', '--ink': '#3A2A1C', '--muted': '#8A7560', '--primary': '#D9620F', '--on-primary': '#FFFFFF', '--accent': '#F2A154', '--line': '#E8D9BE', '--font-display': "'Patrick Hand', 'Comic Sans MS', cursive", '--font-body': "'Patrick Hand', 'Comic Sans MS', cursive", '--radius': '14px', '--display-transform': 'none', '--display-weight': '400' },
  waves:    { '--card-paper': '#FFFFFF', '--card-paper-ink': '#0F2C4A', '--card-brand': '#0F2C4A', '--card-leaf': '#4FA3E0', '--card-band': 'linear-gradient(135deg, #4FA3E0 0%, #2A78C2 45%, #174F8C 100%)', '--card-band-ink': '#FFFFFF', '--card-hole': '#EEF5FC', '--card-hole-ink': '#9AB7D3', '--card-ink': '#174F8C', '--card-field': '#2A78C2', '--bg': '#EEF4FB', '--surface': '#FFFFFF', '--ink': '#0F2C4A', '--muted': '#5C7690', '--primary': '#174F8C', '--on-primary': '#FFFFFF', '--accent': '#4FA3E0', '--line': '#D3E1F0', '--font-display': "'Outfit', Arial, sans-serif", '--font-body': "'Outfit', Arial, sans-serif", '--radius': '26px', '--display-transform': 'none', '--display-weight': '600' },
};

const PREMIUM_SKIN: Record<string, string> = {
  '--card-paper': '#161514', '--card-paper-ink': '#F3E6C0', '--card-brand': '#E9CF85', '--card-leaf': '#D9B65F',
  '--card-band': 'linear-gradient(135deg, #F6E3A6 0%, #D9B65F 45%, #A98128 100%)', '--card-band-ink': '#1A1405',
  '--card-hole': '#FBF4E0', '--card-hole-ink': '#C9B27A', '--card-ink': '#5E450C', '--card-field': '#D9B65F',
  '--bg': '#121211', '--surface': '#1D1C1A', '--ink': '#F6EFD9', '--muted': '#A79E86',
  '--primary': '#D9B65F', '--on-primary': '#121211', '--accent': '#D9B65F', '--line': '#34312A',
};

/**
 * Diseño "Sano" (spec 004, capturas de la dueña): beige, café y hojas verdes. Por ahora es el ÚNICO diseño del
 * cliente para todos los grupos; los diseños por grupo de arriba se conservan para cuando se definan los convenios.
 */
export const CUSTOMER_SKIN: 'sano' | 'groups' = 'sano';
const SANO: Record<string, string> = {
  '--bg': '#E5E2DC', '--surface': '#F4F1EB', '--ink': '#1F1A16', '--muted': '#6E655C', '--primary': '#5E4B3D', '--on-primary': '#FFFFFF',
  '--accent': '#8DB872', '--line': '#D8D1C6', '--brown': '#5E4B3D', '--brown-ink': '#7A4A22', '--leaf': '#B9D3A2', '--leaf-strong': '#8DB872',
  '--promo': '#FFF1D2', '--gold-pill': '#FFD54A',
  '--font-display': "'Nunito', 'Outfit', Arial, sans-serif", '--font-body': "'Montserrat', 'Outfit', Arial, sans-serif",
  '--font-brand': "'Nunito', Arial, sans-serif", '--radius': '26px', '--display-transform': 'none', '--display-weight': '800',
  // La tarjeta de muestra antigua (si se llega a usar) en tonos café
  '--card-paper': '#F4F1EB', '--card-paper-ink': '#1F1A16', '--card-brand': '#1F1A16', '--card-leaf': '#8DB872',
  '--card-band': 'linear-gradient(135deg, #7A6250 0%, #5E4B3D 100%)', '--card-band-ink': '#FFFFFF', '--card-hole': '#FFFFFF',
  '--card-hole-ink': '#B9A898', '--card-ink': '#5E4B3D', '--card-field': '#8DB872',
};

export interface ThemeResult { key: ThemeKey; premium: boolean; vars: Record<string, string>; skin?: 'sano' }

export function buildTheme(group: GroupInfo | null | undefined, card?: Pick<CardView, 'tier'> | null): ThemeResult {
  if (CUSTOMER_SKIN === 'sano') return { key: 'classic', premium: false, vars: SANO, skin: 'sano' };
  const key = group ? resolveTheme(group) : 'classic';
  const premium = !!card && isPremium(card);
  const vars = { ...PALETTES[key] };
  // Tema clásico: respeta el color principal que el negocio configuró (el acento de BD es #FFFFFF por defecto, no se usa).
  if (group && key === 'classic') {
    if (/^#[0-9a-f]{6}$/i.test(group.primary_color)) vars['--primary'] = group.primary_color;
  }
  if (premium) Object.assign(vars, PREMIUM_SKIN);
  return { key, premium, vars };
}

export function applyTheme(t: ThemeResult, el: HTMLElement = document.documentElement): void {
  for (const [k, v] of Object.entries(t.vars)) el.style.setProperty(k, v);
  el.dataset.theme = t.key;
  el.dataset.premium = String(t.premium);
  if (t.skin) el.dataset.skin = t.skin; else delete el.dataset.skin;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t.vars['--bg']);
}
