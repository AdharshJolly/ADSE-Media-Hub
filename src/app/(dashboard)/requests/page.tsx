'use client';

import { safeHttpUrl } from '@/lib/validation';
import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { fetchJson, peek, type Api } from '@/lib/client-cache';
import { useDebounce } from '@/hooks/useDebounce';
import { TableSkeleton } from '@/components/ui/skeleton';
import { Chip, Empty, Icon, Modal, PageHead, Pri, TypeTag, fmtDate } from '@/components/ui/kit';

interface RequestWithTask {
  id: string;
  requestor_id: string;
  title: string;
  description: string;
  media_type: string;
  event_name: string;
  target_platform: string;
  style_reference: string;
  deadline: string;
  priority: string;
  status: string;
  coordinator_notes: string;
  created_at: string;
  updated_at: string;
  tasks: Array<{ id: string; status: string; assigned_to: string; title: string }> | null;
}

function buildRequestsUrl(status: string, search: string, page: number) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  params.set('page', page.toString());
  params.set('pageSize', '10');
  return `/api/requests?${params}`;
}

function RequestsInner() {
  const { canManageTasks, isRequestor } = useAuth();
  const searchParams = useSearchParams();
  const highlight = searchParams.get('highlight');
  const seed = useMemo(() => peek(buildRequestsUrl('', searchParams.get('q') || '', 1)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []);
  const skipSpinner = useRef(!!seed);
  const [requests, setRequests] = useState<RequestWithTask[]>(seed?.data ?? []);
  const [loading, setLoading] = useState(!seed);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(seed?.totalPages || 1);
  const [totalCount, setTotalCount] = useState(seed?.count || 0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<RequestWithTask | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [viewing, setViewing] = useState<RequestWithTask | null>(null);

  const debouncedStatus = useDebounce(statusFilter, 300);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const urlQ = searchParams.get('q') || '';
  useEffect(() => {
    setSearchQuery(urlQ);
    setPage(1);
  }, [urlQ]);

  const fetchRequests = useCallback(async (fresh = false) => {
    const url = buildRequestsUrl(debouncedStatus, debouncedSearch, page);
    const apply = (d: Api) => {
      setRequests(d.data);
      setTotalPages(d.totalPages);
      setTotalCount(d.count);
    };
    const hit = fresh ? undefined : peek(url);
    if (hit) {
      apply(hit);
      setLoading(false);
    } else if (!skipSpinner.current) {
      setLoading(true);
    }
    skipSpinner.current = false;
    try {
      const data: Api = await fetchJson(url, { cache: 'no-store' });
      if (data.success) apply(data);
    } catch {
      toast.error('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  }, [debouncedStatus, debouncedSearch, page]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (requestId: string) => {
    setUpdatingId(requestId);
    const originalRequests = [...requests];
    setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: 'approved' } : r)));

    try {
      const response = await fetch(`/api/requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Approved' }),
      });
      const data = await response.json();
      if (!data.success) {
        setRequests(originalRequests);
        toast.error(data.error || 'Failed to approve request');
      } else {
        toast.success('Request approved and task created');
        fetchRequests(true);
      }
    } catch {
      setRequests(originalRequests);
      toast.error('Failed to approve request');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejecting) return;
    const requestId = rejecting.id;
    const notes = rejectNotes.trim();
    setRejecting(null);
    setRejectNotes('');

    setUpdatingId(requestId);
    const originalRequests = [...requests];
    setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: 'rejected' } : r)));

    try {
      const response = await fetch(`/api/requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      const data = await response.json();
      if (!data.success) {
        setRequests(originalRequests);
        toast.error(data.error || 'Failed to reject request');
      } else {
        toast.success('Request rejected');
      }
    } catch {
      setRequests(originalRequests);
      toast.error('Failed to reject request');
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const cols = canManageTasks
    ? 'minmax(0,2.2fr) minmax(0,1.2fr) minmax(0,.9fr) minmax(0,1.2fr) minmax(0,1fr) 170px'
    : 'minmax(0,2.2fr) minmax(0,1.2fr) minmax(0,.9fr) minmax(0,1.2fr) minmax(0,1fr) 100px';

  return (
    <>
      <PageHead
        title={isRequestor ? 'My requests' : 'Requests'}
        sub={
          isRequestor
            ? 'Everything you have submitted.'
            : pendingCount > 0
              ? `${pendingCount} on this page ${pendingCount === 1 ? 'is' : 'are'} waiting for review.`
              : `${totalCount} total.`
        }
        actions={
          isRequestor ? (
            <Link href="/requests/new" className="btn btn-primary">
              <Icon name="plus" size={16} /> New request
            </Link>
          ) : null
        }
      />

      <div className="row wrap" style={{ gap: 12 }}>
        <div className="search grow" style={{ minWidth: 200, maxWidth: 380, width: '100%' }}>
          <Icon name="search" size={16} />
          <input
            type="text"
            className="input"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            placeholder="Search requests…"
            aria-label="Search requests"
          />
        </div>
        <select
          className="input sel"
          style={{ width: 180 }}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : requests.length === 0 ? (
        <div className="card">
          <Empty
            icon="inbox"
            title="No requests found"
            text={isRequestor ? 'Try a different filter, or submit a new request.' : 'Try changing the filter or search.'}
            action={isRequestor ? <Link href="/requests/new" className="btn btn-primary">New request</Link> : undefined}
          />
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="thead" style={{ gridTemplateColumns: cols }}>
            <span>Title / Event</span>
            <span>Type</span>
            <span>Priority</span>
            <span>Deadline</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {requests.map((req) => {
            const busy = updatingId === req.id;
            const task = req.tasks && req.tasks.length > 0 ? req.tasks[0] : null;
            return (
              <div
                key={req.id}
                className="trow"
                style={{
                  gridTemplateColumns: cols,
                  opacity: busy ? 0.6 : 1,
                  background: highlight === req.id ? 'var(--primary-soft)' : undefined,
                }}
              >
                <div className="m-full" style={{ minWidth: 0 }}>
                  <div className="col" style={{ minWidth: 0 }}>
                    <b className="trunc" style={{ fontWeight: 500 }}>{req.title}</b>
                    <span className="t-xs muted trunc">{req.event_name || 'No event linked'}</span>
                    {task ? (
                      <Link href={`/tasks/${task.id}`} className="lnk t-xs row" style={{ gap: 4 }}>
                        <Icon name="tasks" size={12} /> Task: {task.status.replace('_', ' ')}
                      </Link>
                    ) : null}
                  </div>
                </div>
                <div><TypeTag type={req.media_type} /></div>
                <div><Pri level={req.priority} /></div>
                <div><span className="t-sm">{fmtDate(req.deadline)}</span></div>
                <div><Chip status={req.status} /></div>
                <div>
                  <div className="row" style={{ gap: 8 }}>
                    {canManageTasks && req.status === 'pending' ? (
                      <>
                        <button type="button" className="btn btn-sm btn-ok" disabled={busy} onClick={() => handleApprove(req.id)}>Approve</button>
                        <button type="button" className="btn btn-sm btn-danger" disabled={busy} onClick={() => setRejecting(req)}>Reject</button>
                      </>
                    ) : (
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setViewing(req)}>View</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {totalPages > 1 ? (
            <div className="row" style={{ justifyContent: 'center', gap: 12, padding: 14, borderTop: '1px solid var(--line)' }}>
              <button type="button" className="btn btn-sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <Icon name="left" size={14} /> Previous
              </button>
              <span className="t-sm muted">Page {page} of {totalPages}</span>
              <button type="button" className="btn btn-sm" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Next <Icon name="right" size={14} />
              </button>
            </div>
          ) : null}
        </div>
      )}

      {rejecting ? (
        <Modal
          title="Reject request?"
          onClose={() => { setRejecting(null); setRejectNotes(''); }}
          footer={
            <>
              <button type="button" className="btn" onClick={() => { setRejecting(null); setRejectNotes(''); }}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={handleReject}>Reject</button>
            </>
          }
        >
          <div className="col" style={{ gap: 10 }}>
            <p className="muted">“{rejecting.title}” will be marked as rejected. The requestor is notified.</p>
            <div className="field">
              <label htmlFor="reject-notes">Reason (optional)</label>
              <textarea
                id="reject-notes"
                className="input"
                style={{ height: 88 }}
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Why is this being rejected?"
              />
            </div>
          </div>
        </Modal>
      ) : null}

      {viewing ? (
        <Modal
          title={viewing.title}
          onClose={() => setViewing(null)}
          footer={
            <>
              {viewing.tasks && viewing.tasks.length > 0 ? (
                <Link href={`/tasks/${viewing.tasks[0].id}`} className="btn btn-primary">View task</Link>
              ) : null}
              <button type="button" className="btn" onClick={() => setViewing(null)}>Close</button>
            </>
          }
        >
          <div className="col" style={{ gap: 10 }}>
            <div className="row wrap" style={{ gap: 8 }}>
              <Chip status={viewing.status} />
              <Pri level={viewing.priority} />
              <TypeTag type={viewing.media_type} />
            </div>
            <p style={{ whiteSpace: 'pre-wrap', color: 'var(--ink-2)' }}>{viewing.description}</p>
            <hr className="hr" />
            <div className="kv"><span>Deadline</span><span>{fmtDate(viewing.deadline)}</span></div>
            {viewing.event_name ? <div className="kv"><span>Event</span><span>{viewing.event_name}</span></div> : null}
            {viewing.target_platform ? <div className="kv"><span>Platform</span><span>{viewing.target_platform}</span></div> : null}
            {viewing.style_reference ? (
              <div className="kv">
                <span>Reference</span>
                {safeHttpUrl(viewing.style_reference) ? (
                  <a href={safeHttpUrl(viewing.style_reference)!} target="_blank" rel="noopener noreferrer" className="lnk">Open link</a>
                ) : (
                  <span className="trunc">{viewing.style_reference}</span>
                )}
              </div>
            ) : null}
            {viewing.coordinator_notes ? <div className="kv"><span>Notes</span><span>{viewing.coordinator_notes}</span></div> : null}
          </div>
        </Modal>
      ) : null}
    </>
  );
}

export default function RequestsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={5} />}>
      <RequestsInner />
    </Suspense>
  );
}
