import { NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization') || '';
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND}/api/quiz/submit-quiz`, {
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
  } catch (error: any) {
    console.error('Quiz submit POST proxy error:', error);
    return NextResponse.json({ error: `Backend unreachable: ${error.message}` }, { status: 502 });
  }
}
