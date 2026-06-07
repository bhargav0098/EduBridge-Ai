'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuizStore } from '@/store/quizStore';
import { Sidebar } from '@/components/ui/Sidebar';
import { Navbar } from '@/components/ui/Navbar';
import { Button } from '@/components/ui/Button';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { QuizQuestion } from '@/types';
import api from '@/services/api';
import { toast, Toaster } from 'react-hot-toast';

// Sample quiz questions
const sampleQuestions: QuizQuestion[] = [
  {
    id: 1,
    question: 'What is the capital of France?',
    options: ['London', 'Paris', 'Berlin', 'Madrid'],
    correct: 1,
    explanation: 'Paris is the capital and largest city of France.',
  },
  {
    id: 2,
    question: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    correct: 1,
    explanation: 'Mars is known as the Red Planet due to its reddish appearance.',
  },
  {
    id: 3,
    question: 'What is 2 + 2?',
    options: ['3', '4', '5', '6'],
    correct: 1,
    explanation: '2 + 2 equals 4.',
  },
  {
    id: 4,
    question: 'Who wrote "Romeo and Juliet"?',
    options: ['Jane Austen', 'William Shakespeare', 'Mark Twain', 'Charles Dickens'],
    correct: 1,
    explanation: 'William Shakespeare wrote "Romeo and Juliet" in the late 16th century.',
  },
  {
    id: 5,
    question: 'What is the largest ocean on Earth?',
    options: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'],
    correct: 3,
    explanation: 'The Pacific Ocean is the largest ocean on Earth.',
  },
];

const QUIZ_TIME = 10 * 60; // 10 minutes in seconds

