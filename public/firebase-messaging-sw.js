// Firebase Messaging Service Worker
// This file MUST use CDN imports — bundled Firebase doesn't work in SW context

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase config — duplicated here because SW cannot access Next.js env vars at runtime
// These are public NEXT_PUBLIC_ values so it's safe to hardcode here
const firebaseConfig = {
  apiKey: "AIzaSyCBk8meFn4pz0STltV87ylLeUy8GJEpTUA",
  authDomain: "security-team-coordination.firebaseapp.com",
  projectId: "security-team-coordination",
  storageBucket: "security-team-coordination.firebasestorage.app",
  messagingSenderId: "679999911662",
  appId: "1:679999911662:web:b8b5b6dd33f1f98f2365ff"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages (app is closed or in background)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  // O Firebase SDK trata automaticamente de exibir a notificação se `payload.notification` existir.
  // Apenas fazemos log aqui para debug.
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/dashboard');
      }
    })
  );
});
