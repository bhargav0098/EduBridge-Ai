import { NextRequest, NextResponse } from 'next/server';
import { store, verifyToken } from '@/lib/store';

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get('Authorization') || '';
    const token = auth.replace('Bearer ', '').trim();
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

    const user = store.users.get(payload.sub);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.createdAt,
      gender: user.gender,
      phone: user.phone,
      bio: user.bio,
      className: user.className,
      studyTimePreference: user.studyTimePreference,
      weakSubjects: user.weakSubjects,
      subject: user.subject,
      experience: user.experience
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('Authorization') || '';
    const token = auth.replace('Bearer ', '').trim();
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

    const user = store.users.get(payload.sub);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await request.json();

    // Update fields
    if (body.name !== undefined) user.name = body.name;
    if (body.gender !== undefined) user.gender = body.gender;
    if (body.phone !== undefined) user.phone = body.phone;
    if (body.bio !== undefined) user.bio = body.bio;

    if (user.role === 'student') {
      if (body.className !== undefined) user.className = body.className;
      if (body.studyTimePreference !== undefined) user.studyTimePreference = body.studyTimePreference;
      if (body.weakSubjects !== undefined) user.weakSubjects = body.weakSubjects;
    } else if (user.role === 'teacher') {
      if (body.subject !== undefined) user.subject = body.subject;
      if (body.experience !== undefined) user.experience = body.experience;
    }

    store.users.set(payload.sub, user);

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.createdAt,
      gender: user.gender,
      phone: user.phone,
      bio: user.bio,
      className: user.className,
      studyTimePreference: user.studyTimePreference,
      weakSubjects: user.weakSubjects,
      subject: user.subject,
      experience: user.experience
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
