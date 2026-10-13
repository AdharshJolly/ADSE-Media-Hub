'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Avatar, Modal, fmtDate } from '@/components/ui/kit';
import { Skeleton } from '@/components/ui/skeleton';
import type { TaskComment } from '@/types/database';

interface TaskCommentsProps {
  taskId: string;
  currentUserId: string;
  canManage: boolean;
}

export default function TaskComments({ taskId, currentUserId, canManage }: TaskCommentsProps) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [toDelete, setToDelete] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`);
      const data = await response.json();
      if (data.success) setComments(data.comments);
    } catch {
      toast.error('Failed to fetch comments');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });
      const data = await response.json();
      if (data.success) {
        setComments((prev) => [...prev, data.comment]);
        setNewComment('');
        toast.success('Comment posted');
      } else {
        toast.error(data.error || 'Failed to post comment');
      }
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (commentId: string) => {
    if (!editContent.trim()) return;
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      });
      const data = await response.json();
      if (data.success) {
        setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, content: editContent } : c)));
        setEditingId(null);
        toast.success('Comment updated');
      } else {
        toast.error(data.error || 'Failed to update comment');
      }
    } catch {
      toast.error('Failed to update comment');
    }
  };

  const handleDelete = async () => {
    const commentId = toDelete;
    setToDelete(null);
    if (!commentId) return;
    try {
      const response = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        toast.success('Comment deleted');
      } else {
        toast.error(data.error || 'Failed to delete comment');
      }
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  return (
    <div className="card card-p col" style={{ gap: 18 }}>
      <h2 className="t-h2">
        Comments <span className="t-sm muted" style={{ fontWeight: 400 }}>{comments.length}</span>
      </h2>

      {loading ? (
        <>
          <Skeleton style={{ height: 40 }} />
          <Skeleton style={{ height: 40 }} />
        </>
      ) : comments.length === 0 ? (
        <p className="t-sm muted">No comments yet. Be the first to comment.</p>
      ) : (
        comments.map((c) => (
          <div key={c.id} className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
            <Avatar name={c.user?.name} />
            <div className="col grow" style={{ gap: 4, minWidth: 0 }}>
              <div className="row wrap" style={{ gap: 8 }}>
                <b style={{ fontWeight: 500 }}>{c.user?.name || 'Unknown'}</b>
                <span className="t-xs muted">{fmtDate(c.created_at)}</span>
              </div>
              {editingId === c.id ? (
                <div className="col" style={{ gap: 8 }}>
                  <textarea className="input" value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3} />
                  <div className="row">
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => handleUpdate(c.id)}>Save</button>
                    <button type="button" className="btn btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="t-sm" style={{ whiteSpace: 'pre-wrap', color: 'var(--ink-2)' }}>{c.content}</p>
              )}
              {editingId !== c.id && (c.user_id === currentUserId || canManage) ? (
                <div className="row" style={{ gap: 12 }}>
                  {c.user_id === currentUserId ? (
                    <button type="button" className="lnk t-xs" onClick={() => { setEditingId(c.id); setEditContent(c.content); }}>Edit</button>
                  ) : null}
                  <button type="button" className="lnk t-xs" onClick={() => setToDelete(c.id)}>Delete</button>
                </div>
              ) : null}
            </div>
          </div>
        ))
      )}

      <hr className="hr" />
      <div className="col" style={{ gap: 8 }}>
        <textarea className="input" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write a comment…" rows={3} />
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !newComment.trim()}>
            {submitting ? 'Posting…' : 'Post comment'}
          </button>
        </div>
      </div>

      {toDelete ? (
        <Modal
          title="Delete comment?"
          onClose={() => setToDelete(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setToDelete(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </>
          }
        >
          <p className="muted">This comment will be permanently removed.</p>
        </Modal>
      ) : null}
    </div>
  );
}
