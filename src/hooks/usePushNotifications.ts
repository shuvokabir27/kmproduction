import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const sb = supabase as any;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

    async function subscribe() {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // Get VAPID public key from edge function
        const { data: vapidData, error } = await supabase.functions.invoke('get-vapid-key');
        if (error || !vapidData?.publicKey) {
          console.error('Failed to get VAPID key:', error);
          return;
        }

        const registration = await navigator.serviceWorker.ready;

        // Check existing subscription
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          const applicationServerKey = urlBase64ToUint8Array(vapidData.publicKey);
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });
        }

        const subscriptionJson = subscription.toJSON();

        // Store in database
        await sb.from('push_subscriptions').upsert(
          {
            user_id: user!.id,
            endpoint: subscriptionJson.endpoint,
            p256dh: subscriptionJson.keys?.p256dh,
            auth: subscriptionJson.keys?.auth,
          },
          { onConflict: 'user_id,endpoint' }
        );
      } catch (err) {
        console.error('Push subscription failed:', err);
      }
    }

    // Delay subscription to avoid blocking initial render
    const timer = setTimeout(subscribe, 3000);
    return () => clearTimeout(timer);
  }, [user]);
}
