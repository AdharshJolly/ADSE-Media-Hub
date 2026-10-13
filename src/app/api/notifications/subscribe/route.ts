import { NextRequest, NextResponse } from 'next/server';
import { authenticate, fail, parseBody } from '@/lib/api';
import { pushSubscriptionSchema, pushUnsubscribeSchema } from '@/lib/validation';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { session, response } = await authenticate();
    if (response) return response;

    const { data, response: bad } = await parseBody(request, pushSubscriptionSchema);
    if (bad) return bad;

    const { endpoint, keys } = data.subscription;
    // Endpoint is unique per browser; re-subscribing (or a new login on the same
    // browser) moves it to the current user.
    const { error } = await supabase.from('push_subscriptions').upsert(
      { user_id: session.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: 'endpoint' },
    );
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Subscription saved' });
  } catch (error) {
    console.error('Subscribe error:', error);
    return fail('Failed to subscribe', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { session, response } = await authenticate();
    if (response) return response;

    const { data, response: bad } = await parseBody(request, pushUnsubscribeSchema);
    if (bad) return bad;

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', data.endpoint)
      .eq('user_id', session.userId);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Subscription removed' });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return fail('Failed to unsubscribe', 500);
  }
}
