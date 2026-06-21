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
      const res = await fetch(`${BACKEND}/api/assignments/${urlPath}${search}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...(authHeader ? { Authorization: authHeader } : {}) },
      });
      if (res.ok) return NextResponse.json(await res.json());
      const errorData = await res.json().catch(() => ({}));
      return NextResponse.json(errorData, { status: res.status });
    } catch (err) {
      console.warn('Assignments GET proxy backend request failed, falling back to mock mode:', err);
    }
  }

  // Fallback demo mode
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const decoded = verifyToken(token);
  if (!decoded) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

  const user = store.users.get(decoded.sub) as any;
  const currentRole = user?.role || 'student';

  if (urlPath === 'student') {
    if (currentRole !== 'student') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Sync submissions with the student's enrolled classes dynamically
    const enrolledClasses = user?.className
      ? (user.className as string).split(',').map((c: string) => c.trim()).filter(Boolean)
      : ['CS-3A', 'CS-3B']; // default

    const classIdMap: Record<string, string> = {
      'CS-3A': 'c1',
      'CS-3B': 'c2',
      'CS-4A': 'c3',
      'c1': 'c1',
      'c2': 'c2',
      'c3': 'c3'
    };
    const enrolledClassIds = enrolledClasses.map((c: string) => classIdMap[c] || c);

    const classAssignments = store.assignments.filter(a => enrolledClassIds.includes(a.class_id));
    for (const assignment of classAssignments) {
      const exists = store.submissions.some(s => s.assignment_id === assignment.id && s.student_id === decoded.sub);
      if (!exists) {
        store.submissions.push({
          id: store.submissions.length + 1,
          assignment_id: assignment.id,
          student_id: decoded.sub,
          status: 'assigned'
        });
      }
    }

    // Return populated submissions
    const result = store.submissions
      .filter(s => s.student_id === decoded.sub)
      .map(s => ({
        ...s,
        assignment: store.assignments.find(a => a.id === s.assignment_id)
      }));
    return NextResponse.json(result);
  }

  if (urlPath === 'submissions') {
    if (currentRole !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Return all submissions for grading queue (teacher)
    const result = store.submissions.map(s => ({
      ...s,
      assignment: store.assignments.find(a => a.id === s.assignment_id),
      student: {
        name: store.users.get(s.student_id)?.name || 'Student',
        email: s.student_id
      }
    }));
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
      const res = await fetch(`${BACKEND}/api/assignments/${urlPath}${search}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authHeader ? { Authorization: authHeader } : {}) },
        body: rawBody || undefined,
      });
      if (res.ok) return NextResponse.json(await res.json());
      const errorData = await res.json().catch(() => ({}));
      return NextResponse.json(errorData, { status: res.status });
    } catch (err) {
      console.warn('Assignments POST proxy backend request failed, falling back to mock mode:', err);
    }
  }

  // Fallback demo mode
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const decoded = verifyToken(token);
  if (!decoded) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

  const user = store.users.get(decoded.sub);
  const currentRole = user?.role || 'student';
  const body = rawBody ? JSON.parse(rawBody) : {};

  // Create Assignment (teacher)
  if (urlPath === '' || urlPath === '/') {
    if (currentRole !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const newAssignment = {
      id: store.assignments.length + 1,
      title: body.title,
      description: body.description,
      due_date: body.due_date,
      class_id: body.class_id,
      teacher_id: decoded.sub
    };
    store.assignments.push(newAssignment);

    // Create submissions & notifications for matching students
    const students = Array.from(store.users.values()).filter((u: any) => {
      const enrolled = u.className ? (u.className as string).split(',').map((c: string) => c.trim()) : [];
      return u.role === 'student' && (enrolled.includes(body.class_id) || body.class_id === 'c1');
    });

    for (const student of students) {
      store.submissions.push({
        id: store.submissions.length + 1,
        assignment_id: newAssignment.id,
        student_id: student.email,
        status: 'assigned'
      });

      store.timeline.unshift({
        id: store.timeline.length + 1,
        user_id: student.email,
        user_name: student.name,
        role: 'student',
        action_type: 'assignment_assigned',
        metadata_json: { assignment_title: body.title, due_date: body.due_date },
        timestamp: new Date().toISOString()
      });
    }

    store.timeline.unshift({
      id: store.timeline.length + 1,
      user_id: decoded.sub,
      user_name: user?.name || 'Teacher',
      role: 'teacher',
      action_type: 'assignment_created',
      metadata_json: { assignment_title: body.title, class_id: body.class_id },
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(newAssignment);
  }

  // Student solutions submission
  if (urlPath.startsWith('submit/')) {
    if (currentRole !== 'student') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const submissionId = parseInt(urlPath.split('/')[1]);
    const submission = store.submissions.find(s => s.id === submissionId);
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    submission.submission_content = body.submission_content;
    submission.status = 'submitted';
    submission.submitted_at = new Date().toISOString();

    const assignmentObj = store.assignments.find(a => a.id === submission.assignment_id);

    store.timeline.unshift({
      id: store.timeline.length + 1,
      user_id: decoded.sub,
      user_name: user?.name || 'Student',
      role: 'student',
      action_type: 'assignment_submitted',
      metadata_json: { assignment_title: assignmentObj?.title || 'Assignment' },
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(submission);
  }

  // Teacher grading submission
  if (urlPath.startsWith('grade/')) {
    if (currentRole !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const submissionId = parseInt(urlPath.split('/')[1]);
    const submission = store.submissions.find(s => s.id === submissionId);
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    submission.grade = body.grade;
    submission.feedback = body.feedback;
    submission.status = 'graded';

    const assignmentObj = store.assignments.find(a => a.id === submission.assignment_id);

    store.timeline.unshift({
      id: store.timeline.length + 1,
      user_id: submission.student_id,
      user_name: store.users.get(submission.student_id)?.name || 'Student',
      role: 'student',
      action_type: 'assignment_graded',
      metadata_json: { assignment_title: assignmentObj?.title || 'Assignment', grade: body.grade },
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(submission);
  }

  return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
}
