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

    // Token simples por enquanto
    const deviceToken = crypto.randomUUID();

    return deviceToken;
}
