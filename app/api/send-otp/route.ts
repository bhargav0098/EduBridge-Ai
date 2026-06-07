import { NextRequest, NextResponse } from 'next/server';
import { store, generateOTP } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const backendUrl = process.env.BACKEND_URL;
    if (backendUrl) {
      try {
        const response = await fetch(`${backendUrl}/api/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
          signal: AbortSignal.timeout(3000),
        });
        if (response.ok) {
          const data = await response.json();
          return NextResponse.json(data);
        }
      } catch { /* backend unreachable */ }
    }

    const otp = generateOTP();
    store.otps.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000 }); // 10 min

    console.log(`[OTP] ${email} → ${otp}`);

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      ...(process.env.NODE_ENV !== 'production' ? { demo_otp: otp } : {}),
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}
