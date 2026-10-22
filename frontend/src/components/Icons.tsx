import type { ThemeKey } from '../domain/types';

export function Leaf({ size = 24 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3C7 6 5 9.5 5 13c0 3 3 6 7 8 4-2 7-5 7-8 0-3.5-2-7-7-10z" fill="currentColor" opacity=".18" /><path d="M12 4v16M12 11c-2-.5-3.5-1.8-4-3.5M12 14c2-.5 3.5-1.8 4-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>);
}
export function Bolt({ size = 24 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></svg>);
}
export function Check({ size = 24 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 13l5 5L20 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>);
}
export function Wave({ size = 24 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 9c3-3 5 3 8 0s5 3 8 0 3 0 4 0M2 15c3-3 5 3 8 0s5 3 8 0 3 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>);
}
export function Gift({ size = 24 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="8" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" /><path d="M5 12v8h14v-8M12 8v12M12 8C9 8 8 4.5 10 4s2 4 2 4zm0 0c3 0 4-3.5 2-4s-2 4-2 4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>);
}
export function Star({ size = 24 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 3 6.5 7 .8-5.2 4.8 1.4 7L12 17.5 5.8 21l1.4-7L2 9.3l7-.8z" /></svg>);
}
export function Copy({ size = 18 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M5 15V6a2 2 0 0 1 2-2h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>);
}
export function IconCard() {
  return (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="2" /><path d="M3 10h18" stroke="currentColor" strokeWidth="2" /></svg>);
}
export function IconClock() {
  return (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>);
}
export function IconUser() {
  return (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>);
}
export function GoogleG() {
  return (<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" /><path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.7l7.9-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.900l-7.9 6.1C6.5 42.6 14.6 48 24 48z" /></svg>);
}

/** Icono del sello según el diseño del grupo. */
export function StampIcon({ theme, size = 24 }: { theme: ThemeKey; size?: number }) {
  switch (theme) {
    case 'sport': return <Bolt size={size} />;
    case 'notebook': return <Check size={size} />;
    case 'waves': return <Wave size={size} />;
    default: return <Leaf size={size} />;
  }
}

/** Bebida tipo frappé (como el premio de la tarjeta física). */
export function Drink({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M27 9 33 2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M14.5 17c0-5.5 4.3-8.5 9.5-8.500s9.5 3 9.5 8.5" fill="currentColor" opacity=".18" />
      <path d="M14.5 17c0-5.5 4.3-8.5 9.5-8.500s9.5 3 9.5 8.5" stroke="currentColor" strokeWidth="2.4" />
      <rect x="11" y="17" width="26" height="4.5" rx="2.2" stroke="currentColor" strokeWidth="2.4" />
      <path d="M14 21.500h20l-2.8 20.200a2.5 2.5 0 0 1-2.5 2.200h-9.400a2.5 2.5 0 0 1-2.5-2.200z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M17 28h14M17.8 34h12.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}

export function Sparkle({ size = 18 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1c.6 5.2 2.8 8.4 11 11-8.2 2.6-10.4 5.8-11 11-.6-5.2-2.8-8.4-11-11 8.2-2.6 10.4-5.8 11-11z" /></svg>);
}

/** Dos hojas, como en el logo de la tarjeta. */
export function Leaves({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M22 44c-6-4-9-10-7-17 6 2 9 8 7 17z" fill="currentColor" opacity=".8" />
      <path d="M24 40c1-12 8-20 21-22-1 12-9 20-21 22z" fill="currentColor" />
      <path d="M24 40c4-6 9-11 16-16" stroke="#fff" strokeOpacity=".55" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
