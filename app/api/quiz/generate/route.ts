import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/store';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';

const MOCK_QUESTION_BANK: Record<string, any[]> = {
  'data structures': [
    { id: 1, question_text: 'What is the average time complexity of accessing an element in an array by index?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], explanation: 'Accessing an element in an array by index takes O(1) constant time.' },
    { id: 2, question_text: 'Which data structure is most appropriate for implementing a recursive function trace?', options: ['Queue', 'Stack', 'Linked List', 'Tree'], explanation: 'A Stack is LIFO and fits call traces perfectly.' },
    { id: 3, question_text: 'In a singly linked list, how is the next element referenced?', options: ['Index pointer', 'Next pointer', 'Hash key', 'Previous pointer'], explanation: 'Each node in a singly linked list has a pointer/reference to the next node.' },
    { id: 4, question_text: 'What is the worst-case search time in a binary search tree?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], explanation: 'In an unbalanced/skewed BST, search takes O(n) linear time.' },
    { id: 5, question_text: 'Which sorting algorithm has the best average-case performance?', options: ['Bubble Sort', 'Insertion Sort', 'Quick Sort', 'Selection Sort'], explanation: 'Quick Sort or Merge Sort has O(n log n) average performance.' }
  ],
  'mathematics': [
    { id: 11, question_text: 'What is the derivative of the basic x^2 function?', options: ['x', '2x', 'x^2', '2'], explanation: 'Using power rule, d/dx(x^2) = 2x.' },
    { id: 12, question_text: 'Which of the following describes the identity element in addition?', options: ['1', '-1', '0', 'None'], explanation: 'For any number n, n + 0 = n.' },
    { id: 13, question_text: 'What is the value of the limit of 1/x as x approaches infinity?', options: ['Infinity', '0', '1', 'Undefined'], explanation: 'As denominator grows, 1/x approaches 0.' },
    { id: 14, question_text: 'What is the determinant of a 2x2 identity matrix?', options: ['0', '1', '2', '-1'], explanation: 'det(I) = 1*1 - 0*0 = 1.' }
  ],
  'english literature': [
    { id: 21, question_text: 'Who wrote the tragedy "Hamlet"?', options: ['William Shakespeare', 'Jane Austen', 'Charles Dickens', 'Leo Tolstoy'], explanation: 'William Shakespeare wrote Hamlet in 1599-1601.' },
    { id: 22, question_text: 'Which figure of speech compares two unlike things using "like" or "as"?', options: ['Metaphor', 'Simile', 'Personification', 'Hyperbole'], explanation: 'A Simile explicitly compares using like or as.' },
    { id: 23, question_text: 'What is the central theme of George Orwell\'s "1984"?', options: ['Romanticism', 'Totalitarianism & Surveillance', 'Coming-of-age', 'Industrial Revolution'], explanation: '1984 explores the dangers of totalitarianism and mass surveillance.' }
  ]
};

const DEFAULT_QUESTIONS = [
  { id: 101, question_text: 'What is the capital of France?', options: ['London', 'Paris', 'Berlin', 'Madrid'], explanation: 'Paris is the capital of France.' },
  { id: 102, question_text: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], explanation: 'Mars is known as the Red Planet.' },
  { id: 103, question_text: 'What is the largest ocean on Earth?', options: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'], explanation: 'The Pacific Ocean is the largest ocean.' }
];

async function handleQuizGeneration(req: NextRequest, subjectParam: string | null, levelParam: string | null) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

    const subject = (subjectParam || 'data structures').toLowerCase().trim();

    // Try Python backend first
    const backendUrl = process.env.BACKEND_URL;
    if (backendUrl) {
      try {
        const queryParams = new URLSearchParams({
          subject: subject,
          level: levelParam || 'easy'
        }).toString();

        const response = await fetch(`${BACKEND}/api/quiz/generate?${queryParams}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader ? { Authorization: authHeader } : {}),
          },
        });
        if (response.ok) {
          return NextResponse.json(await response.json());
        }
      } catch { /* backend unreachable */ }
    }

    // Fallback local mock questions
    const questions = MOCK_QUESTION_BANK[subject] || DEFAULT_QUESTIONS;
    return NextResponse.json(questions);
  } catch (error) {
    console.error('Generate quiz route error:', error);
    return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const subject = searchParams.get('subject');
  const level = searchParams.get('level');
  return handleQuizGeneration(req, subject, level);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const subject = body.subject || body.topic;
    const level = body.difficulty || body.level;
    return handleQuizGeneration(req, subject, level);
  } catch {
    return handleQuizGeneration(req, null, null);
  }
}
