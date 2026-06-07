import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/store';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId') || '';

  // Try Python backend first
  const backendUrl = process.env.BACKEND_URL;
  if (backendUrl) {
    try {
      const response = await fetch(`${BACKEND}/api/attendance/students?classId=${classId}`, {
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

  // Return standard mock students list
  const mockStudents = [
    {
      id: 's1',
      name: 'Arya Sharma',
      email: 'arya@edu.ai',
      attendanceRate: 92,
      status: 'Present',
      quizPerformance: 85,
      notesActivityCount: 14,
      history: Array.from({ length: 30 }, (_, i) => ({
        date: `2026-05-${String(i + 1).padStart(2, '0')}`,
        status: Math.random() > 0.1 ? 'Present' : 'Absent',
      })),
    },
    {
      id: 's2',
      name: 'Priya Singh',
      email: 'priya@edu.ai',
      attendanceRate: 62,
      status: 'Absent',
      quizPerformance: 54,
      notesActivityCount: 4,
      history: Array.from({ length: 30 }, (_, i) => ({
        date: `2026-05-${String(i + 1).padStart(2, '0')}`,
        status: Math.random() > 0.38 ? 'Present' : 'Absent',
      })),
    },
    {
      id: 's3',
      name: 'Arjun Kaur',
      email: 'arjun@edu.ai',
      attendanceRate: 71,
      status: 'Present',
      quizPerformance: 48,
      notesActivityCount: 6,
      history: Array.from({ length: 30 }, (_, i) => ({
        date: `2026-05-${String(i + 1).padStart(2, '0')}`,
        status: Math.random() > 0.29 ? 'Present' : 'Absent',
      })),
    },
    {
      id: 's4',
      name: 'Suraj Mishra',
      email: 'suraj@edu.ai',
      attendanceRate: 58,
      status: 'Absent',
      quizPerformance: 51,
      notesActivityCount: 3,
      history: Array.from({ length: 30 }, (_, i) => ({
        date: `2026-05-${String(i + 1).padStart(2, '0')}`,
        status: Math.random() > 0.42 ? 'Present' : 'Absent',
      })),
    },
  ];

  return NextResponse.json(mockStudents);
}
