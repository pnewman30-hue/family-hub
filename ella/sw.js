// Ella's separate dashboard is retired (the family uses the School Tracker at ../school/).
// This worker replaces the old offline worker on devices that had the dashboard, clears its
// saved copy and removes itself.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.indexOf("ella-dashboard") === 0).map(k => caches.delete(k))))
      .then(() => self.registration.unregister())
  );
});
