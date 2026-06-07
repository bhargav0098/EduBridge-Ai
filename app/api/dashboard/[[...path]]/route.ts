import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

type Context = { params: Promise<{ path?: string[] }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { path } = await params;
  const urlPath = path ? path.join('/') : '';
  const search = new URL(request.url).search;
  const auth  = request.headers.get('Authorization') || '';

  try {
    const res = await fetch(`${BACKEND}/api/dashboard/${urlPath}${search}`, {
      method: 'GET',
      headers: { ...(auth ? { Authorization: auth } : {}) },
    });

    // Passthrough SSE streams transparently
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      return new NextResponse(res.body, {
        headers: {
          'Content-Type':  'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection':    'keep-alive',
        },
      });
    }

    if (res.ok) return NextResponse.json(await res.json());
    return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
  } catch (error: any) {
    console.error('Dashboard GET proxy error:', error);
    return NextResponse.json({ error: `Backend unreachable: ${error.message}` }, { status: 502 });
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  const { path } = await params;
  const urlPath = path ? path.join('/') : '';
  const search = new URL(request.url).search;
  const auth  = request.headers.get('Authorization') || '';
  const body  = await request.text().catch(() => undefined);

  try {
    const res = await fetch(`${BACKEND}/api/dashboard/${urlPath}${search}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
      body: body || undefined,
    });
    if (res.ok) return NextResponse.json(await res.json());
    return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
  } catch (error: any) {
    console.error('Dashboard POST proxy error:', error);
    return NextResponse.json({ error: `Backend unreachable: ${error.message}` }, { status: 502 });
  }
}
