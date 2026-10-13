import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getRequests } from '@/lib/db';
import { authenticate, fail, STAFF_ROLES } from '@/lib/api';
import { cleanTerm, requestSearchFilter, taskSearchFilter } from '@/lib/search';

const LIMIT = 5;

const has = (value: string | null | undefined, term: string) => (value || '').toLowerCase().includes(term);

// Short excerpt of `text` centred on the first occurrence of `term`.
function snippet(text: string, term: string) {
  const i = text.toLowerCase().indexOf(term);
  if (i < 0) return text.slice(0, 80);
  const start = Math.max(0, i - 24);
  return `${start > 0 ? '…' : ''}${text.slice(start, start + 90)}${start + 90 < text.length ? '…' : ''}`;
}

export async function GET(request: NextRequest) {
  try {
    const { session, response } = await authenticate();
    if (response) return response;

    const term = cleanTerm(new URL(request.url).searchParams.get('q'));
    if (term.length < 2) return NextResponse.json({ success: true, tasks: [], requests: [], users: [] });
    const lower = term.toLowerCase();
    const staff = STAFF_ROLES.includes(session.role);

    // ---- tasks (scoped by role) ----
    const tasksPromise = (async () => {
      let query = supabase
        .from('tasks')
        .select('id, title, description, notes, status, assigned_to, assignee:users!tasks_assigned_to_fkey(id, name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(LIMIT);
      if (session.role === 'team_member') {
        query = query.eq('assigned_to', session.userId);
      } else if (session.role === 'requestor') {
        const mine = await getRequests({ requestor_id: session.userId });
        if (mine.length === 0) return { items: [], count: 0 };
        query = query.in('request_id', mine.map((r) => r.id));
      }
      query = query.or(await taskSearchFilter(term));
      const { data, count } = await query;
      const rows = data || [];

      // Which of these matched through a comment?
      const noDirect = rows.filter((t) => !has(t.title, lower) && !has(t.description, lower) && !has(t.notes, lower));
      const comments = new Map<string, string>();
      if (noDirect.length) {
        const { data: c } = await supabase
          .from('task_comments')
          .select('task_id, content')
          .in('task_id', noDirect.map((t) => t.id))
          .ilike('content', `%${term}%`);
        for (const row of c || []) if (!comments.has(row.task_id)) comments.set(row.task_id, row.content);
      }

      const items = rows.map((t) => {
        const assignee = (Array.isArray(t.assignee) ? t.assignee[0] : t.assignee) as { name: string } | null;
        let matchedIn: string | undefined;
        let text: string | undefined;
        if (has(t.title, lower)) {
          /* title match is visible already */
        } else if (has(t.description, lower)) { matchedIn = 'description'; text = snippet(t.description, lower); }
        else if (has(t.notes, lower)) { matchedIn = 'notes'; text = snippet(t.notes, lower); }
        else if (comments.has(t.id)) { matchedIn = 'comment'; text = snippet(comments.get(t.id)!, lower); }
        else if (has(assignee?.name, lower)) { matchedIn = 'assignee'; }
        return {
          id: t.id,
          title: t.title,
          sub: assignee?.name ? `Assigned to ${assignee.name}` : 'Unassigned',
          status: t.status,
          href: `/tasks/${t.id}`,
          matchedIn,
          snippet: text,
        };
      });
      return { items, count: count || 0 };
    })();

    // ---- requests (requestors: own; staff: all; team members: none) ----
    const requestsPromise = (async () => {
      if (session.role === 'team_member') return { items: [], count: 0 };
      let query = supabase
        .from('requests')
        .select('id, title, description, event_name, target_platform, status, requestor_id', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(LIMIT);
      if (session.role === 'requestor') query = query.eq('requestor_id', session.userId);
      query = query.or(await requestSearchFilter(term));
      const { data, count } = await query;
      const rows = data || [];

      const ownerIds = Array.from(new Set(rows.map((r) => r.requestor_id).filter(Boolean)));
      const owners = new Map<string, string>();
      if (ownerIds.length && staff) {
        const { data: u } = await supabase.from('users').select('id, name').in('id', ownerIds);
        for (const row of u || []) owners.set(row.id, row.name);
      }

      const items = rows.map((r) => {
        const owner = owners.get(r.requestor_id);
        let matchedIn: string | undefined;
        let text: string | undefined;
        if (has(r.title, lower)) {
          /* title match is visible already */
        } else if (has(r.event_name, lower)) { matchedIn = 'event'; text = r.event_name; }
        else if (has(r.target_platform, lower)) { matchedIn = 'platform'; text = r.target_platform; }
        else if (has(r.description, lower)) { matchedIn = 'description'; text = snippet(r.description, lower); }
        else if (has(owner, lower)) { matchedIn = 'requestor'; }
        return {
          id: r.id,
          title: r.title,
          sub: owner ? `From ${owner}` : r.event_name || 'No event linked',
          status: r.status,
          href: `/requests?highlight=${r.id}&q=${encodeURIComponent(term)}`,
          matchedIn,
          snippet: text,
        };
      });
      return { items, count: count || 0 };
    })();

    // ---- people (coordinator only: the Users page is theirs) ----
    const usersPromise = (async () => {
      if (session.role !== 'coordinator') return { items: [], count: 0 };
      const { data, count } = await supabase
        .from('users')
        .select('id, name, email, role, skills', { count: 'exact' })
        .or(`name.ilike.%${term}%,email.ilike.%${term}%,skills.ilike.%${term}%`)
        .order('name')
        .limit(LIMIT);
      const items = (data || []).map((u) => {
        let matchedIn: string | undefined;
        let text: string | undefined;
        if (has(u.name, lower)) {
          /* name match is visible already */
        } else if (has(u.email, lower)) { matchedIn = 'email'; }
        else if (has(u.skills, lower)) { matchedIn = 'skills'; text = u.skills; }
        return {
          id: u.id,
          title: u.name,
          sub: u.email,
          status: u.role,
          href: `/users?q=${encodeURIComponent(term)}`,
          matchedIn,
          snippet: text,
        };
      });
      return { items, count: count || 0 };
    })();

    const [tasks, requests, users] = await Promise.all([tasksPromise, requestsPromise, usersPromise]);

    return NextResponse.json({
      success: true,
      term,
      tasks: tasks.items,
      tasksCount: tasks.count,
      requests: requests.items,
      requestsCount: requests.count,
      users: users.items,
      usersCount: users.count,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Search error:', error);
    return fail('Search failed', 500);
  }
}
