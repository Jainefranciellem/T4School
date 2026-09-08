import { useEffect } from 'react';
import { onMessage } from 'firebase/messaging';
import { messaging } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

// Sem isso, um push que chega com a aba em primeiro plano não aparece em
// lugar nenhum: o service worker (onBackgroundMessage) só é acionado quando
// a aba está em segundo plano ou fechada.
//
// Som: com o app fechado/em background, quem mostra a notificação é o SO
// (via sw.js), que sempre usa o som padrão dele — não dá pra trocar isso.
// Aqui, com a aba aberta, o som é 100% nosso, então tocamos um efeito sonoro
// próprio pra sinalizar a chegada da notificação.
const notificationSound = new Audio('/notification-sound.wav');

export function PushForegroundListener() {
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      notificationSound.currentTime = 0;
      notificationSound.play().catch(() => {
        // Autoplay pode ser bloqueado se a página ainda não teve nenhuma
        // interação do usuário — o toast visual aparece normalmente mesmo assim.
      });

      toast({
        title: payload.notification?.title ?? 'Nova notificação',
        description: payload.notification?.body,
      });
    });

    return unsubscribe;
  }, [toast]);

  return null;
}
