import { create } from 'zustand';
import { QuizQuestion, QuizResult } from '@/types';

interface QuizStore {
  questions: QuizQuestion[];
  currentQuestion: number;
  answers: number[];
  isLoading: boolean;
  results: QuizResult | null;
  setQuestions: (questions: QuizQuestion[]) => void;
  setCurrentQuestion: (index: number) => void;
  setAnswer: (questionIndex: number, answerIndex: number) => void;
  submitQuiz: () => QuizResult | null;
  resetQuiz: () => void;
}

export const useQuizStore = create<QuizStore>((set, get) => ({
  questions: [],
  currentQuestion: 0,
  answers: [],
  isLoading: false,
  results: null,

  setQuestions: (questions: QuizQuestion[]) =>
    set({ questions, answers: new Array(questions.length).fill(-1) }),

  setCurrentQuestion: (index: number) => set({ currentQuestion: index }),

  setAnswer: (questionIndex: number, answerIndex: number) =>
    set((state) => {
      const newAnswers = [...state.answers];
      newAnswers[questionIndex] = answerIndex;
      return { answers: newAnswers };
    }),

  submitQuiz: () => {
    const { questions, answers } = get();
    const correctCount = answers.filter(
      (answer, idx) => answer === questions[idx].correct
    ).length;

    const result: QuizResult = {
      correctCount,
      totalQuestions: questions.length,
      accuracy: Math.round((correctCount / questions.length) * 100),
      timestamp: new Date(),
    };

    set({ results: result });
    return result;
  },

  resetQuiz: () =>
    set({
      currentQuestion: 0,
      answers: [],
      results: null,
      questions: [],
    }),
}));
