// Service Worker untuk handle push notification

self.addEventListener('push', (event) => {
  console.log('Push notification diterima:', event);

  let notificationData = {
    title: 'Story App Notification',
    options: {
      body: 'Anda menerima notifikasi baru',
      icon: '/images/icon-192x192.png',
      badge: '/images/badge-72x72.png'
    }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || 'Story App Notification',
        options: {
          body: data.options?.body || 'Anda menerima notifikasi baru',
          icon: '/images/icon-192x192.png',
          badge: '/images/badge-72x72.png',
          data: data.options?.data || {}
        }
      };
    } catch (error) {
      notificationData.options.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData.options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Cek apakah window aplikasi sudah terbuka
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Jika belum terbuka, buka window baru
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});
