// Global in-memory store — shared across all Next.js API routes in the same process
// This solves the problem of DEMO_USERS being separate objects in register vs login routes

import crypto from 'crypto';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  hashedPassword: string;
  createdAt: string;
  className?: string;
  gender?: string;
  phone?: string;
  bio?: string;
  studyTimePreference?: string;
  weakSubjects?: string;
  subject?: string;
  experience?: string;
}

interface OTPRecord {
  otp: string;
  expiresAt: number;
  newPassword?: string;
}

// Attendance record
interface AttendanceRecord {
  classId: string;
  date: string;
  studentId: string;
  status: 'Present' | 'Absent';
}

interface Material {
  id: string;
  classId: string;
  title: string;
  subject: string;
  content: string;
  fileType: string;
  uploadedBy: string;
  uploadedAt: string;
}

interface Assignment {
  id: number;
  title: string;
  description: string;
  due_date: string;
  class_id: string;
  teacher_id: string;
}

interface AssignmentSubmission {
  id: number;
  assignment_id: number;
  student_id: string;
  status: 'assigned' | 'submitted' | 'graded';
  submission_content?: string;
  submitted_at?: string;
  grade?: string;
  feedback?: string;
  assignment?: Assignment;
}

interface Doubt {
  id: number;
  student_id: string;
  content: string;
  status: 'open' | 'resolved';
  response?: string;
  created_at: string;
  student?: {
    name: string;
    email: string;
  };
}

interface ActivityLog {
  id: number;
  user_id: string;
  user_name: string;
  role: 'student' | 'teacher';
  action_type: 'assignment_created' | 'assignment_assigned' | 'assignment_submitted' | 'assignment_graded' | 'doubt_asked' | 'doubt_resolved' | 'attendance_marked' | 'quiz_attempt';
  metadata_json: any;
  timestamp: string;
}

// Use globalThis so the same object is reused across hot-reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var __EDUBRIDGE_STORE__: {
    users: Map<string, User>;
    otps: Map<string, OTPRecord>;
    attendance: AttendanceRecord[];
    materials: Material[];
    classes: { id: string; name: string; subject: string; schedule: string }[];
    assignments: Assignment[];
    submissions: AssignmentSubmission[];
    doubts: Doubt[];
    timeline: ActivityLog[];
  } | undefined;
}

if (!globalThis.__EDUBRIDGE_STORE__) {
  globalThis.__EDUBRIDGE_STORE__ = {
    users: new Map(),
    otps: new Map(),
    attendance: [],
    materials: [],
    classes: [
      { id: 'c1', name: 'CS-3A', subject: 'Data Structures', schedule: 'Mon/Thu/Fri 9:00 AM' },
      { id: 'c2', name: 'CS-3B', subject: 'Mathematics', schedule: 'Tue/Thu 1:00 PM' },
      { id: 'c3', name: 'CS-4A', subject: 'English Literature', schedule: 'Tue/Fri 1:00 PM' },
    ],
    assignments: [
      {
        id: 1,
        title: 'Data Structures Stack Implementations',
        description: 'Implement a Stack using arrays and linked lists in Python.',
        due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
        class_id: 'c1',
        teacher_id: 'teacher@edu.ai'
      },
      {
        id: 2,
        title: 'Linear Algebra Calculus Quiz Preparation',
        description: 'Complete the worksheets on matrix multiplication and determinants.',
        due_date: new Date(Date.now() + 86400000 * 4).toISOString(),
        class_id: 'c2',
        teacher_id: 'teacher@edu.ai'
      }
    ],
    submissions: [
      {
        id: 1,
        assignment_id: 1,
        student_id: 'student@edu.ai',
        status: 'assigned',
      },
      {
        id: 2,
        assignment_id: 2,
        student_id: 'student@edu.ai',
        status: 'graded',
        submission_content: 'Please find my matrix answers attached.',
        grade: 'A',
        feedback: 'Excellent work!',
        submitted_at: new Date(Date.now() - 86400000).toISOString()
      }
    ],
    doubts: [
      {
        id: 1,
        student_id: 'student@edu.ai',
        content: 'Why does a binary search tree search take O(n) in the worst case?',
        status: 'resolved',
        response: 'In the worst case, a BST can be skewed/unbalanced, turning it into a linked list where search takes linear time O(n).',
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
        student: { name: 'Demo Student', email: 'student@edu.ai' }
      },
      {
        id: 2,
        student_id: 'student@edu.ai',
        content: 'What is the limit definition of a derivative?',
        status: 'open',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        student: { name: 'Demo Student', email: 'student@edu.ai' }
      }
    ],
    timeline: [
      {
        id: 1,
        user_id: 'student@edu.ai',
        user_name: 'Demo Student',
        role: 'student',
        action_type: 'quiz_attempt',
        metadata_json: { subject: 'Data Structures', topic: 'Stacks', correct: true },
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
      },
      {
        id: 2,
        user_id: 'teacher@edu.ai',
        user_name: 'Demo Teacher',
        role: 'teacher',
        action_type: 'assignment_created',
        metadata_json: { assignment_title: 'Data Structures Stack Implementations', class_id: 'c1' },
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString()
      }
    ],
  };
}

