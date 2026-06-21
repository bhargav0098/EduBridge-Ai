import { NextRequest, NextResponse } from 'next/server';
import { store, verifyToken } from '@/lib/store';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Try Python backend first
    if (process.env.BACKEND_URL) {
      try {
        const backendFormData = new FormData();
        backendFormData.append('file', file);

        const response = await fetch(`${BACKEND}/api/quiz/questions/upload`, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
          },
          body: backendFormData,
        });
        if (response.ok) {
          return NextResponse.json(await response.json());
        }
      } catch { /* backend unreachable */ }
    }

    // Fallback Mock Store
    const fileContent = await file.text();
    const questionsData = JSON.parse(fileContent);
    
    if (!Array.isArray(questionsData)) {
      return NextResponse.json({ error: 'JSON must be an array of questions' }, { status: 400 });
    }

    const newQuestions = questionsData.map((q: any, idx: number) => ({
      id: idx + 1,
      subject: q.subject,
      topic: q.topic,
      question_text: q.question_text,
      difficulty: q.difficulty,
      type: q.type || 'MCQ',
      options: q.options,
      answer: q.answer,
      explanation: q.explanation || ''
    }));

    (store as any).questions = newQuestions;

    return NextResponse.json({ success: true, count: newQuestions.length });
  } catch (error) {
    console.error('Admin questions upload error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
