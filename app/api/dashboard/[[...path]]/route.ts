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

  // Try Python backend first if BACKEND_URL is explicitly configured
  if (process.env.BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND}/api/dashboard/${urlPath}${search}`, {
        method: 'GET',
        headers: { ...(authHeader ? { Authorization: authHeader } : {}) },
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
      const errorData = await res.json().catch(() => ({}));
      return NextResponse.json(errorData, { status: res.status });
    } catch (err) {
      console.warn('Dashboard GET proxy backend request failed, falling back to mock mode:', err);
    }
  }

  // Demo fallback mode
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const decoded = verifyToken(token);
  if (!decoded) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

  const user = store.users.get(decoded.sub);
  const currentRole = user?.role || 'student';

  if (urlPath === 'stats') {
    if (currentRole === 'student') {
      // Calculate attendance rate dynamically if there are records
      const studentRecs = store.attendance.filter(a => a.studentId === decoded.sub || a.studentId === decoded.uid);
      const attendancePct = studentRecs.length > 0
        ? Math.round((studentRecs.filter(r => r.status === 'Present').length / studentRecs.length) * 100)
        : 85;

      return NextResponse.json({
        attendance_percentage: attendancePct,
        quiz_accuracy: 78,
        streak: 5,
        achievement_count: 3,
        achievements: [
          { id: 1, badge_name: "Quick Learner", description: "Completed 3 quizzes with >80% accuracy", points: 20 },
          { id: 2, badge_name: "Perfect Attendance", description: "100% attendance in May 2026", points: 30 },
          { id: 3, badge_name: "Curious Mind", description: "Asked first doubtful question", points: 10 }
        ]
      });
    } else {
      const studentCount = Array.from(store.users.values()).filter(u => u.role === 'student').length || 6;
      const pendingGrading = store.submissions.filter(s => s.status === 'submitted').length;
      const openDoubts = store.doubts.filter(d => d.status === 'open').length;

      return NextResponse.json({
        total_students: studentCount,
        total_assignments_created: store.assignments.length,
        pending_grading: pendingGrading,
        open_doubts: openDoubts
      });
    }
  }

  if (urlPath === 'timeline') {
    // Return all timeline activity for classroom shared view
    return NextResponse.json(store.timeline);
  }

  if (urlPath === 'stream') {
    // Return dummy open SSE stream for keep-alive in client
    const encoder = new TextEncoder();
    const customReadable = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(': keep-alive\n\n'));
      }
    });

    return new NextResponse(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
}

export async function POST(request: NextRequest, { params }: Context) {
  const { path } = await params;
  const urlPath = path ? path.join('/') : '';
  const search = new URL(request.url).search;
  const authHeader = request.headers.get('Authorization') || '';
  const body = await request.text().catch(() => undefined);

  // Try Python backend first if BACKEND_URL is explicitly configured
  if (process.env.BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND}/api/dashboard/${urlPath}${search}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authHeader ? { Authorization: authHeader } : {}) },
        body: body || undefined,
      });
      if (res.ok) return NextResponse.json(await res.json());
      const errorData = await res.json().catch(() => ({}));
      return NextResponse.json(errorData, { status: res.status });
    } catch (err) {
      console.warn('Dashboard POST proxy backend request failed, falling back to mock mode:', err);
    }
  }

  // No specific post requests in dashboard, but standard 404
  return NextResponse.json({ error: 'Method not supported in demo mode' }, { status: 404 });
}
