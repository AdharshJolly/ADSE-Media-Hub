import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { getUserByEmail, createUser } from '@/lib/db';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role } = body;

    if (!email || !password || !name || !role) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    // Insert user directly via Supabase client
    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        name,
        role,
        skills: '',
        is_active: true,
        is_approved: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ success: false, error: error.message || 'Failed to create user' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ success: false, error: 'Failed to create user' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Pending admin approval.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ success: false, error: 'Registration failed' }, { status: 500 });
  }
}
