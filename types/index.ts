export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
  profileImage?: string;
  gender?: string;
  phone?: string;
  bio?: string;
  className?: string;
  studyTimePreference?: string;
  weakSubjects?: string;
  subject?: string;
  experience?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  image?: string;
  timestamp: Date;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
}

export interface QuizResult {
  correctCount: number;
  totalQuestions: number;
  accuracy: number;
  timestamp: Date;
}

export interface DashboardStats {
  attendance: number;
  quizScore: number;
  learningStreak: number;
  nextEvent: string;
}
