import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { store } from '@/lib/store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { classId, title, fileData, subject, fileType } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const cls = store.classes.find((c) => c.id === classId);
    const id = crypto.randomUUID();
    const material = {
      id,
      classId: classId || 'general',
      title,
      subject: subject || cls?.subject || 'General',
      content: fileData || '',
      fileType: fileType || 'TXT',
      uploadedBy: 'Teacher',
      uploadedAt: new Date().toISOString(),
    };
    store.materials.push(material);

    return NextResponse.json({
      success: true,
      message: 'Material uploaded successfully',
      material: {
        id: material.id,
        title: material.title,
        subject: material.subject,
        fileType: material.fileType,
        uploadedAt: material.uploadedAt,
      },
    });
  } catch (error) {
    console.error('Upload material error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(store.materials);
}
