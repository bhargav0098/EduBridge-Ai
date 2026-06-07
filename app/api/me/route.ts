import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization') || '';
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
    const response = await fetch(`${backendUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      signal: AbortSignal.timeout(20000),
    });

    if (response.ok) {
      return NextResponse.json(await response.json());
    }
    
    const errorData = await response.json().catch(() => ({}));
    return NextResponse.json(errorData, { status: response.status });
  } catch (error: any) {
    console.error('Me proxy error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 502 });
  }
}
