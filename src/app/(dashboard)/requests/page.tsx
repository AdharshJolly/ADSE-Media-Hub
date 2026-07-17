'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useDebounce } from '@/hooks/useDebounce';
import { TableSkeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

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

export default function RequestsPage() {
  const { canManageTasks, isRequestor } = useAuth();
  const [requests, setRequests] = useState<RequestWithTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const debouncedStatus = useDebounce(statusFilter, 300);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedStatus) params.set('status', debouncedStatus);
      if (debouncedSearch) params.set('search', debouncedSearch);
      params.set('page', page.toString());
      params.set('pageSize', '10');

      const response = await fetch(`/api/requests?${params}`);
      const data = await response.json();
      if (data.success) {
        setRequests(data.data);
        setTotalPages(data.totalPages);
        setTotalCount(data.count);
      }
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
    
    setRequests(prev => prev.map(r => 
      r.id === requestId ? { ...r, status: 'approved' } : r
    ));

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
        fetchRequests(); // Refresh to show linked task
      }
    } catch {
      setRequests(originalRequests);
      toast.error('Failed to approve request');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    const notes = prompt('Reason for rejection:');
    if (notes === null) return;

    setUpdatingId(requestId);
    const originalRequests = [...requests];
    
    setRequests(prev => prev.map(r => 
      r.id === requestId ? { ...r, status: 'rejected' } : r
    ));

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

  const getStatusBadgeStyles = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
      approved: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
      rejected: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
      completed: 'bg-sky-500/10 text-sky-500 border border-sky-500/20',
    };
    return styles[status] || 'bg-muted text-muted-foreground border border-border';
  };

  const getPriorityBadgeStyles = (priority: string) => {
    const styles: Record<string, string> = {
      urgent: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
      high: 'bg-orange-500/10 text-orange-500 border border-orange-500/20',
      medium: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
      low: 'bg-slate-500/10 text-slate-500 border border-slate-500/20',
    };
    return styles[priority] || 'bg-muted text-muted-foreground border border-border';
  };

  const getMediaTypeBadgeStyles = (mediaType: string) => {
    const styles: Record<string, string> = {
      graphic_design: 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20',
      photography: 'bg-purple-500/10 text-purple-500 border border-purple-500/20',
      video_production: 'bg-fuchsia-500/10 text-fuchsia-500 border border-fuchsia-500/20',
    };
    return styles[mediaType] || 'bg-violet-500/10 text-violet-500 border border-violet-500/20';
  };

  const getLinkedTaskBadge = (req: RequestWithTask) => {
    if (!req.tasks || req.tasks.length === 0) return null;
    const task = req.tasks[0];
    const statusColors: Record<string, string> = {
      pending: 'bg-amber-500/10 text-amber-500',
      in_progress: 'bg-primary/10 text-primary',
      completed: 'bg-emerald-500/10 text-emerald-500',
      overdue: 'bg-red-500/10 text-red-500',
    };
    return (
      <Link
        href={`/tasks?highlight=${task.id}`}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${statusColors[task.status] || 'bg-muted text-muted-foreground'} hover:opacity-80 transition-opacity`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Task: {task.status.replace('_', ' ')}
      </Link>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Media Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">Submit, monitor, and manage your asset requests. ({totalCount} total)</p>
        </div>
        {isRequestor && (
          <Link
            href="/requests/new"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-200"
          >
            New Request
          </Link>
        )}
      </div>

      {/* Filters Card */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-full sm:w-64">
            <label className="block text-xs font-medium text-muted-foreground mb-2">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="flex-1 w-full sm:w-auto">
            <label className="block text-xs font-medium text-muted-foreground mb-2">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search requests..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition"
            />
          </div>
        </div>
      </div>

      {/* Requests Table */}
      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Title / Event</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Deadline</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      <p className="font-medium text-sm">No requests found</p>
                      <p className="text-xs mt-1">Try changing the filter or create a new request.</p>
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => {
                    const isUpdating = updatingId === req.id;
                    return (
                      <tr key={req.id} className={`hover:bg-muted/20 transition-colors ${isUpdating ? 'opacity-60' : ''}`}>
                        <td className="px-5 py-4">
                          <div className="font-medium text-foreground text-sm line-clamp-1">{req.title}</div>
                          {req.event_name ? (
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-yellow-accent inline-block"></span>
                              {req.event_name}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground/60 mt-0.5">No event linked</div>
                          )}
                          {getLinkedTaskBadge(req)}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${getMediaTypeBadgeStyles(req.media_type)}`}>
                            {req.media_type?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${getPriorityBadgeStyles(req.priority)}`}>
                            {req.priority}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-foreground/80 font-medium">
                          {format(new Date(req.deadline), 'MMM d, yyyy')}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${getStatusBadgeStyles(req.status)}`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex space-x-2">
                            {canManageTasks && req.status === 'pending' ? (
                              <>
                                <button
                                  onClick={() => handleApprove(req.id)}
                                  disabled={isUpdating}
                                  className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 transition cursor-pointer disabled:opacity-50"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(req.id)}
                                  disabled={isUpdating}
                                  className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20 transition cursor-pointer disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground/60">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 py-4 border-t border-border">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
