const CACHE_NAME = 'svobs-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// ---- Duyuru push bildirimleri ----

self.addEventListener('push', (event) => {
  let data = { title: 'Yeni Duyuru', body: '' };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    data.body = event.data ? event.data.text() : '';
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Yeni Duyuru', {
      body: data.body || '',
      icon: '/sv-logo.png',
      badge: '/sv-logo.png',
      data: { url: data.url || '/ogrenci' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const hedefUrl = event.notification.data?.url || '/ogrenci';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/ogrenci') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(hedefUrl);
    })
  );
});