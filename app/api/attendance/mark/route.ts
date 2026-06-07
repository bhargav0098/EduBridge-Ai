import { NextRequest, NextResponse } from 'next/server';
import { store, verifyToken } from '@/lib/store';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

    const body = await request.json();
    const { classId, date, records, attendance } = body;

    const actualRecords = records || attendance || [];

    // Try Python backend first
    const backendUrl = process.env.BACKEND_URL;
    if (backendUrl) {
      try {
        const mappedRecords = actualRecords.map((r: any) => ({
          student_id: r.studentId || r.student_id,
          status: (r.status || 'present').toLowerCase(),
        }));

        const response = await fetch(`${BACKEND}/api/attendance/mark`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader ? { Authorization: authHeader } : {}),
          },
          body: JSON.stringify({
            class_id: classId,
            teacher_id: decoded.uid,
            records: mappedRecords,
          }),
        });
        if (response.ok) {
          return NextResponse.json(await response.json());
        }
      } catch { /* backend unreachable */ }
    }

    // Fallback to local store
    actualRecords.forEach((r: any) => {
      const studentId = r.studentId || r.student_id;
      const statusStr = r.status === 'Present' || r.status === 'present' ? 'Present' : 'Absent';
      
      // Update or add in-memory attendance record
      const dateStr = date || new Date().toISOString().split('T')[0];
      const existingIdx = store.attendance.findIndex(
        (a) => a.studentId === studentId && a.classId === classId && a.date === dateStr
      );
      if (existingIdx !== -1) {
        store.attendance[existingIdx].status = statusStr;
      } else {
        store.attendance.push({
          classId,
          date: dateStr,
          studentId,
          status: statusStr,
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Attendance marked successfully',
      count: actualRecords.length,
    });
  } catch (error) {
    console.error('Mark attendance route error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
