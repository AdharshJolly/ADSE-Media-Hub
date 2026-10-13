'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import AuthLayout from '@/components/Auth/AuthLayout';
import { Field, Icon } from '@/components/ui/kit';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (data.success) setSent(true);
      else toast.error(data.error || 'Request failed');
    } catch {
      toast.error('Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout headline="Locked out? It happens." blurb="We email a one-time reset link. Your current password keeps working until you use it.">
      <form onSubmit={handleSubmit} className="col" style={{ gap: 20 }}>
        <Link href="/login" className="row t-sm muted">
          <Icon name="left" />
          Back to sign in
        </Link>
        <div className="col" style={{ gap: 6 }}>
          <h1 className="t-h1">Reset your password</h1>
          <p className="muted">Enter your account email and we will send a link to choose a new one.</p>
        </div>
        <Field label="Email" htmlFor="fe">
          <input id="fe" className="input" type="email" placeholder="you@adse.edu" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <button className="btn btn-primary btn-block" type="submit" disabled={loading} style={{ height: 44 }}>
          {loading ? 'Sending…' : 'Email me a reset link'}
        </button>
        {sent ? (
          <div className="note" style={{ background: 'var(--s-done-bg)', color: 'var(--s-done-fg)', borderColor: 'transparent' }}>
            <Icon name="check" />
            If that email is registered, a reset link is on its way. It works once and expires in 30 minutes.
          </div>
        ) : null}
      </form>
    </AuthLayout>
  );
}
