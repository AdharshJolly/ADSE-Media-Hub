'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

export default function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch {
      console.error('Failed to check subscription');
    }
  };

  const subscribeToPush = async () => {
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission !== 'granted') {
        toast.error('Push notification permission denied');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      // Send subscription to server
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });

      setIsSubscribed(true);
      toast.success('Push notifications enabled');
    } catch (error) {
      console.error('Failed to subscribe:', error);
      toast.error('Failed to enable push notifications');
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Notify server
        await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      setIsSubscribed(false);
      toast.success('Push notifications disabled');
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      toast.error('Failed to disable push notifications');
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
          isSubscribed
            ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        }`}
      >
        {isSubscribed ? 'Disable Push' : 'Enable Push'}
      </button>
      {permission === 'denied' && (
        <span className="text-xs text-red-500">Permission denied in browser settings</span>
      )}
    </div>
  );
}
