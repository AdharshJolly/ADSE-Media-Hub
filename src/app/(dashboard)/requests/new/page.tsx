'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Request submitted successfully!');
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

  const inputBaseClasses = "w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-yellow-outline focus:border-yellow-accent transition-all duration-200";

  return (
    <div className="max-w-3xl mx-auto px-4 py-2">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Submit Media Request</h1>
        <p className="text-sm text-muted-foreground mt-1">Provide reference materials and requirements to request assets from the media team.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Request Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={inputBaseClasses}
              placeholder="e.g., Summer Festival Instagram Flyer"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className={inputBaseClasses}
              placeholder="Describe your media requirements, size, orientation, design elements, copy/text to include, and brand guidelines..."
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Media Type *</label>
            <select
              name="mediaType"
              value={formData.mediaType}
              onChange={handleChange}
              className={inputBaseClasses}
              required
            >
              <option value="">Select media type</option>
              <option value="graphic_design">Graphic Design</option>
              <option value="photography">Photography</option>
              <option value="video_production">Video Production</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Priority *</label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className={inputBaseClasses}
              required
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Event Name</label>
            <input
              type="text"
              name="eventName"
              value={formData.eventName}
              onChange={handleChange}
              className={inputBaseClasses}
              placeholder="If related to an event (optional)"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Target Platform</label>
            <input
              type="text"
              name="targetPlatform"
              value={formData.targetPlatform}
              onChange={handleChange}
              className={inputBaseClasses}
              placeholder="e.g., Instagram Reel, YouTube Thumbnail, TikTok"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Style Reference Link</label>
            <input
              type="url"
              name="styleReference"
              value={formData.styleReference}
              onChange={handleChange}
              className={inputBaseClasses}
              placeholder="Google Drive, Pinterest, Figma link..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Desired Deadline *</label>
            <input
              type="datetime-local"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              className={inputBaseClasses}
              required
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-border">
          <button
            type="button"
            onClick={() => router.push('/requests')}
            className="flex-1 inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-muted transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold bg-yellow-accent text-primary-foreground hover:opacity-90 transition disabled:opacity-50 cursor-pointer shadow-lg shadow-yellow-accent/10 focus:outline-none focus:ring-2 focus:ring-yellow-outline"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
}

