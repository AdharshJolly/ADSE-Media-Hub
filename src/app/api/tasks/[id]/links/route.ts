import { NextRequest, NextResponse } from 'next/server';
import { getTaskLinks, createTaskLink, logTaskActivity } from '@/lib/db';
import { authenticate, fail, getAccessibleTask, parseBody } from '@/lib/api';
import { linkSchema } from '@/lib/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const { session, response } = await authenticate();
    if (response) return response;

    if (!(await getAccessibleTask(taskId, session))) return fail('Task not found', 404);

    const links = await getTaskLinks(taskId);
    return NextResponse.json({ success: true, links });
  } catch (error) {
    console.error('Get links error:', error);
    return fail('Failed to fetch links', 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const { session, response } = await authenticate();
    if (response) return response;

    if (!(await getAccessibleTask(taskId, session))) return fail('Task not found', 404);

    const { data, response: bad } = await parseBody(request, linkSchema);
    if (bad) return bad;

    const link = await createTaskLink(taskId, session.userId, data.url, data.title, data.description);
    if (!link) return fail('Failed to create link', 500);

    await logTaskActivity(taskId, session.userId, 'link_added', { link_id: link.id, url: link.url });

    return NextResponse.json({ success: true, link });
  } catch (error) {
    console.error('Create link error:', error);
    return fail('Failed to create link', 500);
  }
}
