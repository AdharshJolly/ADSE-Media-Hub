'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Icon, PageHead } from '@/components/ui/kit';
import type { IconName } from '@/components/ui/kit';

const MEDIA: Array<{ value: string; label: string; icon: IconName }> = [
  { value: 'graphic_design', label: 'Graphic design', icon: 'image' },
  { value: 'photography', label: 'Photography', icon: 'camera' },
  { value: 'video_production', label: 'Video production', icon: 'video' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export default function NewRequestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    mediaType: '',
    eventName: '',
    targetPlatform: '',
    styleReference: '',
    deadline: '',
    priority: 'medium',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.mediaType) {
      toast.error('Choose a media type');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, deadline: new Date(formData.deadline).toISOString() }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Request submitted');
        router.push('/requests');
      } else {
        toast.error(data.error || 'Failed to submit request');
      }
    } catch {
      toast.error('Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="col" style={{ gap: 8 }}>
        <Link href="/requests" className="row t-sm muted" style={{ gap: 6 }}>
          <Icon name="left" size={16} /> Back to requests
        </Link>
        <PageHead title="Submit a request" sub="Tell the media team what you need and when." />
      </div>

      <form onSubmit={handleSubmit} className="card card-p col" style={{ gap: 18, maxWidth: 760 }}>
        <div className="field">
          <label htmlFor="title">Request title *</label>
          <input id="title" className="input" name="title" value={formData.title} onChange={handleChange} placeholder="What should we call it?" required />
        </div>
        <div className="field">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            className="input"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe what you need: size, orientation, copy, brand guidelines"
            style={{ height: 104 }}
            required
          />
        </div>

        <div className="field">
          <label id="media-label">Media type *</label>
          <div className="row" role="radiogroup" aria-labelledby="media-label" style={{ gap: 10, alignItems: 'stretch' }}>
            {MEDIA.map((m) => {
              const on = formData.mediaType === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setFormData({ ...formData, mediaType: m.value })}
                  className="col"
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    minHeight: 76,
                    padding: 10,
                    borderRadius: 12,
                    border: `1.5px solid ${on ? 'var(--primary)' : 'var(--line)'}`,
                    background: on ? 'var(--primary-soft)' : 'var(--surface)',
                    color: on ? 'var(--primary-text)' : 'var(--ink-2)',
                    boxShadow: on ? '0 0 0 3px var(--ring)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Icon name={m.icon} size={22} />
                  <span className="t-sm" style={{ fontWeight: 500, textAlign: 'center' }}>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="field">
          <label id="priority-label">Priority *</label>
          <div className="seg" role="radiogroup" aria-labelledby="priority-label" style={{ display: 'flex' }}>
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={formData.priority === p.value}
                className={formData.priority === p.value ? 'on' : ''}
                style={{ flex: 1 }}
                onClick={() => setFormData({ ...formData, priority: p.value })}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid g2">
          <div className="field">
            <label htmlFor="eventName">Event name</label>
            <input id="eventName" className="input" name="eventName" value={formData.eventName} onChange={handleChange} placeholder="If related to an event" />
          </div>
          <div className="field">
            <label htmlFor="targetPlatform">Target platform</label>
            <input id="targetPlatform" className="input" name="targetPlatform" value={formData.targetPlatform} onChange={handleChange} placeholder="e.g. Instagram, print" />
          </div>
        </div>

        <div className="field">
          <label htmlFor="styleReference">Style reference link</label>
          <input id="styleReference" className="input" type="url" name="styleReference" value={formData.styleReference} onChange={handleChange} placeholder="https://" />
        </div>

        <div className="field">
          <label htmlFor="deadline">Desired deadline *</label>
          <input id="deadline" className="input" type="datetime-local" name="deadline" value={formData.deadline} onChange={handleChange} required />
        </div>

        <hr className="hr" />
        <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={() => router.push('/requests')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Icon name="send" size={16} /> {loading ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </form>
    </>
  );
}
