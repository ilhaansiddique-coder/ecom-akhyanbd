// Minimal service worker for web push.
// Receives push events, shows a notification, and focuses/opens the dashboard
// URL when the user taps. Not a full PWA SW — just push handling.

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Notification", body: event.data.text() };
  }
  const { title = "Akhiyan Admin", body = "", url = "/dashboard", data = {} } = payload;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [200, 100, 200],
      data: { ...data, url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((all) => {
      for (const c of all) {
        if ("focus" in c && c.url.includes(url)) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
