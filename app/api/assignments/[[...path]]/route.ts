import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

type Context = { params: Promise<{ path?: string[] }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { path } = await params;
  const urlPath = path ? path.join('/') : '';
  const search = new URL(request.url).search;
  const auth  = request.headers.get('Authorization') || '';

  try {
    const res = await fetch(`${BACKEND}/api/assignments/${urlPath}${search}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
    });
    if (res.ok) return NextResponse.json(await res.json());
    return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
  } catch (err) {
    console.error('Assignments GET proxy error:', err);
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  const { path } = await params;
  const urlPath = path ? path.join('/') : '';
  const search = new URL(request.url).search;
  const auth  = request.headers.get('Authorization') || '';
  const body  = await request.text().catch(() => undefined);

  try {
    const res = await fetch(`${BACKEND}/api/assignments/${urlPath}${search}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
      body: body || undefined,
    });
    if (res.ok) return NextResponse.json(await res.json());
    return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
  } catch (err) {
    console.error('Assignments POST proxy error:', err);
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
