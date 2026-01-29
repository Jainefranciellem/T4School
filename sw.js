self.addEventListener('install', () => {
    console.log('Service Worker instalado');
});

self.addEventListener('activate', () => {
    console.log('Service Worker ativo');
});

self.addEventListener('push', event => {
    const data = event.data.json();

    self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon-192.png',
        data: data.url
    });
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data || '/')
    );
});