export default function QuizPage() {
  const router = useRouter();
  const { questions, currentQuestion, answers, results, setQuestions, setCurrentQuestion, setAnswer, submitQuiz, resetQuiz } =
    useQuizStore();
  const [timeLeft, setTimeLeft] = useState(QUIZ_TIME);
  const [quizStarted, setQuizStarted] = useState(false);

  // Custom states
  const [enrolledClasses, setEnrolledClasses] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eloUpdate, setEloUpdate] = useState<{ oldElo: number; newElo: number; eloChange: number } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const res = await api.get('/attendance/student/profile');
        if (res.data && res.data.class_name) {
          const classesList = res.data.class_name
            .split(',')
            .map((c: string) => c.trim())
            .filter(Boolean);
          setEnrolledClasses(classesList);
          
          // Pre-select first eligible subject
          if (classesList.includes('CS-3A')) {
            setSelectedSubject('data structures');
          } else if (classesList.includes('CS-3B')) {
            setSelectedSubject('mathematics');
          } else if (classesList.includes('CS-4A')) {
            setSelectedSubject('english literature');
          }
        }
      } catch (err) {
        console.error('Error loading student profile for quiz:', err);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    fetchProfile();
    resetQuiz();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!quizStarted || results) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, results]);

  const handleStartQuiz = async () => {
    if (!selectedSubject) {
      toast.error('Please select a subject first.');
      return;
    }
    try {
      setIsLoadingQuiz(true);
      const res = await api.get(`/quiz/generate?subject=${encodeURIComponent(selectedSubject)}&level=${selectedLevel}`);
      if (res.data && res.data.length > 0) {
        // Map backend questions to front-end format
        const mapped = res.data.map((q: any) => ({
          id: q.id,
          question: q.question_text,
          options: q.options,
          correct: q.correct !== undefined ? q.correct : 0,
          explanation: q.explanation || 'No explanation provided.'
        }));
        setQuestions(mapped);
        setQuizStarted(true);
        setTimeLeft(QUIZ_TIME);
      } else {
        toast.error('No questions returned from backend.');
      }
    } catch (err) {
      toast.error('Failed to load quiz from backend.');
      console.error(err);
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const handleAnswerSelect = (optionIdx: number) => {
    setAnswer(currentQuestion, optionIdx);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    try {
      setIsSubmitting(true);
      const submissionAnswers = questions.map((q, idx) => ({
        question_id: q.id,
        answer_index: answers[idx]
      }));
      const res = await api.post('/quiz/submit', {
        subject: selectedSubject,
        answers: submissionAnswers
      });
      
      setEloUpdate({
        oldElo: res.data.old_elo,
        newElo: res.data.new_elo,
        eloChange: res.data.elo_change
      });

      submitQuiz(); 
    } catch (err) {
      toast.error('Failed to submit quiz.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  if (isLoadingProfile) {
    return (
      <div className="flex h-screen bg-background text-text-primary tech-grid justify-center items-center">
        <div className="text-center">
          <div className="animate-spin text-5xl mb-4">🔮</div>
          <p className="text-xs text-text-secondary/60 dark:text-primary-light/60 font-mono">Loading Arena profile...</p>
        </div>
      </div>
    );
  }

  if (!quizStarted) {
    const availableSubjects = [
      { id: 'data structures', name: 'Data Structures', classId: 'CS-3A', icon: '🌳', desc: 'Arrays, Stacks, Trees, AVL Trees, DP & Graphs' },
      { id: 'mathematics', name: 'Mathematics', classId: 'CS-3B', icon: '🧮', desc: 'Algebra, Matrices, Vector Spaces, Calculus, Topology' },
      { id: 'english literature', name: 'English Literature', classId: 'CS-4A', icon: '📚', desc: 'Shakespeare, Poetry, Narratology, Theory & Criticism' }
    ].filter(sub => enrolledClasses.includes(sub.classId));

    return (
      <div className="flex h-screen bg-background text-text-primary tech-grid">
        <Toaster position="top-right" />
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-auto p-6 md:p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto"
            >
              <div className="bg-surface border border-border text-text-primary rounded-2xl shadow-2xl p-8 md:p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
                
                <h1 className="text-4xl md:text-5xl font-black mb-2 text-text-primary dark:text-white">
                  📝 Adaptive <span className="gradient-text">Quiz Arena</span>
                </h1>
                <p className="text-sm text-text-secondary/80 dark:text-text-secondary/60 mb-8 leading-relaxed max-w-xl">
                  Select an academic subject according to your class enrollment and challenge yourself. 
                  The quiz will adapt based on your selected difficulty.
                </p>

                {availableSubjects.length === 0 ? (
                  <div className="bg-amber-500/10 border border-amber-500/35 p-6 rounded-2xl text-center">
                    <span className="text-4xl">⚠️</span>
                    <h3 className="font-extrabold text-white mt-3 text-lg">Not Enrolled in Any Classes</h3>
                    <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
                      You must enroll in at least one class (CS-3A, CS-3B, or CS-4A) to access quiz challenges.
                    </p>
                    <button 
                      onClick={() => router.push('/dashboard')}
                      className="mt-4 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all"
                    >
                      Enroll Now on Dashboard
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Subject Selection Grid */}
                    <div className="mb-6">
                      <h2 className="text-xs font-bold mb-3 text-primary-light/60 uppercase tracking-wider font-mono">Select Subject</h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {availableSubjects.map((sub) => {
                          const isSelected = selectedSubject === sub.id;
                          return (
                            <div
                              key={sub.id}
                              onClick={() => setSelectedSubject(sub.id)}
                              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-36 ${
                                isSelected
                                  ? 'bg-indigo-500/10 border-indigo-500/50 shadow-md shadow-indigo-500/5'
                                  : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <span className="text-2xl">{sub.icon}</span>
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-white/10 text-gray-300">
                                  {sub.classId}
                                </span>
                              </div>
                              <div>
                                <h3 className="font-bold text-sm text-white">{sub.name}</h3>
                                <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">{sub.desc}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Difficulty selection */}
                    <div className="mb-8">
                      <h2 className="text-xs font-bold mb-3 text-primary-light/60 uppercase tracking-wider font-mono">Choose Difficulty</h2>
                      <div className="flex gap-3">
                        {[
                          { id: 'easy', name: '🟢 Easy', desc: 'Level 1-2 questions' },
                          { id: 'medium', name: '🟡 Medium', desc: 'Level 3 questions' },
                          { id: 'hard', name: '🔴 Hard', desc: 'Level 4-5 questions' }
                        ].map((lvl) => {
                          const isSelected = selectedLevel === lvl.id;
                          return (
                            <button
                              key={lvl.id}
                              type="button"
                              onClick={() => setSelectedLevel(lvl.id as any)}
                              className={`flex-1 p-3.5 rounded-xl border text-left transition-all ${
                                isSelected
                                  ? 'bg-purple-500/10 border-purple-500/50 shadow-md shadow-purple-500/5'
                                  : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                              }`}
                            >
                              <div className="font-bold text-xs text-white">{lvl.name}</div>
                              <div className="text-[9px] text-gray-400 mt-0.5 font-mono">{lvl.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={handleStartQuiz}
                      disabled={isLoadingQuiz}
                      className="px-6 py-3 w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-sm font-extrabold uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/20 active:scale-98 disabled:opacity-50"
                    >
                      {isLoadingQuiz ? 'Generating Quiz Questions...' : 'Start 20-Question Quiz 🚀'}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </main>
        </div>
      </div>
    );
  }

  if (results) {
    const correctCount = results.correctCount;
    const totalCount = results.totalQuestions;
    const chartData = [
      { name: 'Correct', value: correctCount, fill: '#10b981' },
      { name: 'Wrong', value: totalCount - correctCount, fill: '#ef4444' },
    ];

    const subjectScores = questions.map((q, idx) => ({
      name: `Q${idx + 1}`,
      score: answers[idx] === q.correct ? 100 : 0
    }));

    return (
      <div className="flex h-screen bg-background text-text-primary tech-grid">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-auto p-6 md:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-8">
              <h1 className="text-4xl font-black text-text-primary dark:text-white">Quiz Results 🎉</h1>

              {/* Score Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-2xl p-6 shadow-lg relative overflow-hidden"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400/80">Correct Answers</p>
                  <p className="text-5xl font-black text-text-primary dark:text-white mt-2">{correctCount}</p>
                  <p className="text-xs text-text-secondary/60 dark:text-primary-light/40 mt-1">out of {totalCount} total questions</p>
                </motion.div>

                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20 rounded-2xl p-6 shadow-lg relative overflow-hidden"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400/80">Accuracy Rate</p>
                  <p className="text-5xl font-black text-text-primary dark:text-white mt-2">{results.accuracy}%</p>
                  <p className="text-xs text-text-secondary/60 dark:text-primary-light/40 mt-1">Success Performance</p>
                </motion.div>

                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-6 shadow-lg relative overflow-hidden"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 dark:text-amber-400/80">ELO Arena Rating</p>
                  <p className="text-5xl font-black text-text-primary dark:text-white mt-2">
                    {eloUpdate ? eloUpdate.newElo : '1200'}
                  </p>
                  <p className="text-xs text-text-secondary/60 dark:text-primary-light/40 mt-1">
                    {eloUpdate && eloUpdate.eloChange >= 0 ? `+${eloUpdate.eloChange}` : eloUpdate ? eloUpdate.eloChange : '0'} ELO change
                  </p>
                </motion.div>

                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-2xl p-6 shadow-lg relative overflow-hidden"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400/80">Evaluation Grade</p>
                  <p className="text-5xl font-black text-text-primary dark:text-white mt-2">
                    {results.accuracy >= 90 ? 'A' : results.accuracy >= 80 ? 'B' : results.accuracy >= 70 ? 'C' : 'D'}
                  </p>
                  <p className="text-xs text-text-secondary/60 dark:text-primary-light/40 mt-1">AI Assessed Rank</p>
                </motion.div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-surface border border-border rounded-2xl p-6 backdrop-blur-sm"
                >
                  <h2 className="text-md font-bold mb-4 text-white uppercase tracking-wider font-mono text-xs">Answer Distribution</h2>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* Bar Chart */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-surface border border-border rounded-2xl p-6 backdrop-blur-sm"
                >
                  <h2 className="text-md font-bold mb-4 text-white uppercase tracking-wider font-mono text-xs">Question Performance Matrix</h2>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjectScores}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                        <XAxis dataKey="name" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            color: '#fff',
                          }}
                        />
                        <Bar dataKey="score" fill="#6366f1" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </div>

              {/* Review Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface border border-border rounded-2xl p-6 backdrop-blur-sm"
              >
                <h2 className="text-md font-bold mb-6 text-text-primary dark:text-white uppercase tracking-wider font-mono text-xs">Review Details</h2>
                <div className="space-y-4">
                  {questions.map((question, idx) => {
                    const isCorrect = answers[idx] === question.correct;
                    return (
                      <div
                        key={question.id}
                        className={`border border-border p-4 rounded-xl relative ${
                          isCorrect
                            ? 'bg-green-500/10 border-green-500/20'
                            : 'bg-red-500/10 border-red-500/20'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-bold text-text-primary dark:text-white text-sm">Q{idx + 1}: {question.question}</h3>
                          <span className={`text-xs font-bold ${isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary/70 mb-1">
                          <span className="font-bold">Your Selection:</span> {question.options[answers[idx]] || 'None'}
                        </p>
                        <p className="text-xs text-text-secondary/70 mb-2">
                          <span className="font-bold">Correct Selection:</span> {question.options[question.correct]}
                        </p>
                        <p className="text-xs text-text-muted/60 dark:text-primary-light/40 italic font-mono mt-3 border-t border-border-subtle pt-2">{question.explanation}</p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="btn-ghost"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    resetQuiz();
                    setQuizStarted(false);
                    setTimeLeft(QUIZ_TIME);
                    setEloUpdate(null);
                  }}
                  className="btn-primary"
                >
                  Retake Quiz
                </button>
              </div>
            </motion.div>
          </main>
        </div>
      </div>
    );
  }

  // Quiz in progress
  if (questions.length === 0) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-5xl mb-4">📚</div>
          <p className="text-xs text-text-secondary/60 dark:text-primary-light/60 font-mono">Loading Quiz Instance...</p>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const isAnswered = answers[currentQuestion] !== -1;

  return (
    <div className="flex h-screen bg-background text-text-primary tech-grid">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-auto p-6 md:p-8">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-primary-light/60 font-mono">
                  Question {currentQuestion + 1} of {questions.length}
                </span>
                <span className={`text-xs font-mono font-bold ${timeLeft < 60 ? 'text-red-400' : 'text-indigo-400'}`}>
                  ⏱️ {formatTime(timeLeft)}
                </span>
              </div>
              <div className="w-full bg-surface border border-border rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full transition-all duration-300"
                  style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface border border-border backdrop-blur-sm rounded-2xl p-8 mb-8 relative overflow-hidden"
            >
              <h2 className="text-xl font-bold mb-8 text-text-primary dark:text-white">{question.question}</h2>

              {/* Options */}
              <div className="space-y-3 mb-8">
                {question.options.map((option, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => handleAnswerSelect(idx)}
                    className={`w-full p-4 text-left rounded-xl border-2 font-medium transition-all text-sm ${
                      answers[currentQuestion] === idx
                        ? 'border-indigo-500 bg-indigo-500/10 text-primary dark:text-white font-bold'
                        : 'border-border-subtle hover:border-indigo-500/30 text-text-secondary/70 hover:text-text-primary dark:hover:text-white bg-white/[0.02]'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${
                          answers[currentQuestion] === idx
                            ? 'border-indigo-400 bg-indigo-500 text-white'
                            : 'border-border'
                        }`}
                      >
                        {answers[currentQuestion] === idx && '✓'}
                      </span>
                      {option}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-4 justify-between">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                  className="btn-ghost !py-2.5 disabled:opacity-30 disabled:pointer-events-none"
                >
                  ← Previous
                </button>

                {currentQuestion === questions.length - 1 ? (
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={!isAnswered || isSubmitting}
                    className="btn-primary !py-2.5 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    disabled={!isAnswered}
                    className="btn-primary !py-2.5 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Next →
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
