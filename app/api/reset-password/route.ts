import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) {
      return NextResponse.json({ error: 'BACKEND_URL is not configured on the server' }, { status: 500 });
    }

    const response = await fetch(`${backendUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });

    if (response.ok) return NextResponse.json(await response.json());
    
    const errorData = await response.json().catch(() => ({}));
    return NextResponse.json(
      { error: errorData.detail || errorData.error || 'Failed to send OTP' },
      { status: response.status }
    );
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal Server Error: Backend unreachable' }, { status: 502 });
  }
}
