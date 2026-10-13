// Creates the first coordinator account and prints a one-time random password.
// Usage: npm run seed:admin -- you@example.com "Your Name"
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const [email, name = 'Coordinator'] = process.argv.slice(2);
if (!email || !email.includes('@')) {
  console.error('Usage: npm run seed:admin -- <email> [name]');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const password = randomBytes(9).toString('base64url');
const password_hash = await bcrypt.hash(password, 10);

const { error } = await supabase.from('users').insert({
  email: email.trim().toLowerCase(),
  name,
  role: 'coordinator',
  password_hash,
  is_active: true,
  is_approved: true,
  must_change_password: true,
});

if (error) {
  console.error('Failed:', error.message);
  process.exit(1);
}

console.log(`Coordinator created: ${email}`);
console.log(`Temporary password: ${password}`);
console.log('You will be asked to change it on first login.');
