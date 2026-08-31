import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';
// Import the functions you need from the SDKs you need"
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries


const firebaseConfig = {
    apiKey: "AIzaSyBfRU_AsNMFr-1wt-C089-GW0jIkt5mnCM",
    authDomain: "t4school-87ac0.firebaseapp.com",
    projectId: "t4school-87ac0",
    storageBucket: "t4school-87ac0.firebasestorage.app",
    messagingSenderId: "365561613112",
    appId: "1:365561613112:web:a2a5615b9185fd452c8fcd",
    measurementId: "G-ZYB9YF8Z27"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);
const analytics = getAnalytics(app);

export async function pedirPermissaoNotificacaoProfessor() {
    const permission = await Notification.requestPermission();
    console.log('[push] permissão de notificação:', permission);
    if (permission !== 'granted') return null;

    try {
        const token = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        });
        console.log('[push] token FCM gerado:', token || '(vazio)');
        return token; // 🔥 token REAL do Firebase
    } catch (error) {
        console.error('[push] erro ao gerar token FCM:', error);
        throw error;
    }
}
