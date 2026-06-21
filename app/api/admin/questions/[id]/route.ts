import { NextRequest, NextResponse } from 'next/server';
import { store, verifyToken } from '@/lib/store';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

    const { id } = await params;
    const qId = Number(id);

    // Try Python backend first
    if (process.env.BACKEND_URL) {
      try {
        const response = await fetch(`${BACKEND}/api/quiz/questions/${qId}`, {
          method: 'DELETE',
          headers: {
            Authorization: authHeader,
          },
        });
        if (response.ok) {
          return NextResponse.json(await response.json());
        }
      } catch { /* backend unreachable */ }
    }

    // Fallback Mock Store
    if ((store as any).questions) {
      (store as any).questions = (store as any).questions.filter((q: any) => q.id !== qId);
    }

    return NextResponse.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Admin question DELETE error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
