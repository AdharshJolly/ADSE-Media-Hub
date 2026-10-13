'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';
import AuthLayout from '@/components/Auth/AuthLayout';
import { Field, Icon } from '@/components/ui/kit';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      toast.success('Signed in');
      router.push(result.mustChangePassword ? '/change-password' : '/dashboard');
    } else {
      toast.error(result.error || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <AuthLayout headline="Every campaign, in one calm queue." blurb="Requests, tasks and deadlines for the media team, tracked from first brief to final export." preview>
      <form onSubmit={handleSubmit} className="col" style={{ gap: 20 }}>
        <div className="col" style={{ gap: 6 }}>
          <h1 className="t-h1">Sign in</h1>
          <p className="muted">Use the email your coordinator registered.</p>
        </div>
        <Field label="Email" htmlFor="em">
          <input id="em" className="input" type="email" placeholder="you@adse.edu" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </Field>
        <div className="field">
          <div className="sp">
            <label htmlFor="pw">Password</label>
            <Link href="/forgot-password" className="lnk t-sm">Forgot password?</Link>
          </div>
          <div className="input">
            <input id="pw" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" style={{ border: 0, background: 'none', outline: 0, flex: 1, minWidth: 0, height: '100%', color: 'inherit', font: 'inherit' }} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} style={{ color: 'var(--muted)', height: 32, width: 32, display: 'grid', placeItems: 'center' }}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={loading} style={{ height: 44 }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <div className="note">
          <Icon name="alert" />
          There is no self sign-up. Ask your coordinator to add you.
        </div>
      </form>
    </AuthLayout>
  );
}
