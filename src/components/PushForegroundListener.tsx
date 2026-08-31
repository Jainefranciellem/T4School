import { useEffect } from 'react';
import { onMessage } from 'firebase/messaging';
import { messaging } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

// Sem isso, um push que chega com a aba em primeiro plano não aparece em
// lugar nenhum: o service worker (onBackgroundMessage) só é acionado quando
// a aba está em segundo plano ou fechada.
export function PushForegroundListener() {
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      toast({
        title: payload.notification?.title ?? 'Nova notificação',
        description: payload.notification?.body,
      });
    });

    return unsubscribe;
  }, [toast]);

  return null;
}
