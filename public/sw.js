// PrimeTrack - Service Worker para Notificações Web Push (iOS Safari & Desktop)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {
    title: '🎉 Venda Aprovada!',
    body: 'Nova venda registrada no PrimeTrack',
    icon: 'https://app.primetrack.top/images/primetrack-app-icon.png',
    badge: 'https://app.primetrack.top/images/primetrack-app-icon.png',
    tag: 'sales-notification',
    data: { url: '/sales' }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  // Opções estritas suportadas pelo iOS Web Push
  const options = {
    body: data.body,
    icon: 'https://app.primetrack.top/images/primetrack-app-icon.png',
    badge: 'https://app.primetrack.top/images/primetrack-app-icon.png',
    tag: data.tag || 'sale-alert',
    renotify: false,
    data: data.data || { url: '/sales' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/sales';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
