import { NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

function decodeJwtPayload(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payloadStr = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(payloadStr);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = decodeJwtPayload(token);
    if (!decoded || (!decoded.uid && !decoded.sub)) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token payload' }, { status: 401 });
    }

    const teacherId = decoded.uid || decoded.sub;

    const body = await request.json();
    const { classId, attendance } = body;

    if (!classId || !attendance || !Array.isArray(attendance)) {
      return NextResponse.json({ error: 'classId and attendance array are required' }, { status: 400 });
    }

    const response = await fetch(`${BACKEND}/api/attendance/mark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        class_id: classId,
        teacher_id: teacherId,
        records: attendance.map((r: any) => ({
          student_id: r.studentId,
          status: r.status.toLowerCase(),
        })),
      }),
    });

    if (response.ok) {
      return NextResponse.json(await response.json());
    }

    const errorData = await response.json().catch(() => ({}));
    return NextResponse.json(errorData, { status: response.status });
  } catch (error: any) {
    console.error('Mark attendance proxy error:', error);
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
