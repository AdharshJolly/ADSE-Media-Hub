'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface SystemStats {
  users: { total: number; active: number; pending: number };
  tasks: { total: number; active: number; completed: number };
  requests: { total: number; pending: number; approved: number };
}

interface SystemSettings {
  maintenanceMode: boolean;
  allowRegistration: boolean;
  emailNotifications: boolean;
  taskAutoAssign: boolean;
}

export default function AdminPage() {
  const { user, canManageUsers } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [settings, setSettings] = useState<SystemSettings>({
    maintenanceMode: false,
    allowRegistration: true,
    emailNotifications: true,
    taskAutoAssign: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Redirect if not coordinator
  useEffect(() => {
    if (!canManageUsers && !loading) {
      router.push('/dashboard');
      toast.error('Access denied');
    }
  }, [canManageUsers, loading, router]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch {
      console.error('Failed to fetch admin stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSettingChange = async (key: keyof SystemSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaving(true);
    
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Setting updated');
      } else {
        setSettings(prev => ({ ...prev, [key]: !value }));
        toast.error('Failed to update setting');
      }
    } catch {
      setSettings(prev => ({ ...prev, [key]: !value }));
      toast.error('Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
        <p className="text-sm text-muted-foreground mt-1">System management and configuration</p>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Users</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold text-foreground">{stats?.users.total || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Active</span>
              <span className="font-semibold text-emerald-500">{stats?.users.active || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pending</span>
              <span className="font-semibold text-amber-500">{stats?.users.pending || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tasks</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold text-foreground">{stats?.tasks.total || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Active</span>
              <span className="font-semibold text-primary">{stats?.tasks.active || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-semibold text-emerald-500">{stats?.tasks.completed || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Requests</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold text-foreground">{stats?.requests.total || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pending</span>
              <span className="font-semibold text-amber-500">{stats?.requests.pending || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Approved</span>
              <span className="font-semibold text-emerald-500">{stats?.requests.approved || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Settings */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-4">System Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Maintenance Mode</p>
              <p className="text-xs text-muted-foreground">Disable access for non-admin users</p>
            </div>
            <button
              onClick={() => handleSettingChange('maintenanceMode', !settings.maintenanceMode)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.maintenanceMode ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Allow Registration</p>
              <p className="text-xs text-muted-foreground">Allow new users to register accounts</p>
            </div>
            <button
              onClick={() => handleSettingChange('allowRegistration', !settings.allowRegistration)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.allowRegistration ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.allowRegistration ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Email Notifications</p>
              <p className="text-xs text-muted-foreground">Send email notifications for important events</p>
            </div>
            <button
              onClick={() => handleSettingChange('emailNotifications', !settings.emailNotifications)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.emailNotifications ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Auto-assign Tasks</p>
              <p className="text-xs text-muted-foreground">Automatically assign tasks to available team members</p>
            </div>
            <button
              onClick={() => handleSettingChange('taskAutoAssign', !settings.taskAutoAssign)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.taskAutoAssign ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.taskAutoAssign ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => router.push('/users')}
            className="p-4 bg-muted/50 hover:bg-muted rounded-lg text-left transition-colors"
          >
            <p className="text-sm font-medium text-foreground">Manage Users</p>
            <p className="text-xs text-muted-foreground mt-1">Approve, deactivate, edit roles</p>
          </button>
          <button
            onClick={() => router.push('/tasks')}
            className="p-4 bg-muted/50 hover:bg-muted rounded-lg text-left transition-colors"
          >
            <p className="text-sm font-medium text-foreground">View Tasks</p>
            <p className="text-xs text-muted-foreground mt-1">All tasks across the system</p>
          </button>
          <button
            onClick={() => router.push('/requests')}
            className="p-4 bg-muted/50 hover:bg-muted rounded-lg text-left transition-colors"
          >
            <p className="text-sm font-medium text-foreground">Review Requests</p>
            <p className="text-xs text-muted-foreground mt-1">Pending media requests</p>
          </button>
          <button
            onClick={() => fetchStats()}
            className="p-4 bg-muted/50 hover:bg-muted rounded-lg text-left transition-colors"
          >
            <p className="text-sm font-medium text-foreground">Refresh Data</p>
            <p className="text-xs text-muted-foreground mt-1">Update statistics</p>
          </button>
        </div>
      </div>
    </div>
  );
}
