import { NextRequest, NextResponse } from 'next/server';
import { store, verifyToken } from '@/lib/store';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';

function getMockQuestions() {
  if (!(store as any).questions) {
    (store as any).questions = [
      {
        id: 1,
        subject: 'physics',
        topic: 'Kinematics',
        question_text: 'What is the velocity of an object at rest?',
        difficulty: 1,
        type: 'MCQ',
        options: ['0 m/s', '10 m/s', '5 m/s', '1 m/s'],
        answer: '0 m/s',
        explanation: 'An object at rest has zero velocity.'
      },
      {
        id: 2,
        subject: 'math',
        topic: 'Algebra',
        question_text: 'Solve for x: 2x = 10',
        difficulty: 1,
        type: 'MCQ',
        options: ['2', '5', '10', '0'],
        answer: '5',
        explanation: 'Divide both sides by 2 to get x = 5.'
      }
    ];
  }
  return (store as any).questions;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

    const subject = req.nextUrl.searchParams.get('subject');
    const topic = req.nextUrl.searchParams.get('topic');

    // Try Python backend first
    if (process.env.BACKEND_URL) {
      try {
        const url = new URL(`${BACKEND}/api/quiz/questions`);
        if (subject) url.searchParams.append('subject', subject);
        if (topic) url.searchParams.append('topic', topic);

        const response = await fetch(url.toString(), {
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
    let questions = getMockQuestions();
    if (subject) {
      questions = questions.filter((q: any) => q.subject === subject.toLowerCase());
    }
    if (topic) {
      questions = questions.filter((q: any) => q.topic.toLowerCase().includes(topic.toLowerCase()));
    }

    return NextResponse.json({
      total: questions.length,
      questions: questions
    });
  } catch (error) {
    console.error('Admin questions GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

    const body = await req.json();

    // Try Python backend first
    if (process.env.BACKEND_URL) {
      try {
        const response = await fetch(`${BACKEND}/api/quiz/questions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify(body),
        });
        if (response.ok) {
          return NextResponse.json(await response.json());
        }
      } catch { /* backend unreachable */ }
    }

    // Fallback Mock Store
    const questions = getMockQuestions();
    const newId = questions.length > 0 ? Math.max(...questions.map((q: any) => q.id)) + 1 : 1;
    const newQuestion = {
      id: newId,
      subject: body.subject,
      topic: body.topic,
      question_text: body.question_text,
      difficulty: body.difficulty,
      type: body.type || 'MCQ',
      options: body.options,
      answer: body.answer,
      explanation: body.explanation
    };
    questions.push(newQuestion);

    return NextResponse.json({ success: true, question_id: newId });
  } catch (error) {
    console.error('Admin questions POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
