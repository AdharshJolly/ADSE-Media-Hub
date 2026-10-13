import webpush from 'web-push';
import { env } from './env';
import { supabase } from './supabase';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

let configured = false;

function configure(): boolean {
  if (configured) return true;
  if (!env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return false;
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

// Sends to every browser the user has subscribed. Dead subscriptions (404/410) are removed.
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!configure()) return;

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);
  if (error || !subs?.length) return;

  const body = JSON.stringify(payload);
  const dead: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 86400 });
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) dead.push(s.endpoint);
        else console.error('Push delivery failed:', status ?? e);
      }
    }),
  );

  if (dead.length) await supabase.from('push_subscriptions').delete().in('endpoint', dead);
}
