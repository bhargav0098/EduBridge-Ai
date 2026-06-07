import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';

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
      { status: response.status }
    );
  } catch (error: any) {
    console.error('Registration proxy error:', error);
    return NextResponse.json({ error: `Backend unreachable: ${error.message}` }, { status: 502 });
  }
}
