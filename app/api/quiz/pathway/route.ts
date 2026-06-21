import { NextRequest, NextResponse } from 'next/server';
import { store, verifyToken } from '@/lib/store';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

    const subject = req.nextUrl.searchParams.get('subject') || 'data structures';

    // Try Python backend first
    if (process.env.BACKEND_URL) {
      try {
        const response = await fetch(`${BACKEND}/api/quiz/pathway?subject=${encodeURIComponent(subject)}`, {
          headers: {
            Authorization: authHeader,
          },
        });
        if (response.ok) {
          return NextResponse.json(await response.json());
        }
      } catch { /* backend unreachable */ }
    }

    // Mock Learning Pathway Fallback
    const topicsMap: Record<string, string[]> = {
      'data structures': ['Arrays', 'Stacks', 'Queues', 'Linked Lists', 'Complexity'],
      'mathematics': ['Algebra', 'Trigonometry', 'Matrices', 'Probability', 'Sets'],
      'english literature': ['Shakespearian Plays', 'Literary Devices', 'Romantic Poetry', 'Victorian Novels', 'Fables'],
    };

    const topics = topicsMap[subject.toLowerCase()] || ['Introduction'];
    const pathway = topics.map((topic, index) => {
      // Create deterministic mock scores based on username index
      const score = Math.min(100, Math.max(0, 30 + (index * 15)));
      const attempts = index < 3 ? 4 : 0;
      const correct = Math.round((score / 100) * attempts);
      const accuracy = attempts > 0 ? (correct / attempts) * 100 : 0.0;
      
      const status = attempts === 0 ? 'Not Started' : accuracy >= 70 ? 'Mastered' : 'In Progress';
      const next_lesson = accuracy >= 70 ? `${topic} Word Problems` : `${topic} Fundamentals`;

      return {
        topic,
        accuracy: round(accuracy, 1),
        attempts,
        correct,
        next_lesson,
        status
      };
    });

    return NextResponse.json({
      subject,
      student_id: decoded.uid,
      pathway
    });
  } catch (error) {
    console.error('Learning pathway GET error:', error);
    return NextResponse.json({ error: 'Failed to load learning pathway' }, { status: 500 });
  }
}

function round(val: number, precision: number) {
  const p = Math.pow(10, precision);
  return Math.round(val * p) / p;
}
