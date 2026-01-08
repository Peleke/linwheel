// Service Worker for Push Notifications
// LinWheel Content Scheduling Reminders

self.addEventListener("push", function (event) {
  if (!event.data) return;

  try {
    const payload = event.data.json();

    const options = {
      body: payload.body,
      icon: payload.icon || "/logo.png",
      badge: payload.badge || "/badge.png",
      vibrate: [100, 50, 100],
      data: {
        url: payload.url || "/dashboard",
        ...payload.data,
      },
      actions: [
        {
          action: "open",
          title: "View Now",
        },
        {
          action: "dismiss",
          title: "Dismiss",
        },
      ],
      requireInteraction: true, // Keep notification visible
    };

    event.waitUntil(
      self.registration.showNotification(payload.title, options)
    );
  } catch (e) {
    console.error("[SW] Error parsing push payload:", e);
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  // Open the app or focus existing window
  const urlToOpen = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }

      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle subscription change (e.g., browser refreshes subscription)
self.addEventListener("pushsubscriptionchange", function (event) {
  event.waitUntil(
    fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event.newSubscription),
    })
  );
});
