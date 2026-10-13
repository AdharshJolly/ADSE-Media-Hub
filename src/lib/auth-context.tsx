'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: 'coordinator' | 'student_head' | 'requestor' | 'team_member';
  skills: string;
  is_active: boolean;
  is_approved: boolean;
  must_change_password?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  maintenance: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<{ success: boolean; error?: string; mustChangePassword?: boolean }>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  isCoordinator: boolean;
  isStudentHead: boolean;
  isTeamMember: boolean;
  isRequestor: boolean;
  canManageTasks: boolean;
  canManageUsers: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        setMaintenance(data.maintenance === true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string, remember = false) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, remember }),
      });
      const data = await response.json();
      
      if (data.success) {
        setMaintenance(data.maintenance === true);
        setUser({ ...data.user, must_change_password: data.mustChangePassword });
        return { success: true, mustChangePassword: data.mustChangePassword === true };
      }
      return { success: false, error: data.error };
    } catch {
      return { success: false, error: 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isCoordinator = user?.role === 'coordinator';
  const isStudentHead = user?.role === 'student_head';
  const isTeamMember = user?.role === 'team_member';
  const isRequestor = user?.role === 'requestor';
  const canManageTasks = isCoordinator || isStudentHead;
  const canManageUsers = isCoordinator;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        maintenance,
        login,
        refreshUser: checkAuth,
        logout,
        isCoordinator,
        isStudentHead,
        isTeamMember,
        isRequestor,
        canManageTasks,
        canManageUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
