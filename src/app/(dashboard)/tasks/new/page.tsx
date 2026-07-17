'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface TeamMember {
  user_id: string;
  name: string;
  email: string;
  skills: string;
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

  const fetchTeamMembers = useCallback(async () => {
    try {
      const response = await fetch('/api/users/team-members');
      const data = await response.json();
      if (data.success) {
        setTeamMembers(data.teamMembers);
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  }, []);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Task created successfully!');
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
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-6 tracking-tight">Create New Task</h1>
      
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Task Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-yellow-outline focus:border-yellow-accent transition-all duration-200"
            placeholder="Enter task title"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-yellow-outline focus:border-yellow-accent transition-all duration-200"
            placeholder="Describe the task requirements"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Media Type *</label>
            <select
              name="mediaType"
              value={formData.mediaType}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-yellow-outline focus:border-yellow-accent transition-all duration-200"
              required
            >
              <option value="" className="bg-card text-foreground">Select type</option>
              <option value="graphic_design" className="bg-card text-foreground">Graphic Design</option>
              <option value="photography" className="bg-card text-foreground">Photography</option>
              <option value="video_production" className="bg-card text-foreground">Video Production</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Priority *</label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-yellow-outline focus:border-yellow-accent transition-all duration-200"
              required
            >
              <option value="low" className="bg-card text-foreground">Low</option>
              <option value="medium" className="bg-card text-foreground">Medium</option>
              <option value="high" className="bg-card text-foreground">High</option>
              <option value="urgent" className="bg-card text-foreground">Urgent</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Assign To *</label>
            <select
              name="assignedTo"
              value={formData.assignedTo}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-yellow-outline focus:border-yellow-accent transition-all duration-200"
              required
            >
              <option value="" className="bg-card text-foreground">Select team member</option>
              {teamMembers.map((member) => (
                <option key={member.user_id} value={member.user_id} className="bg-card text-foreground">
                  {member.name} {member.skills ? `(${member.skills})` : ''}
                </option>
              ))}
            </select>
            {teamMembers.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1.5">No team members available</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Deadline *</label>
            <input
              type="datetime-local"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-yellow-outline focus:border-yellow-accent transition-all duration-200"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Additional Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-yellow-outline focus:border-yellow-accent transition-all duration-200"
            placeholder="Any additional instructions"
          />
        </div>

        <div className="flex space-x-4 pt-2">
          <button
            type="button"
            onClick={() => router.push('/tasks')}
            className="flex-1 bg-muted hover:bg-muted/80 text-foreground py-3 rounded-xl font-semibold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-yellow-accent text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 cursor-pointer shadow-lg shadow-yellow-accent/15 focus:outline-none focus:ring-2 focus:ring-yellow-outline"
          >
            {loading ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
}
