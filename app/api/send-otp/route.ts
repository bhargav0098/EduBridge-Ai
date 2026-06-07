import { NextResponse } from 'next/server';
import { store, generateOTP } from '@/lib/store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();

    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    const otp = generateOTP();
    store.otps.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });
    console.log(`[OTP] ${email} → ${otp}`);

    return NextResponse.json({
      message: 'OTP sent successfully',
      ...(process.env.NODE_ENV !== 'production' ? { demo_otp: otp } : {}),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
