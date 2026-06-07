import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/store';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId') || 'c1';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    let studentData: any[] = [];

    // Try backend first
    const backendUrl = process.env.BACKEND_URL;
    if (backendUrl) {
      try {
        const res = await fetch(`${BACKEND}/api/attendance/students?classId=${classId}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader ? { Authorization: authHeader } : {}),
          }
        });
        if (res.ok) {
          studentData = await res.json();
        }
      } catch { /* backend unreachable */ }
    }

    // Fallback local mock students if not loaded
    if (studentData.length === 0) {
      studentData = [
        { id: 's1', name: 'Arya Sharma', email: 'arya@edu.ai', status: 'Present' },
        { id: 's2', name: 'Priya Singh', email: 'priya@edu.ai', status: 'Absent' },
        { id: 's3', name: 'Arjun Kaur', email: 'arjun@edu.ai', status: 'Present' },
        { id: 's4', name: 'Suraj Mishra', email: 'suraj@edu.ai', status: 'Absent' },
      ];
    }

    // Generate CSV content
    const csvHeaders = 'Student Name,Email,Status,Date Range\n';
    const csvRows = studentData.map(s => 
      `"${s.name || s.studentName}","${s.email}","${s.status || 'Present'}","${startDate} to ${endDate}"`
    ).join('\n');
    
    const csvString = csvHeaders + csvRows;

    return new NextResponse(csvString, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=attendance_report_${classId}.csv`,
      },
    });
  } catch (error) {
    console.error('Export attendance error:', error);
    return NextResponse.json(
      { error: 'Failed to export attendance' },
      { status: 500 }
    );
  }
}
