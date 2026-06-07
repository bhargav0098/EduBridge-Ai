import { NextRequest, NextResponse } from 'next/server';
import { store, verifyToken } from '@/lib/store';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

    // Fallback to local store classes
    const classes = store.classes.map((c) => ({
      id: c.id,
      name: c.name,
      subject: c.subject,
      schedule: c.schedule,
      students: [
        { id: 's1', name: 'Arya Sharma', rollNumber: '101' },
        { id: 's2', name: 'Priya Singh', rollNumber: '102' },
        { id: 's3', name: 'Arjun Kaur', rollNumber: '103' },
        { id: 's4', name: 'Suraj Mishra', rollNumber: '104' },
      ],
    }));

    return NextResponse.json(classes);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

    const body = await request.json();
    const classId = body.classId || 'c1';
    const title = body.title || 'Untitled Material';
    const subject = body.subject || 'General';
    const content = body.content || body.fileData || '';
    const fileType = body.fileType || 'PDF';

    const newMaterial = {
      id: `m-${Date.now()}`,
      classId,
      title,
      subject,
      content,
      fileType,
      uploadedBy: decoded.sub,
      uploadedAt: new Date().toISOString().split('T')[0],
    };

    store.materials.push(newMaterial);

    return NextResponse.json({
      success: true,
      message: 'Material uploaded successfully',
      material: newMaterial,
    });
  } catch (error) {
    console.error('Material upload route error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
