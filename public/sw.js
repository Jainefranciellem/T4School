importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');


const firebaseConfig = {
    apiKey: "AIzaSyBfRU_AsNMFr-1wt-C089-GW0jIkt5mnCM",
    authDomain: "t4school-87ac0.firebaseapp.com",
    projectId: "t4school-87ac0",
    storageBucket: "t4school-87ac0.firebasestorage.app",
    messagingSenderId: "365561613112",
    appId: "1:365561613112:web:a2a5615b9185fd452c8fcd",
    measurementId: "G-ZYB9YF8Z27"
};
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
    self.registration.showNotification(payload.notification.title, {
        body: payload.notification.body,
        icon: '/icon-192.png'
    });
});
