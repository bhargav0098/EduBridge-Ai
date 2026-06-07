import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization') || '';
  try {
    const response = await fetch(`${BACKEND}/api/attendance/student/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });
    if (response.ok) {
      return NextResponse.json(await response.json());
    }
    const errorData = await response.json().catch(() => ({}));
    return NextResponse.json(errorData, { status: response.status });
  } catch (err: any) {
    console.error('Student profile GET proxy error:', err);
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization') || '';
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND}/api/attendance/student/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    });
    if (response.ok) {
      return NextResponse.json(await response.json());
    }
    const errorData = await response.json().catch(() => ({}));
    return NextResponse.json(errorData, { status: response.status });
  } catch (err: any) {
    console.error('Student profile POST proxy error:', err);
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
