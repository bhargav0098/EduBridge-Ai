import { NextRequest, NextResponse } from 'next/server';
import { store, verifyToken } from '@/lib/store';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';

const CORRECT_ANSWERS: Record<number, number> = {
  // Data structures
  1: 0,
  2: 1,
  3: 1,
  4: 2,
  5: 2,
  // Math
  11: 1,
  12: 2,
  13: 1,
  14: 1,
  // English
  21: 0,
  22: 1,
  23: 1,
  // Defaults
  101: 1,
  102: 1,
  103: 3
};

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

    const body = await req.json();
    const { subject, answers } = body;

    // Try Python backend first
    const backendUrl = process.env.BACKEND_URL;
    if (backendUrl) {
      try {
        const response = await fetch(`${BACKEND}/api/quiz/submit-quiz`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader ? { Authorization: authHeader } : {}),
          },
          body: JSON.stringify({ subject, answers }),
        });
        if (response.ok) {
          return NextResponse.json(await response.json());
        }
      } catch { /* backend unreachable */ }
    }

    // Fallback local scoring
    const user = store.users.get(decoded.sub);
    const oldElo = user ? (user as any).elo || 1200 : 1200;

    let correctCount = 0;
    const actualAnswers = answers || [];
    actualAnswers.forEach((ans: any) => {
      const correctIndex = CORRECT_ANSWERS[ans.question_id];
      if (correctIndex !== undefined && Number(ans.answer_index) === correctIndex) {
        correctCount++;
      }
    });

    const totalQuestions = actualAnswers.length || 1;
    const accuracy = Math.round((correctCount / totalQuestions) * 100);

    // Elo-lite changes
    const incorrectCount = totalQuestions - correctCount;
    const eloChange = (correctCount * 15) - (incorrectCount * 10);
    const newElo = Math.max(500, oldElo + eloChange);

    if (user) {
      (user as any).elo = newElo;
      store.users.set(decoded.sub, user);
    }

    return NextResponse.json({
      correctCount,
      totalQuestions,
      accuracy,
      old_elo: oldElo,
      new_elo: newElo,
      elo_change: eloChange
    });
  } catch (error) {
    console.error('Submit quiz route error:', error);
    return NextResponse.json({ error: 'Failed to submit quiz' }, { status: 500 });
  }
}
