'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Icon, PageHead } from '@/components/ui/kit';

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

export default function NewTaskPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    mediaType: '',
    priority: 'medium',
    deadline: '',
    assignedTo: '',
    notes: '',
  });

  useEffect(() => {
    fetch('/api/users/team-members')
      .then((r) => r.json())
      .then((d) => d.success && setTeamMembers(d.teamMembers))
      .catch((e) => console.error('Failed to fetch team members:', e));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, deadline: new Date(formData.deadline).toISOString() }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Task created');
        router.push('/tasks');
      } else {
        toast.error(data.error || 'Failed to create task');
      }
    } catch {
      toast.error('Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="col" style={{ gap: 8 }}>
        <Link href="/tasks" className="row t-sm muted" style={{ gap: 6 }}>
          <Icon name="left" size={16} /> Back to tasks
        </Link>
        <PageHead title="Create a new task" sub="Assign work to a team member and set the details." />
      </div>

      <form onSubmit={handleSubmit} className="card card-p col" style={{ gap: 18, maxWidth: 760 }}>
        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" className="input" name="title" value={formData.title} onChange={handleChange} placeholder="Short, clear task name" required />
        </div>
        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea id="description" className="input" name="description" value={formData.description} onChange={handleChange} placeholder="What needs to be made?" style={{ height: 104 }} />
        </div>
        <div className="grid g2">
          <div className="field">
            <label htmlFor="mediaType">Type</label>
            <select id="mediaType" className="input sel" name="mediaType" value={formData.mediaType} onChange={handleChange} required>
              <option value="">Select type</option>
              <option value="graphic_design">Graphic Design</option>
              <option value="photography">Photography</option>
              <option value="video_production">Video Production</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="priority">Priority</label>
            <select id="priority" className="input sel" name="priority" value={formData.priority} onChange={handleChange} required>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
        <div className="grid g2">
          <div className="field">
            <label htmlFor="assignedTo">Assign to</label>
            <select id="assignedTo" className="input sel" name="assignedTo" value={formData.assignedTo} onChange={handleChange} required>
              <option value="">Select team member</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            {teamMembers.length === 0 ? <span className="hint">No team members available</span> : null}
          </div>
          <div className="field">
            <label htmlFor="deadline">Deadline</label>
            <input id="deadline" className="input" type="datetime-local" name="deadline" value={formData.deadline} onChange={handleChange} required />
          </div>
        </div>
        <div className="field">
          <label htmlFor="notes">Additional notes</label>
          <textarea id="notes" className="input" name="notes" value={formData.notes} onChange={handleChange} placeholder="Anything the assignee should know" style={{ height: 80 }} />
        </div>
        <hr className="hr" />
        <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={() => router.push('/tasks')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Icon name="check" size={16} /> {loading ? 'Creating…' : 'Create task'}
          </button>
        </div>
      </form>
    </>
  );
}
