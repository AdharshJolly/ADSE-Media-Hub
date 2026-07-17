'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import type { TaskLink } from '@/types/database';

interface TaskLinksProps {
  taskId: string;
  currentUserId: string;
  canManage: boolean;
}

function getLinkIcon(url: string) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('drive.google.com') || hostname.includes('docs.google.com')) {
      return (
        <div className="w-8 h-8 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L6 8h4v6h4V8h4L12 2zm-6 16v2h12v-2H6z" />
          </svg>
        </div>
      );
    }
    if (hostname.includes('figma.com')) {
      return (
        <div className="w-8 h-8 bg-purple-500/10 text-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 24c2.2 0 4-1.8 4-4v-4H8c-2.2 0-4 1.8-4 4s1.8 4 4 4zm0-20C5.8 4 4 5.8 4 8s1.8 4 4 4h4V4H8zm8 0h-4v8h4c2.2 0 4-1.8 4-4s-1.8-4-4-4zm-4 8c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4z" />
          </svg>
        </div>
      );
    }
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return (
        <div className="w-8 h-8 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z" />
          </svg>
        </div>
      );
    }
    if (hostname.includes('notion.so') || hostname.includes('notion.site')) {
      return (
        <div className="w-8 h-8 bg-foreground/10 text-foreground rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.81 0 .147-.739-.246-.935L18.2 2.16c-.393-.27-.938-.5-1.875-.439L4.479 3.776c-.578.041-.677.417-.146.654l.126.078zm.599 3.07v10.44c0 .511.37.877.793.877l12.938-.756c.489 0 .793-.478.793-.936V6.39c0-.394-.236-.739-.599-.877l-13.732-.949c-.511-.041-.936.328-.936.755zm7.323 1.599v3.124H7.858V8.877h4.164zm0 5.04v3.124H7.858v-3.124h4.164zm4.164-5.04v3.124h-4.164V8.877h4.164zm0 5.04v3.124h-4.164v-3.124h4.164z" />
          </svg>
        </div>
      );
    }
  } catch {}

  // Default link icon
  return (
    <div className="w-8 h-8 bg-muted text-muted-foreground rounded-lg flex items-center justify-center flex-shrink-0">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    </div>
  );
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

  const fetchLinks = useCallback(async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/links`);
      const data = await response.json();
      if (data.success) {
        setLinks(data.links);
      }
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
        setLinks(prev => [data.link, ...prev]);
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

  const handleDelete = async (linkId: string) => {
    if (!confirm('Delete this link?')) return;

    try {
      const response = await fetch(`/api/links/${linkId}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setLinks(prev => prev.filter(l => l.id !== linkId));
        toast.success('Link deleted');
      } else {
        toast.error(data.error || 'Failed to delete link');
      }
    } catch {
      toast.error('Failed to delete link');
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Links</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-primary hover:text-primary/80 font-medium"
        >
          {showForm ? 'Cancel' : '+ Add Link'}
        </button>
      </div>

      {/* Add Link Form */}
      {showForm && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg space-y-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://drive.google.com/..."
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !url.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Adding...' : 'Add Link'}
          </button>
        </div>
      )}

      {/* Links List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="animate-pulse flex gap-3 p-3">
              <div className="w-8 h-8 bg-muted rounded-lg" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-32 bg-muted rounded" />
                <div className="h-2 w-48 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : links.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No links added yet.</p>
      ) : (
        <div className="space-y-2">
          {links.map(link => (
            <div key={link.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group">
              {getLinkIcon(link.url)}
              <div className="flex-1 min-w-0">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-foreground hover:text-primary truncate block"
                >
                  {link.title || getDomain(link.url)}
                </a>
                {link.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{link.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {getDomain(link.url)} · {link.user?.name || 'Unknown'} · {format(new Date(link.created_at), 'MMM d')}
                </p>
              </div>
              {(link.user_id === currentUserId || canManage) && (
                <button
                  onClick={() => handleDelete(link.id)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-red-500 transition-opacity"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
