// Agiza Office service worker: shows reminder notifications sent by the "reminders" Edge Function.
self.addEventListener('install', function () { self.skipWaiting() });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()) });

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {} } catch (_) { d = { body: e.data.text() } }
  e.waitUntil(self.registration.showNotification(d.title || 'Agiza Office', {
    body: d.body || '',
    icon: '/images/icon-192.png',
    badge: '/images/icon-192.png',
    tag: d.tag,
    renotify: !!d.tag,
    vibrate: [200, 100, 200]
  }));
});

// Tapping a reminder opens (or focuses) the office.
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) if (list[i].url.indexOf('/office/') !== -1) return list[i].focus();
    return self.clients.openWindow('/office/');
  }));
});
