import { NextRequest, NextResponse } from 'next/server';
import { store, verifyToken } from '@/lib/store';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();

  // Try Python backend first
  const backendUrl = process.env.BACKEND_URL;
  if (backendUrl) {
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
    } catch { /* backend unreachable */ }
  }

  // Fallback to local store
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const decoded = verifyToken(token);
  if (!decoded) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

  const user = store.users.get(decoded.sub);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({
    class_name: (user as any).className || '',
  });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const body = await request.json();
  const { class_name } = body;

  // Try Python backend first
  const backendUrl = process.env.BACKEND_URL;
  if (backendUrl) {
    try {
      const response = await fetch(`${BACKEND}/api/attendance/student/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({ class_name }),
      });
      if (response.ok) {
        return NextResponse.json(await response.json());
      }
    } catch { /* backend unreachable */ }
  }

  // Fallback to local store
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const decoded = verifyToken(token);
  if (!decoded) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

  const user = store.users.get(decoded.sub);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  (user as any).className = class_name;
  store.users.set(decoded.sub, user);

  return NextResponse.json({
    class_name,
  });
}
