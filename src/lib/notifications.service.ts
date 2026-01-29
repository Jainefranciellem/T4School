export async function pedirPermissaoNotificacao(): Promise<boolean> {
    if (!('Notification' in window)) {
        return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
}
