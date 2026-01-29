import { getToken } from 'firebase/messaging';
import { messaging } from './firebase';

export async function pedirPermissaoNotificacao() {
    if (!('Notification' in window)) {
        console.warn('Notificações não suportadas');
        return null;
    }

    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
        console.log('Permissão negada');
        return null;
    }

    try {
        const token = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        });

        if (token) {
            console.log('🔥 Token FCM:', token);
            return token;
        } else {
            console.warn('Nenhum token gerado');
            return null;
        }
    } catch (err) {
        console.error('Erro ao obter token', err);
        return null;
    }
}
