// ============================================================================
// SOMANATHA WEB PUSH SERVICE WORKER
// Handles background push events and user interaction clicks.
// ============================================================================

self.addEventListener('push', function (event) {
    if (!event.data) return;

    let data = {};
    try {
        data = event.data.json();
    } catch (e) {
        data = {
            title: 'Somanatha',
            body: event.data.text()
        };
    }

    const options = {
        body: data.body,
        icon: data.icon || '/logo.png',
        badge: data.badge || '/logo.png', // Small icon shown in Android status bar
        image: data.image || null, // Big image
        tag: data.tag || 'somanatha-update', // Groups/replaces same-tag notifications
        renotify: true,
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/panchanga',
            actions: data.actions || []
        },
        actions: data.actions || [] // [{ action: 'muhurta', title: '🗓️ График мухурт', url: '/panchanga' }, ...]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Somanatha', options)
    );
});

self.addEventListener('notificationclick', function (event) {
    // 1. Close the notification from the system drawer immediately
    event.notification.close();

    const clickedAction = event.action;
    const notificationData = event.notification.data || {};
    let targetUrl = notificationData.url || '/panchanga';

    // 2. Determine target URL based on the clicked Action Button
    if (clickedAction && notificationData.actions) {
        const actionItem = notificationData.actions.find(a => a.action === clickedAction);
        if (actionItem && actionItem.url) {
            targetUrl = actionItem.url;
        } else {
            // Default fallbacks for common action tags
            if (clickedAction === 'muhurta') {
                targetUrl = '/panchanga';
            } else if (clickedAction === 'info') {
                targetUrl = '/panchanga';
            }
        }
    }

    // 3. Focus existing window or open a new one
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function (clientList) {
                // If a window is already open on our site, focus it and redirect
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if ('navigate' in client && 'focus' in client) {
                        client.focus();
                        return client.navigate(targetUrl);
                    }
                }
                // Otherwise, open a new window/PWA app instance
                if (clients.openWindow) {
                    return clients.openWindow(targetUrl);
                }
            })
    );
});
