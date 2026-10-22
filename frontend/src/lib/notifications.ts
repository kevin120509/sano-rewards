import { api, VAPID_PUBLIC_KEY } from '../data';

export type PushResult = 'ok' | 'denied' | 'unsupported' | 'no-key';

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'Notification' in window && 'PushManager' in window;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try { return await navigator.serviceWorker.register('/sw.js'); } catch { return null; }
}

function urlBase64ToUint8Array(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function pushEnabled(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return !!(reg && (await reg.pushManager.getSubscription()));
}

/** Pide permiso, suscribe y guarda la suscripción en Supabase (push_subscriptions). */
export async function enablePush(): Promise<PushResult> {
  if (!pushSupported()) return 'unsupported';
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return 'denied';
  const reg = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
  if (!VAPID_PUBLIC_KEY) return 'no-key';
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource });
  await api.savePushSubscription(sub.toJSON());
  return 'ok';
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker?.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) { await api.removePushSubscription(sub.endpoint); await sub.unsubscribe(); }
}
