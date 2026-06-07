import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization') || '';
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND}/api/classes/material`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    });
    if (response.ok) return NextResponse.json(await response.json());
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  } catch (err) {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
