/** Datos de marca del negocio (un proyecto = un negocio). Tomados de la tarjeta física de Sano Bistro. */
export const BRAND = {
  businessName: 'Sano Bistro Café',
  logoTop: 'sano',
  logoBottom: 'bistro',
  logoSub: 'CAFÉ',
  programName: 'Sano rewards',
  handle: '@sanobistro',
  phone: '999 530 5545',
  address: 'Calle 77 (antes 27) No. 8E x 44 y 46, Col. Ismael García, C.P. 97320, Progreso, Yucatán',
  mapsUrl: 'https://maps.app.goo.gl/pqYhcFsM9sp54EVFA',
  /** Dirección pública de la app: la usan los QR que descarga la dueña (aunque se abra el panel en localhost). */
  publicUrl: 'https://sano-rewards-real.vercel.app',
  /** Se muestra si la BD aún no tiene premio configurado para el grupo. */
  fallbackReward: 'un premio de cortesía',
  finePrint: 'Válida por 1 mes · 1 visita por día · Personal e intransferible',
} as const;

/**
 * TEMPORAL (pendiente de Kevin): accesos de registro por grupo en la pantalla de inicio,
 * mientras se generan e imprimen los QR. Son los registration_token reales de la tabla groups.
 * Quitar (SHOW_GROUP_LINKS = false) cuando los QR estén en el local: con esto cualquiera puede elegir grupo.
 */
export const SHOW_GROUP_LINKS = true;
export const GROUP_LINKS = [
  { name: 'Cliente Consentido', token: '36e375ac5e8b41248fec2fb8381aadf4' },
  { name: 'Estudiantes', token: 'e101657ba8666bc38cfc0eecfe4b4999' },
  { name: 'GYM', token: 'ffd5fe7003e90508ac02b7af0b51febf' },
  { name: 'OZON', token: 'a3ca72c546d60589eb71472ee63fdd4a' },
] as const;

/** Dígitos del código que manda Supabase por correo (Auth → Email → "Email OTP Length"). Debe coincidir. */
export const OTP_LENGTH = 8;

/** Avisos push al cliente. Activar (true) cuando exista backend que envíe los avisos. */
export const PUSH_ENABLED = false;
