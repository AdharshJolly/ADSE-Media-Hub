'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import AuthLayout from '@/components/Auth/AuthLayout';
import { Field, Icon } from '@/components/ui/kit';

function ResetForm() {
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await response.json();
      if (data.success) setDone(true);
      else toast.error(data.error || 'Reset failed');
    } catch {
      toast.error('Reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="col" style={{ gap: 20 }}>
        <div className="col" style={{ gap: 6 }}>
          <h1 className="t-h1">Link not valid</h1>
          <p className="muted">This reset link is missing its token. Request a new one.</p>
        </div>
        <Link href="/forgot-password" className="btn btn-primary btn-block" style={{ height: 44 }}>
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="col" style={{ gap: 20 }}>
        <div className="note" style={{ background: 'var(--s-done-bg)', color: 'var(--s-done-fg)', borderColor: 'transparent' }}>
          <Icon name="check" />
          Password updated. All other sessions were signed out.
        </div>
        <Link href="/login" className="btn btn-primary btn-block" style={{ height: 44 }}>
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="col" style={{ gap: 20 }}>
      <Link href="/login" className="row t-sm muted">
        <Icon name="left" />
        Back to sign in
      </Link>
      <div className="col" style={{ gap: 6 }}>
        <h1 className="t-h1">Choose a new password</h1>
        <p className="muted">At least 8 characters.</p>
      </div>
      <Field label="New password" htmlFor="rp1">
        <input id="rp1" className="input" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} required />
      </Field>
      <Field label="Confirm new password" htmlFor="rp2">
        <input id="rp2" className="input" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      </Field>
      <button className="btn btn-primary btn-block" type="submit" disabled={loading} style={{ height: 44 }}>
        {loading ? 'Saving…' : 'Set new password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout headline="Almost back in." blurb="Pick a new password. The link you used stops working afterwards.">
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
    </AuthLayout>
  );
}
