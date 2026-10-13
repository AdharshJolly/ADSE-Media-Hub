'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Icon, Switch } from '@/components/ui/kit';

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [busy, setBusy] = useState(false);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch {
      console.error('Failed to check subscription');
    }
  };

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      navigator.serviceWorker.register('/sw.js').then(checkSubscription).catch(() => console.error('Service worker registration failed'));
    }
  }, []);

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
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''),
      });

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

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (isSubscribed) await unsubscribeFromPush();
      else await subscribeToPush();
    } finally {
      setBusy(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="card card-p row wrap" style={{ gap: 14 }}>
      <span
        style={{ width: 40, height: 40, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--primary-soft)', color: 'var(--primary-text)', flex: 'none' }}
      >
        <Icon name="bell" size={20} />
      </span>
      <div className="col grow" style={{ minWidth: 200 }}>
        <b style={{ fontWeight: 500 }}>Browser push notifications</b>
        <p className="t-sm muted">Get alerts for assignments and comments even when this tab is closed.</p>
        {permission === 'denied' ? (
          <p className="t-xs" style={{ color: 'var(--s-over-fg)' }}>Permission is blocked in your browser settings.</p>
        ) : null}
      </div>
      <Switch on={isSubscribed} onChange={toggle} label="Enable push" disabled={busy || permission === 'denied'} />
    </div>
  );
}
