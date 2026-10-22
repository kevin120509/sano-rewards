// Reemplaza al service worker de la demo: borra su caché, se desinstala y manda a la app real.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) await caches.delete(k);
    await self.registration.unregister();
    for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate('https://sano-rewards-real.vercel.app/');
  })());
});
