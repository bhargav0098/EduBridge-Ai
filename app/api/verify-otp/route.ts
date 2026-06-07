import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();
    const otp = (body.otp || '').trim();

    if (!email || !otp) return NextResponse.json({ error: 'Email and OTP required' }, { status: 400 });

    const record = store.otps.get(email);
    if (!record) return NextResponse.json({ error: 'No OTP found. Request a new one.' }, { status: 400 });
    if (Date.now() > record.expiresAt) {
      store.otps.delete(email);
      return NextResponse.json({ error: 'OTP expired. Request a new one.' }, { status: 400 });
    }
    if (record.otp !== otp) return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });

    store.otps.delete(email);
    return NextResponse.json({ message: 'OTP verified successfully', verified: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
