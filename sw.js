// Service Worker for Push Notifications
const CACHE_NAME = 'weenrest-v1';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  let notificationData = {
    title: 'WeenRest',
    body: 'لديك إشعار جديد',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'notification',
    requireInteraction: false,
    data: {}
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        requireInteraction: data.requireInteraction || false,
        data: data.data || {},
        actions: data.actions || [],
        image: data.image || null
      };
    } catch (e) {
      // If parsing fails, try as text
      notificationData.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    requireInteraction: notificationData.requireInteraction,
    data: notificationData.data,
    vibrate: [200, 100, 200],
    lang: 'ar',
    dir: 'rtl'
  };

  if (notificationData.actions && notificationData.actions.length > 0) {
    notificationOptions.actions = notificationData.actions;
  }

  if (notificationData.image) {
    notificationOptions.image = notificationData.image;
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
  );
});

// Notification click event - handle when user clicks on notification
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();

  const notificationData = event.notification.data || {};
  let url = '/';

  if (notificationData.url) {
    url = notificationData.url;
  } else if (notificationData.type) {
    // Map notification types to URLs
    switch (notificationData.type) {
      case 'job_application':
        url = '/job-applications.html';
        break;
      case 'menu_request':
        url = '/restaurant-owner-dashboard.html';
        break;
      case 'uniform_request':
        url = '/restaurant-owner-uniform-requests.html';
        break;
      case 'offer':
        url = '/index.html#offers-section';
        break;
      case 'job':
        url = '/jobs.html';
        break;
      default:
        url = '/';
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open with this URL
      for (let client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Notification closed');
});

