import { NextResponse } from 'next/server';
import { store, hashPassword } from '@/lib/store';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const backendUrl = process.env.BACKEND_URL;
    if (backendUrl) {
      try {
        const response = await fetch(`${backendUrl}/api/auth/reset-password/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(3000),
        });
        if (response.ok) return NextResponse.json(await response.json());
      } catch { /* backend unreachable */ }
    }

    const email = (body.email || '').trim().toLowerCase();
    const otp = (body.otp || '').trim();
    const newPassword = body.new_password || body.newPassword || '';

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: 'Email, OTP, and new password are required' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const record = store.otps.get(email);
    if (!record) {
      return NextResponse.json({ error: 'No OTP found. Please request a new one.' }, { status: 400 });
    }
    if (Date.now() > record.expiresAt) {
      store.otps.delete(email);
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }
    if (record.otp !== otp) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    // Update password
    const user = store.users.get(email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    user.hashedPassword = hashPassword(newPassword);
    store.users.set(email, user);
    store.otps.delete(email);

    return NextResponse.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
