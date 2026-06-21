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
    const userId = id;

    // Try Python backend first
    if (process.env.BACKEND_URL) {
      try {
        const response = await fetch(`${BACKEND}/api/auth/users/${userId}`, {
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

    // Fallback Mock store deletion
    let foundEmail = '';
    for (const [email, u] of store.users.entries()) {
      if (u.id === userId) {
        foundEmail = email;
        break;
      }
    }

    if (foundEmail) {
      store.users.delete(foundEmail);
      return NextResponse.json({ success: true, message: 'User deleted successfully' });
    }

    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  } catch (error) {
    console.error('Admin user DELETE error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
