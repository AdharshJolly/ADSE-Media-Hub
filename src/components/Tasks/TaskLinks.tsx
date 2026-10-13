'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Icon, Modal, fmtDate } from '@/components/ui/kit';
import { Skeleton } from '@/components/ui/skeleton';
import type { TaskLink } from '@/types/database';

interface TaskLinksProps {
  taskId: string;
  currentUserId: string;
  canManage: boolean;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

export default function TaskLinks({ taskId, currentUserId, canManage }: TaskLinksProps) {
  const [links, setLinks] = useState<TaskLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/links`);
      const data = await response.json();
      if (data.success) setLinks(data.links);
    } catch {
      toast.error('Failed to fetch links');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleSubmit = async () => {
    if (!url.trim()) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, title, description }),
      });
      const data = await response.json();
      if (data.success) {
        setLinks((prev) => [data.link, ...prev]);
        setUrl('');
        setTitle('');
        setDescription('');
        setShowForm(false);
        toast.success('Link added');
      } else {
        toast.error(data.error || 'Failed to add link');
      }
    } catch {
      toast.error('Failed to add link');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const linkId = toDelete;
    setToDelete(null);
    if (!linkId) return;
    try {
      const response = await fetch(`/api/links/${linkId}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setLinks((prev) => prev.filter((l) => l.id !== linkId));
        toast.success('Link deleted');
      } else {
        toast.error(data.error || 'Failed to delete link');
      }
    } catch {
      toast.error('Failed to delete link');
    }
  };

  return (
    <div className="card card-p col" style={{ gap: 16 }}>
      <div className="sp">
        <h2 className="t-h2">Resource links</h2>
        <button type="button" className="btn btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : (<><Icon name="plus" size={14} /> Add</>)}
        </button>
      </div>

      {showForm ? (
        <div className="col" style={{ gap: 10, padding: 12, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface-2)' }}>
          <input className="input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/…" />
          <input className="input" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" />
          <input className="input" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={submitting || !url.trim()}>
              {submitting ? 'Adding…' : 'Add link'}
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <Skeleton style={{ height: 44 }} />
      ) : links.length === 0 ? (
        <p className="t-sm muted">No links added yet.</p>
      ) : (
        links.map((link) => (
          <div key={link.id} className="row" style={{ gap: 12, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface-2)', minHeight: 44 }}>
            <span className="ico" style={{ color: 'var(--primary-text)', display: 'grid' }}>
              <Icon name="link" size={18} />
            </span>
            <div className="col grow" style={{ minWidth: 0 }}>
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="trunc" style={{ fontWeight: 500 }}>
                {link.title || getDomain(link.url)}
              </a>
              <span className="t-xs muted trunc">
                {link.description ? `${link.description} · ` : ''}
                {getDomain(link.url)} · {link.user?.name || 'Unknown'} · {fmtDate(link.created_at, false)}
              </span>
            </div>
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="icon-btn" style={{ width: 32, height: 32, boxShadow: 'none' }} aria-label="Open link">
              <Icon name="ext" size={16} />
            </a>
            {link.user_id === currentUserId || canManage ? (
              <button type="button" className="icon-btn" style={{ width: 32, height: 32, boxShadow: 'none' }} aria-label="Delete link" onClick={() => setToDelete(link.id)}>
                <Icon name="trash" size={16} />
              </button>
            ) : null}
          </div>
        ))
      )}

      {toDelete ? (
        <Modal
          title="Delete link?"
          onClose={() => setToDelete(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setToDelete(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </>
          }
        >
          <p className="muted">This link will be removed from the task.</p>
        </Modal>
      ) : null}
    </div>
  );
}
