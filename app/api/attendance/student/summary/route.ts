import { NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization') || '';
  try {
    const response = await fetch(`${BACKEND}/api/attendance/student/summary`, {
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
  } catch (error: any) {
    console.error('Student summary GET proxy error:', error);
    return NextResponse.json({ error: `Backend unreachable: ${error.message}` }, { status: 502 });
  }
}
