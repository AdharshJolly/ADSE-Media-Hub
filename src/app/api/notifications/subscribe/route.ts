import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, supabase } from '@/lib/db';

// In-memory store for subscriptions (in production, use a database)
const subscriptions = new Map<string, { endpoint: string; keys: object }>();

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { subscription } = body;

    if (!subscription?.endpoint) {
      return NextResponse.json({ success: false, error: 'Invalid subscription' }, { status: 400 });
    }

    // Store subscription with user ID
    subscriptions.set(session.userId, {
      endpoint: subscription.endpoint,
      keys: subscription.keys || {},
    });

    return NextResponse.json({ success: true, message: 'Subscription saved' });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json({ success: false, error: 'Failed to subscribe' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint } = body;

    // Remove subscription
    subscriptions.delete(session.userId);

    return NextResponse.json({ success: true, message: 'Subscription removed' });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json({ success: false, error: 'Failed to unsubscribe' }, { status: 500 });
  }
}
