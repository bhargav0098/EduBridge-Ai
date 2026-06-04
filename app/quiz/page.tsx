'use client';

import { useState, useEffect } from 'react';
import { useQuizStore } from '@/store/quizStore';
import { Sidebar } from '@/components/ui/Sidebar';
import { Navbar } from '@/components/ui/Navbar';
import { Button } from '@/components/ui/Button';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { QuizQuestion } from '@/types';

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
  const { questions, currentQuestion, answers, results, setQuestions, setCurrentQuestion, setAnswer, submitQuiz } =
    useQuizStore();
  const [timeLeft, setTimeLeft] = useState(QUIZ_TIME);
  const [quizStarted, setQuizStarted] = useState(false);

  useEffect(() => {
    if (questions.length === 0) {
      setQuestions(sampleQuestions);
    }
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

  const handleStartQuiz = () => {
    setQuizStarted(true);
    setTimeLeft(QUIZ_TIME);
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

  const handleSubmitQuiz = () => {
    submitQuiz();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  if (!quizStarted) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-auto p-6 md:p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-gradient-to-br from-purple-500 to-blue-600 text-white rounded-xl shadow-2xl p-8 md:p-12">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">📝 Adaptive Quiz</h1>
                <p className="text-lg mb-8 opacity-90">
                  Test your knowledge with our intelligent quiz system. Your answers will be analyzed to provide
                  personalized learning recommendations.
                </p>

                <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg p-6 mb-8">
                  <h2 className="text-xl font-bold mb-4">Quiz Details</h2>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <span>📊</span> <span>5 Questions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span>⏱️</span> <span>10 minutes</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span>⭐</span> <span>Multiple Choice</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span>📈</span> <span>Instant Results with Explanations</span>
                    </li>
                  </ul>
                </div>

                <Button onClick={handleStartQuiz} className="w-full bg-white text-blue-600 hover:bg-gray-100 text-lg py-3">
                  Start Quiz Now
                </Button>
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

    const subjectScores = [
      { name: 'Q1', score: answers[0] === questions[0]?.correct ? 100 : 0 },
      { name: 'Q2', score: answers[1] === questions[1]?.correct ? 100 : 0 },
      { name: 'Q3', score: answers[2] === questions[2]?.correct ? 100 : 0 },
      { name: 'Q4', score: answers[3] === questions[3]?.correct ? 100 : 0 },
      { name: 'Q5', score: answers[4] === questions[4]?.correct ? 100 : 0 },
    ];

    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-auto p-6 md:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
              <h1 className="text-4xl font-bold mb-8 dark:text-white">Quiz Results 🎉</h1>

              {/* Score Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-br from-green-400 to-green-600 text-white rounded-lg p-6 shadow-lg"
                >
                  <p className="text-sm opacity-90">Correct Answers</p>
                  <p className="text-4xl font-bold">{correctCount}</p>
                  <p className="text-xs opacity-75 mt-1">out of {totalCount}</p>
                </motion.div>

                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-lg p-6 shadow-lg"
                >
                  <p className="text-sm opacity-90">Accuracy</p>
                  <p className="text-4xl font-bold">{results.accuracy}%</p>
                  <p className="text-xs opacity-75 mt-1">Success Rate</p>
                </motion.div>

                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-purple-400 to-purple-600 text-white rounded-lg p-6 shadow-lg"
                >
                  <p className="text-sm opacity-90">Grade</p>
                  <p className="text-4xl font-bold">
                    {results.accuracy >= 90 ? 'A' : results.accuracy >= 80 ? 'B' : results.accuracy >= 70 ? 'C' : 'D'}
                  </p>
                  <p className="text-xs opacity-75 mt-1">Assessment</p>
                </motion.div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Pie Chart */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
                >
                  <h2 className="text-xl font-bold mb-4 dark:text-white">Answer Distribution</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
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
                </motion.div>

                {/* Bar Chart */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
                >
                  <h2 className="text-xl font-bold mb-4 dark:text-white">Question-wise Performance</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={subjectScores}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                        }}
                      />
                      <Bar dataKey="score" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              </div>

              {/* Review Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8"
              >
                <h2 className="text-xl font-bold mb-6 dark:text-white">Review Your Answers</h2>
                <div className="space-y-6">
                  {questions.map((question, idx) => {
                    const isCorrect = answers[idx] === question.correct;
                    return (
                      <div
                        key={question.id}
                        className={`border-l-4 p-4 rounded ${
                          isCorrect
                            ? 'border-green-500 bg-green-50 dark:bg-green-900'
                            : 'border-red-500 bg-red-50 dark:bg-red-900'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold dark:text-white">Q{idx + 1}: {question.question}</h3>
                          <span className={`text-sm font-bold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                            {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          <span className="font-medium">Your answer:</span> {question.options[answers[idx]]}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          <span className="font-medium">Correct answer:</span> {question.options[question.correct]}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 italic">{question.explanation}</p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center">
                <Button onClick={() => window.location.href = '/dashboard'} variant="secondary">
                  Back to Dashboard
                </Button>
                <Button onClick={() => window.location.reload()}>Retake Quiz</Button>
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
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">📚</div>
          <p className="text-gray-600 dark:text-gray-400">Loading quiz...</p>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const isAnswered = answers[currentQuestion] !== -1;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-auto p-6 md:p-8">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium dark:text-gray-300">
                  Question {currentQuestion + 1} of {questions.length}
                </span>
                <span className={`text-sm font-bold ${timeLeft < 60 ? 'text-red-600' : 'text-blue-600'}`}>
                  ⏱️ {formatTime(timeLeft)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8"
            >
              <h2 className="text-2xl font-bold mb-8 dark:text-white">{question.question}</h2>

              {/* Options */}
              <div className="space-y-3 mb-8">
                {question.options.map((option, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => handleAnswerSelect(idx)}
                    className={`w-full p-4 text-left rounded-lg border-2 font-medium transition-all ${
                      answers[currentQuestion] === idx
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          answers[currentQuestion] === idx
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-gray-300 dark:border-gray-600'
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
                <Button
                  onClick={handlePrevious}
                  variant="secondary"
                  disabled={currentQuestion === 0}
                >
                  ← Previous
                </Button>

                {currentQuestion === questions.length - 1 ? (
                  <Button
                    onClick={handleSubmitQuiz}
                    disabled={!isAnswered}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Submit Quiz
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    disabled={!isAnswered}
                  >
                    Next →
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
