'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface User {
  user_id: string;
  email: string;
  name: string;
  role: string;
  skills: string;
  is_active: boolean;
  is_approved: boolean;
  created_at: string;
}

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleApprove = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/approve`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        toast.success('User approved successfully');
        fetchUsers();
      }
    } catch {
      toast.error('Failed to approve user');
    }
  };

  const handleDeactivate = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    
    try {
      const response = await fetch(`/api/users/${userId}/deactivate`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        toast.success('User deactivated');
        fetchUsers();
      }
    } catch {
      toast.error('Failed to deactivate user');
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      coordinator: 'bg-purple-100 text-purple-800',
      student_head: 'bg-blue-100 text-blue-800',
      requestor: 'bg-green-100 text-green-800',
      team_member: 'bg-orange-100 text-orange-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const filteredUsers = users.filter((u) => {
    if (filter === 'pending') return !u.is_approved;
    if (filter === 'active') return u.is_active && u.is_approved;
    if (filter === 'coordinators') return u.role === 'coordinator';
    if (filter === 'student_heads') return u.role === 'student_head';
    if (filter === 'team_members') return u.role === 'team_member';
    if (filter === 'requestors') return u.role === 'requestor';
    return true;
  });

  const pendingCount = users.filter((u) => !u.is_approved).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-orange-600 mt-1">
              {pendingCount} user{pendingCount > 1 ? 's' : ''} pending approval
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 flex flex-wrap gap-3">
        <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg transition ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          All ({users.length})
        </button>
        <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-lg transition ${filter === 'pending' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          Pending ({pendingCount})
        </button>
        <button onClick={() => setFilter('team_members')} className={`px-4 py-2 rounded-lg transition ${filter === 'team_members' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          Team Members
        </button>
        <button onClick={() => setFilter('requestors')} className={`px-4 py-2 rounded-lg transition ${filter === 'requestors' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          Requestors
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No users found</td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.user_id} className={`hover:bg-gray-50 ${!u.is_approved ? 'bg-orange-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">{u.name?.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="ml-4">
                        <p className="font-medium text-gray-800">{u.name}</p>
                        <p className="text-sm text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getRoleBadge(u.role)}`}>
                      {u.role?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {!u.is_approved ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">Pending Approval</span>
                    ) : u.is_active ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Active</span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Deactivated</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      {!u.is_approved && (
                        <button
                          onClick={() => handleApprove(u.user_id)}
                          className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-700 transition"
                        >
                          Approve
                        </button>
                      )}
                      {u.is_active && u.user_id !== user?.user_id && (
                        <button
                          onClick={() => handleDeactivate(u.user_id)}
                          className="bg-red-100 text-red-600 px-3 py-1 rounded-lg text-sm hover:bg-red-200 transition"
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
