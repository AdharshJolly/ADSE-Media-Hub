'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Request {
  request_id: string;
  title: string;
  description: string;
  media_type: string;
  priority: string;
  deadline: string;
  status: string;
  event_name: string;
}

export default function RequestsPage() {
  const { canManageTasks, isRequestor } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchRequests = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      
      const response = await fetch(`/api/requests?${params}`);
      const data = await response.json();
      if (data.success) {
        setRequests(data.requests);
      }
    } catch {
      toast.error('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (requestId: string) => {
    try {
      const response = await fetch(`/api/requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Approved' }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Request approved');
        fetchRequests();
      }
    } catch {
      toast.error('Failed to approve request');
    }
  };

  const handleReject = async (requestId: string) => {
    const notes = prompt('Reason for rejection:');
    if (notes === null) return;

    try {
      const response = await fetch(`/api/requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Request rejected');
        fetchRequests();
      }
    } catch {
      toast.error('Failed to reject request');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-yellow-accent border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Media Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">Submit, monitor, and manage your asset requests.</p>
        </div>
        {isRequestor && (
          <Link
            href="/requests/new"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold bg-yellow-accent text-primary-foreground hover:opacity-90 transition-all shadow-lg shadow-yellow-accent/15 focus:outline-none focus:ring-2 focus:ring-yellow-outline"
          >
            New Request
          </Link>
        )}
      </div>

      {/* Filters Card */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="w-full sm:w-64">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Filter by Status</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-3.5 py-2 bg-background border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-yellow-outline focus:border-yellow-accent transition"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="text-xs text-muted-foreground">
            Showing {requests.length} request{requests.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {/* Requests Table Soft Card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title / Event</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deadline</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <svg className="w-8 h-8 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      <p className="font-medium text-sm">No requests found</p>
                      <p className="text-xs">Try changing the status filter or create a new request.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.request_id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground text-sm line-clamp-1">{req.title}</div>
                      {req.event_name ? (
                        <div className="text-xs text-muted-foreground mt-0.5 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-accent inline-block"></span>
                          {req.event_name}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground/60 mt-0.5 italic">No event linked</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider ${getMediaTypeBadgeStyles(req.media_type)}`}>
                        {req.media_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider ${getPriorityBadgeStyles(req.priority)}`}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground/80 font-medium">
                      {format(new Date(req.deadline), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider ${getStatusBadgeStyles(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex space-x-2">
                        {canManageTasks && req.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleApprove(req.request_id)}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 transition cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(req.request_id)}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20 transition cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground/60 italic">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

