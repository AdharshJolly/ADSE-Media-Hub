import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getTaskLinks, createTaskLink, logTaskActivity } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const links = await getTaskLinks(taskId);
    return NextResponse.json({ success: true, links });
  } catch (error) {
    console.error('Get links error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch links' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { url, title, description } = body;

    if (!url?.trim()) {
      return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid URL format' }, { status: 400 });
    }

    const link = await createTaskLink(taskId, session.userId, url.trim(), title?.trim() || '', description?.trim() || '');
    if (!link) {
      return NextResponse.json({ success: false, error: 'Failed to create link' }, { status: 500 });
    }

    // Log activity
    await logTaskActivity(taskId, session.userId, 'link_added', { link_id: link.id, url: link.url });

    return NextResponse.json({ success: true, link });
  } catch (error) {
    console.error('Create link error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create link' }, { status: 500 });
  }
}
