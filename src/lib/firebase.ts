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

function isIOS(): boolean {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// No iPhone, a Web Push API só funciona quando a página foi aberta pelo
// ícone instalado na Tela de Início (display-mode: standalone) — abrir o
// link direto no Safari (ex: veio de um WhatsApp) não dá suporte a push,
// mesmo em iOS 16.4+. `navigator.standalone` é o jeito antigo do Safari
// de expor isso, por isso checamos os dois.
function isStandaloneApp(): boolean {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true
    );
}

// Genérica: usada tanto pelo login do professor quanto pelo portal do
// aluno — a mecânica de pedir permissão e gerar o token FCM é idêntica,
// só muda pra quem o token depois é salvo no backend.
export async function pedirPermissaoNotificacaoPush() {
    if (isIOS() && !isStandaloneApp()) {
        throw new Error(
            'No iPhone, notificações só funcionam depois de adicionar essa página à Tela de Início: toque em Compartilhar no Safari, escolha "Adicionar à Tela de Início" e abra por esse ícone.'
        );
    }

    const permission = await Notification.requestPermission();
    console.log('[push] permissão de notificação:', permission);
    if (permission !== 'granted') return null;

    try {
        // Sem isso, o SDK tenta registrar sozinho /firebase-messaging-sw.js
        // (nome padrão dele), que não existe nesse projeto — usamos o /sw.js
        // que o main.tsx já registra.
        const registration = await navigator.serviceWorker.ready;
        const token = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration,
        });
        console.log('[push] token FCM gerado:', token || '(vazio)');
        return token; // 🔥 token REAL do Firebase
    } catch (error) {
        console.error('[push] erro ao gerar token FCM:', error);
        throw error;
    }
}
