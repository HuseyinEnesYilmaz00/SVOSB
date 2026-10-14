self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await clients.claim();
    const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(clientList.map((client) => {
      try {
        const url = new URL(client.url);
        if (!url.pathname.startsWith('/ogrenci') || !('navigate' in client)) return Promise.resolve();
        url.searchParams.set('uygulama-surumu', 'push-7');
        return client.navigate(url.toString()).then(() => undefined);
      } catch {
        return Promise.resolve();
      }
    }));
  })());
});

// ---- Duyuru push bildirimleri ----

self.addEventListener('push', (event) => {
  let data = { title: 'Yeni Duyuru', body: '' };
  try {
    if (event.data) data = event.data.json();
  } catch {
    data.body = event.data ? event.data.text() : '';
  }

  event.waitUntil(Promise.all([
    self.registration.showNotification(data.title || 'Yeni Duyuru', {
      body: data.body || '',
      // Android küçük simgede `badge`, sağdaki renkli görselde `icon` kullanır.
      // Her ikisi de yazısız, kare ve kendi alanı için hazırlanmış varlıklardır.
      badge: '/icons/notification-badge.png?v=push-7',
      icon: '/icons/notification-icon.png?v=push-7',
      tag: data.duyuruId ? `duyuru-${data.duyuruId}` : 'yeni-duyuru',
      renotify: true,
      data: { url: data.url || '/ogrenci?sekme=duyurular', duyuruId: data.duyuruId || null },
    }),
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      clientList.forEach((client) => client.postMessage({ type: 'DUYURU_YENILE', duyuruId: data.duyuruId || null }));
    }),
  ]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const hedefUrl = event.notification.data?.url || '/ogrenci';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/ogrenci') && 'focus' in client) {
          if ('navigate' in client) return client.navigate(hedefUrl).then(() => client.focus());
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(hedefUrl);
    })
  );
});