export const store = globalThis.__EDUBRIDGE_STORE__!;

// Make sure new keys are initialized if using a cached store from a previous session in memory
if (!store.assignments) {
  store.assignments = [
    {
      id: 1,
      title: 'Data Structures Stack Implementations',
      description: 'Implement a Stack using arrays and linked lists in Python.',
      due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
      class_id: 'c1',
      teacher_id: 'teacher@edu.ai'
    },
    {
      id: 2,
      title: 'Linear Algebra Calculus Quiz Preparation',
      description: 'Complete the worksheets on matrix multiplication and determinants.',
      due_date: new Date(Date.now() + 86400000 * 4).toISOString(),
      class_id: 'c2',
      teacher_id: 'teacher@edu.ai'
    }
  ];
}
if (!store.submissions) {
  store.submissions = [
    {
      id: 1,
      assignment_id: 1,
      student_id: 'student@edu.ai',
      status: 'assigned',
    },
    {
      id: 2,
      assignment_id: 2,
      student_id: 'student@edu.ai',
      status: 'graded',
      submission_content: 'Please find my matrix answers attached.',
      grade: 'A',
      feedback: 'Excellent work!',
      submitted_at: new Date(Date.now() - 86400000).toISOString()
    }
  ];
}
if (!store.doubts) {
  store.doubts = [
    {
      id: 1,
      student_id: 'student@edu.ai',
      content: 'Why does a binary search tree search take O(n) in the worst case?',
      status: 'resolved',
      response: 'In the worst case, a BST can be skewed/unbalanced, turning it into a linked list where search takes linear time O(n).',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      student: { name: 'Demo Student', email: 'student@edu.ai' }
    },
    {
      id: 2,
      student_id: 'student@edu.ai',
      content: 'What is the limit definition of a derivative?',
      status: 'open',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      student: { name: 'Demo Student', email: 'student@edu.ai' }
    }
  ];
}
if (!store.timeline) {
  store.timeline = [
    {
      id: 1,
      user_id: 'student@edu.ai',
      user_name: 'Demo Student',
      role: 'student',
      action_type: 'quiz_attempt',
      metadata_json: { subject: 'Data Structures', topic: 'Stacks', correct: true },
      timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: 2,
      user_id: 'teacher@edu.ai',
      user_name: 'Demo Teacher',
      role: 'teacher',
      action_type: 'assignment_created',
      metadata_json: { assignment_title: 'Data Structures Stack Implementations', class_id: 'c1' },
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString()
    }
  ];
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const N = 16384;
  const r = 8;
  const p = 1;
  const keyLen = 64;
  const derivedKey = crypto.scryptSync(password, salt, keyLen, { N, r, p }).toString('hex');
  return `scrypt$${N}$${r}$${p}$${salt}$${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    const salt = parts[4];
    const expected = Buffer.from(parts[5], 'hex');

    const actual = crypto.scryptSync(password, salt, expected.length, { N, r, p });
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function makeToken(email: string, userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: email, uid: userId, exp: Date.now() + 86400000 })
  ).toString('base64url');
  const sig = crypto.createHash('sha256').update(payload + 'jwt_secret_edubridge').digest('hex').slice(0, 16);
  return `${payload}.${sig}`;
}

export function verifyToken(token: string): { sub: string; uid: string; exp: number } | null {
  try {
    const parts = token.split('.');
    let payloadPart = parts[0];
    if (parts.length === 3) {
      payloadPart = parts[1];
    }
    const data = JSON.parse(Buffer.from(payloadPart, 'base64url').toString());
    let exp = data.exp;
    if (exp < 10000000000) {
      exp = exp * 1000;
    }
    if (exp < Date.now()) return null;
    return {
      sub: data.sub,
      uid: data.uid || data.sub,
      exp: exp
    };
  } catch {
    return null;
  }
}

export function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
