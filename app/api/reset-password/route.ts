import { NextResponse } from 'next/server';
import { store, generateOTP } from '@/lib/store';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const backendUrl = process.env.BACKEND_URL;
    if (backendUrl) {
      try {
        const response = await fetch(`${backendUrl}/api/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(20000),
        });
        if (response.ok) return NextResponse.json(await response.json());
      } catch { /* backend unreachable */ }
    }

    const email = (body.email || '').trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const otp = generateOTP();
    store.otps.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000 }); // 10 min

    console.log(`[OTP] ${email} → ${otp}`); // visible in Vercel logs

    // In production, you'd send email here. For demo, OTP is in server logs.
    return NextResponse.json({
      message: 'OTP sent to your email address.',
      // Only expose OTP in non-production for easy testing
      ...(process.env.NODE_ENV !== 'production' ? { demo_otp: otp } : {}),
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
