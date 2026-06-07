import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { store, hashPassword, makeToken } from '@/lib/store';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Try real Python backend first
    const backendUrl = process.env.BACKEND_URL;
    if (backendUrl) {
      try {
        const response = await fetch(`${backendUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(20000),
        });
        if (response.ok) {
          const data = await response.json();
          return NextResponse.json(data);
        }
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(
          { error: errorData.detail || errorData.error || 'Registration failed' },
          { status: 400 }
        );
      } catch { /* backend unreachable */ }
    }

    // Demo mode — shared globalThis store
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    const name = (body.name || '').trim();
    const role = body.role || 'student';

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    if (store.users.has(email)) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    store.users.set(email, { id, name, email, role, hashedPassword: hashPassword(password), createdAt: new Date().toISOString() });

    const token = makeToken(email, id);
    return NextResponse.json({
      access_token: token,
      refresh_token: token,
      token_type: 'bearer',
      user: { id, name, email, role, created_at: new Date().toISOString() },
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
