import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization') || '';
  try {
    const response = await fetch(`${BACKEND}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });
    if (response.ok) return NextResponse.json(await response.json());
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  } catch (err) {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
