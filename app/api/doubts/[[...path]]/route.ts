import { NextRequest, NextResponse } from 'next/server';
import { store, verifyToken } from '@/lib/store';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';

type Context = { params: Promise<{ path?: string[] }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { path } = await params;
  const urlPath = path ? path.join('/') : '';
  const search = new URL(request.url).search;
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();

  // Try Python backend first if configured
  if (process.env.BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND}/api/doubts/${urlPath}${search}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...(authHeader ? { Authorization: authHeader } : {}) },
      });
      if (res.ok) return NextResponse.json(await res.json());
      const errorData = await res.json().catch(() => ({}));
      return NextResponse.json(errorData, { status: res.status });
    } catch (err) {
      console.warn('Doubts GET proxy backend request failed, falling back to mock mode:', err);
    }
  }

  // Fallback demo mode
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const decoded = verifyToken(token);
  if (!decoded) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

  const user = store.users.get(decoded.sub);
  const currentRole = user?.role || 'student';

  if (urlPath === '' || urlPath === '/') {
    // Populate student metadata for frontend
    const result = store.doubts.map(d => ({
      ...d,
      student: {
        name: store.users.get(d.student_id)?.name || 'Student',
        email: d.student_id
      }
    }));

    if (currentRole === 'student') {
      return NextResponse.json(result.filter(d => d.student_id === decoded.sub));
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function POST(request: NextRequest, { params }: Context) {
  const { path } = await params;
  const urlPath = path ? path.join('/') : '';
  const search = new URL(request.url).search;
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const rawBody = await request.text().catch(() => '');

  // Try Python backend first if configured
  if (process.env.BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND}/api/doubts/${urlPath}${search}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authHeader ? { Authorization: authHeader } : {}) },
        body: rawBody || undefined,
      });
      if (res.ok) return NextResponse.json(await res.json());
      const errorData = await res.json().catch(() => ({}));
      return NextResponse.json(errorData, { status: res.status });
    } catch (err) {
      console.warn('Doubts POST proxy backend request failed, falling back to mock mode:', err);
    }
  }

  // Fallback demo mode
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const decoded = verifyToken(token);
  if (!decoded) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

  const user = store.users.get(decoded.sub);
  const currentRole = user?.role || 'student';
  const body = rawBody ? JSON.parse(rawBody) : {};

  // Submit new doubt (student)
  if (urlPath === '' || urlPath === '/') {
    if (currentRole !== 'student') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const newDoubt = {
      id: store.doubts.length + 1,
      student_id: decoded.sub,
      content: body.content,
      status: 'open' as const,
      created_at: new Date().toISOString(),
      student: {
        name: user?.name || 'Student',
        email: decoded.sub
      }
    };
    store.doubts.push(newDoubt);

    store.timeline.unshift({
      id: store.timeline.length + 1,
      user_id: decoded.sub,
      user_name: user?.name || 'Student',
      role: 'student',
      action_type: 'doubt_asked',
      metadata_json: { content_preview: body.content.slice(0, 40) },
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(newDoubt);
  }

  // Resolve doubt (teacher)
  if (urlPath.startsWith('resolve/')) {
    if (currentRole !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const doubtId = parseInt(urlPath.split('/')[1]);
    const doubt = store.doubts.find(d => d.id === doubtId);
    if (!doubt) {
      return NextResponse.json({ error: 'Doubt not found' }, { status: 404 });
    }

    doubt.response = body.response;
    doubt.status = 'resolved';

    store.timeline.unshift({
      id: store.timeline.length + 1,
      user_id: decoded.sub,
      user_name: user?.name || 'Teacher',
      role: 'teacher',
      action_type: 'doubt_resolved',
      metadata_json: { question: doubt.content },
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(doubt);
  }

  return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
}
