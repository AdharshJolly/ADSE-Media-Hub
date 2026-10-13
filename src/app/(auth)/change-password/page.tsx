'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';
import AuthLayout from '@/components/Auth/AuthLayout';
import { Field, Icon } from '@/components/ui/kit';

export default function ChangePasswordPage() {
  const { user, loading: authLoading, refreshUser, logout } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const longEnough = newPassword.length >= 8;
  const matches = confirm.length > 0 && newPassword === confirm;
  const strength = Math.min(100, Math.round((Math.min(newPassword.length, 14) / 14) * 100));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matches) {
      toast.error('New passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (data.success) {
        await refreshUser();
        toast.success('Password updated');
        router.push('/dashboard');
      } else {
        toast.error(data.error || 'Failed to update password');
      }
    } catch {
      toast.error('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return null;

  const rule = (ok: boolean, text: string) => (
    <span className="row t-sm" style={{ gap: 8, color: ok ? 'var(--s-done-fg)' : 'var(--muted)' }}>
      <Icon name={ok ? 'check' : 'clock'} />
      {text}
    </span>
  );

  return (
    <AuthLayout
      headline={user.must_change_password ? 'One last step before you start.' : 'Keep your account secure.'}
      blurb={user.must_change_password ? 'The password in your email was temporary. Choose one only you know.' : 'Enter your current password and pick a new one.'}
    >
      <form onSubmit={handleSubmit} className="col" style={{ gap: 20 }}>
        <div className="col" style={{ gap: 6 }}>
          <h1 className="t-h1">Set a new password</h1>
          <p className="muted">{user.must_change_password ? 'Required before you can open the dashboard.' : 'Use at least 8 characters.'}</p>
        </div>
        <Field label={user.must_change_password ? 'Temporary password' : 'Current password'} htmlFor="cp">
          <input id="cp" className="input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
        </Field>
        <div className="field">
          <label htmlFor="np">New password</label>
          <input id="np" className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} maxLength={72} required autoComplete="new-password" />
          <div className="bar" style={{ marginTop: 4 }}>
            <i style={{ width: `${strength}%` }} />
          </div>
          <span className="hint">At least 8 characters.</span>
        </div>
        <Field label="Confirm new password" htmlFor="rp">
          <input id="rp" className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
        </Field>
        <div className="col" style={{ gap: 2 }}>
          {rule(longEnough, '8 or more characters')}
          {rule(matches, 'Both entries match')}
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={loading} style={{ height: 44 }}>
          {loading ? 'Saving…' : 'Save and continue'}
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={logout}>Sign out</button>
      </form>
    </AuthLayout>
  );
}
