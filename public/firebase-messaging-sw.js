// sw.js — handles PWA caching + FCM background notifications
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBhokyGoDk5fMymMinKWHDPrKxAZMdsqx8",
  authDomain: "motel-app-4e3c7.firebaseapp.com",
  projectId: "motel-app-4e3c7",
  storageBucket: "motel-app-4e3c7.firebasestorage.app",
  messagingSenderId: "402837874017",
  appId: "1:402837874017:web:c10ea66ca9ec26c21b9120",
});

const messaging = firebase.messaging();

// ✅ Background FCM Handler
messaging.onBackgroundMessage(function (payload) {
  console.log("📩 Received background message ", payload);
  if(payload.data){
    const { title, body, redirect_route } = payload.data;
    self.registration.showNotification(title, {
      body,
      icon: "/logo.png",
      data: {
        redirect_route,
      }
    });
  }
});


// Notification Click Handler
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); // Close the notification
  const urlToOpen = new URL(event.notification.data.redirect_route, self.location.origin).href;
  event.waitUntil(clients.openWindow(urlToOpen)); // Open the app at the specified URL
});