'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      toast.success('Login successful!');
      router.push('/dashboard');
    } else {
      toast.error(result.error || 'Login failed');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="bg-card text-foreground p-8 md:p-10 rounded-2xl border border-border shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2 tracking-tight text-foreground">
          Media Team Portal
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          Sign in to your account
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground/90">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-yellow-outline focus:border-yellow-accent outline-hidden transition text-foreground placeholder:text-muted-foreground"
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground/90">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-yellow-outline focus:border-yellow-accent outline-hidden transition text-foreground placeholder:text-muted-foreground"
              placeholder="Enter your password"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/95 text-primary-foreground py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-yellow-outline focus:ring-offset-2 focus:ring-offset-background cursor-pointer"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <p className="text-center mt-6 text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-accent hover:text-accent/80 hover:underline transition font-medium">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
