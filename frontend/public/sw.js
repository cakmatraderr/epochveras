// Yeni Service Worker'ın bekletilmeden hemen aktif olmasını sağla
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// /api/ ile başlayan tüm istekleri Service Worker denetiminden çıkar, doğrudan sunucuya bırak
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    return;
  }
});

self.addEventListener('push', function(event) {
  let data = { title: 'Epochveras Alarm', body: 'Yeni bir piyasa uyarısı var!' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
