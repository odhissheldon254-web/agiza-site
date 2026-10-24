// Agiza Office service worker: shows reminder notifications sent by the "reminders" Edge Function,
// and keeps a copy of the office page so the installed app opens even on a bad connection.
var SHELL = 'agiza-office-v1';
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(SHELL).then(function (c) { return c.addAll(['/office/', '/office/config.js']) }).then(function () { return self.skipWaiting() }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== SHELL }).map(function (k) { return caches.delete(k) }));
  }).then(function () { return self.clients.claim() }));
});

// Pages: always try the network first so she gets the latest version; fall back to the saved copy offline.
// Her data (Supabase) is never cached here.
self.addEventListener('fetch', function (e) {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).then(function (res) {
    var copy = res.clone();
    caches.open(SHELL).then(function (c) { c.put('/office/', copy) });
    return res;
  }).catch(function () { return caches.match('/office/') }));
});

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
