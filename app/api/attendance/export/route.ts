import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId') || '';
  const authHeader = request.headers.get('Authorization') || '';

  try {
    const response = await fetch(`${BACKEND}/api/attendance/students?classId=${classId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    if (response.ok) {
      const students = await response.json();
      const datesSet = new Set<string>();
      students.forEach((s: any) => {
        if (s.history) {
          s.history.forEach((h: any) => datesSet.add(h.date));
        }
      });
      const dates = Array.from(datesSet).sort();
      
      let csv = `Student Name,Email,${dates.join(',')},Attendance Rate\n`;
      for (const student of students) {
        const statusByDate = Object.fromEntries(
          student.history?.map((h: any) => [h.date, h.status]) || []
        );
        const dateStatuses: string[] = dates.map((d) => statusByDate[d] ?? 'N/A');
        csv += `${student.name},${student.email},${dateStatuses.join(',')},${student.attendanceRate}%\n`;
      }
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="attendance-report-${classId}-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    const errorData = await response.json().catch(() => ({}));
    return NextResponse.json(errorData, { status: response.status });
  } catch (err: any) {
    console.error('Export GET proxy error:', err);
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
