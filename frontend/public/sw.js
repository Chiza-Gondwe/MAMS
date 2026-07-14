self.addEventListener('push', function(event) {
  let title = 'MAMS Notification';
  let body = 'You have a new notification.';
  let icon = '/logo192.png';
  let data = {};

  if (event.data) {
    try {
      const payload = event.data.json();
      title = payload.head || payload.title || title;
      body = payload.body || body;
      icon = payload.icon || icon;
      data = payload.data || {};
    } catch (e) {
      body = event.data.text();
    }
  }

  const options = {
    body: body,
    icon: icon,
    badge: '/logo192.png',
    data: data,
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  // Open the dashboard when clicked
  const urlToOpen = new URL('/dashboard', self.location.origin).href;

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    let matchingClient = null;

    for (let i = 0; i < windowClients.length; i++) {
      const windowClient = windowClients[i];
      if (windowClient.url === urlToOpen) {
        matchingClient = windowClient;
        break;
      }
    }

    if (matchingClient) {
      return matchingClient.focus();
    } else {
      return clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});
