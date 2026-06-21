'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuizStore } from '@/store/quizStore';
import { Sidebar } from '@/components/ui/Sidebar';
import { Navbar } from '@/components/ui/Navbar';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/services/api';
import { toast, Toaster } from 'react-hot-toast';

const QUIZ_TIME = 10 * 60; // 10 minutes in seconds

export default function QuizPage() {
  const router = useRouter();
  const { questions, currentQuestion, answers, results, setQuestions, setCurrentQuestion, setAnswer, submitQuiz, resetQuiz } =
    useQuizStore();
  const [timeLeft, setTimeLeft] = useState(QUIZ_TIME);
  const [quizStarted, setQuizStarted] = useState(false);

  // Custom states
  const [subTab, setSubTab] = useState<'arena' | 'pathways'>('arena');
  const [enrolledClasses, setEnrolledClasses] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eloUpdate, setEloUpdate] = useState<{ oldElo: number; newElo: number; eloChange: number } | null>(null);

  // Pathways data states
  const [pathwayData, setPathwayData] = useState<any[]>([]);
  const [pathwayLoading, setPathwayLoading] = useState(false);
  const [activeMicroLesson, setActiveMicroLesson] = useState<{ topic: string; content: string } | null>(null);
  const [triggeredLessons, setTriggeredLessons] = useState<any[]>([]);

  // Concept Graph & Interactive practice states
  const [conceptGraph, setConceptGraph] = useState<any>(null);
  const [conceptGraphLoading, setConceptGraphLoading] = useState(false);
  const [selectedGraphNode, setSelectedGraphNode] = useState<any>(null);
  const [activePracticeQuestion, setActivePracticeQuestion] = useState<any>(null);
  const [practiceAnswer, setPracticeAnswer] = useState<string>('');
  const [practiceAnswerSubmitting, setPracticeAnswerSubmitting] = useState(false);
  const [practiceResult, setPracticeResult] = useState<any>(null);

  const fetchConceptGraph = async () => {
    try {
      setConceptGraphLoading(true);
      const res = await api.get('/quiz/concept-graph');
      setConceptGraph(res.data);
    } catch (err) {
      console.error('Failed to fetch concept graph:', err);
    } finally {
      setConceptGraphLoading(false);
    }
  };

  const startPractice = async (topicId: string) => {
    try {
      setPracticeResult(null);
      setPracticeAnswer('');
      const res = await api.get(`/quiz/next?subject=${encodeURIComponent(selectedSubject)}&topic=${encodeURIComponent(topicId)}`);
      setActivePracticeQuestion(res.data);
    } catch (err) {
      toast.error('No practice questions available for this topic.');
    }
  };

  const submitPracticeAnswer = async () => {
    if (!practiceAnswer.trim()) {
      toast.error('Please enter or select an answer.');
      return;
    }
    try {
      setPracticeAnswerSubmitting(true);
      const res = await api.post(`/quiz/answer?question_id=${activePracticeQuestion.id}&student_answer=${encodeURIComponent(practiceAnswer)}`);
      setPracticeResult(res.data);
      // Refresh pathways and concept graph after answering to update mastery color codings!
      fetchPathway();
      fetchConceptGraph();
    } catch (err) {
      toast.error('Failed to submit practice answer.');
    } finally {
      setPracticeAnswerSubmitting(false);
    }
  };

  // Fetch Student Profile
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

  // Fetch Learning Pathway
  const fetchPathway = async () => {
    if (!selectedSubject) return;
    try {
      setPathwayLoading(true);
      const res = await api.get(`/quiz/pathway?subject=${encodeURIComponent(selectedSubject)}`);
      setPathwayData(res.data?.pathway || []);
    } catch (err) {
      console.error('Failed to fetch pathway', err);
    } finally {
      setPathwayLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    resetQuiz();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      fetchPathway();
      fetchConceptGraph();
    }
  }, [selectedSubject]);

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
        setTriggeredLessons([]);
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

      if (res.data.triggered_lessons) {
        setTriggeredLessons(res.data.triggered_lessons);
      }

      submitQuiz();
      fetchPathway(); // Reload pathway stats
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

  // Predefined static micro-lessons fallback list
  const LOCAL_MICRO_LESSONS: Record<string, string> = {
    'arrays': 'Arrays store elements in contiguous memory. Accessing an element by index takes O(1) time. Searching in an unsorted array takes O(N) time.',
    'stacks': 'Stacks follow the LIFO (Last In First Out) order. The core operations are Push and Pop, both running in O(1) time at the top.',
    'queues': 'Queues follow FIFO (First In First Out) order. Enqueue happens at the rear, and dequeue happens at the front, both running in O(1) time.',
    'linked lists': 'Linked Lists consist of nodes containing data and pointers to the next node. Accessing is O(N), but insertion at the head is O(1).',
    'complexity': 'Big O notation represents performance scaling. O(1) is constant, O(log N) is logarithmic, O(N) is linear, and O(N^2) is quadratic.',
    'algebra': 'Algebraic isolations require running operations on both sides. E.g. in 2x+3=13, subtracting 3 yields 2x=10, then dividing by 2 yields x=5.',
    'calculus': 'Calculus measures dynamic changes. The derivative represents the slope/rate of change (the derivative of x^2 is 2x). Integration computes area.',
    'probability': 'Probability measures events: P(A) = favorable outcomes / total outcomes. For independent events, P(A and B) = P(A) * P(B).',
    'sets': 'A Set is a collection of unique elements. The Union contains all items in either set. The Intersection contains common elements.',
  };

  const handleLessonTrigger = (topic: string) => {
    const lowerTopic = topic.toLowerCase().trim();
    let content = LOCAL_MICRO_LESSONS[lowerTopic];
    if (!content) {
      content = `This micro-lesson covers the core aspects of ${topic}. Study the textbook definitions, write down mathematical formulas, and run practice problems to build mastery.`;
    }
    setActiveMicroLesson({ topic, content });
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

  const availableSubjects = [
    { id: 'data structures', name: 'Data Structures', classId: 'CS-3A', icon: '🌳', desc: 'Arrays, Stacks, Trees, AVL Trees, DP & Graphs' },
    { id: 'mathematics', name: 'Mathematics', classId: 'CS-3B', icon: '🧮', desc: 'Algebra, Matrices, Vector Spaces, Calculus, Topology' },
    { id: 'english literature', name: 'English Literature', classId: 'CS-4A', icon: '📚', desc: 'Shakespeare, Poetry, Narratology, Theory & Criticism' }
  ].filter(sub => enrolledClasses.includes(sub.classId));

  if (!quizStarted) {
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
              className="max-w-4xl mx-auto space-y-6"
            >
              {/* Header Box */}
              <div className="bg-surface border border-border text-text-primary rounded-2xl shadow-2xl p-6 md:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
                <h1 className="text-4xl font-black mb-2 text-white">
                  📝 Adaptive <span className="gradient-text">Quiz Arena</span>
                </h1>
                <p className="text-xs text-gray-400 mb-6">
                  Challenge yourself with AI-driven, ELO-adjusted STEM assessments.
                </p>

                {/* Sub Tab Switcher */}
                {availableSubjects.length > 0 && (
                  <div className="flex gap-2 border-b border-border pb-3 mb-6">
                    <button
                      onClick={() => setSubTab('arena')}
                      aria-label="Switch to Quiz Arena sub-tab"
                      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                        subTab === 'arena'
                          ? 'bg-primary/10 text-primary dark:text-primary-light border border-indigo-500/35 shadow-sm'
                          : 'text-text-secondary/50 hover:text-white'
                      }`}
                    >
                      ⚔️ Quiz Arena
                    </button>
                    <button
                      onClick={() => setSubTab('pathways')}
                      aria-label="Switch to Learning Pathways sub-tab"
                      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                        subTab === 'pathways'
                          ? 'bg-primary/10 text-primary dark:text-primary-light border border-indigo-500/35 shadow-sm'
                          : 'text-text-secondary/50 hover:text-white'
                      }`}
                    >
                      🗺️ Learning Pathways
                    </button>
                  </div>
                )}

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
                ) : subTab === 'arena' ? (
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
                ) : (
                  /* LEARNING PATHWAYS TAB */
                  <div className="space-y-6">
                    {/* Subject Selector for Pathways */}
                    <div className="flex gap-3 mb-4">
                      {availableSubjects.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => setSelectedSubject(sub.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                            selectedSubject === sub.id
                              ? 'bg-indigo-500/10 border-indigo-500/40 text-white'
                              : 'bg-white/5 border-white/5 text-gray-400'
                          }`}
                        >
                          {sub.name}
                        </button>
                      ))}
                    </div>

                    {pathwayLoading || conceptGraphLoading ? (
                      <div className="py-12 text-center text-xs font-mono text-gray-400">Computing pathways and concept graph...</div>
                    ) : pathwayData.length === 0 ? (
                      <div className="py-12 text-center text-xs font-mono text-gray-400">No mastery data. Attempt a quiz first!</div>
                    ) : (() => {
                      // Filter graph nodes
                      const nodes = conceptGraph?.nodes?.filter(
                        (n: any) => n.subject.toLowerCase() === selectedSubject.toLowerCase()
                      ) || [];

                      const nodesMap = new Map<string, any>(nodes.map((n: any) => [n.id.toLowerCase().trim(), n]));

                      // Calculate node lock state
                      const isNodeLocked = (node: any) => {
                        if (!node.prerequisites) return false;
                        for (const pre of node.prerequisites) {
                          const cleanPre = pre.toLowerCase().trim();
                          const preNode = nodesMap.get(cleanPre);
                          if (preNode) {
                            const preMastery = preNode.mastery || 0;
                            if (preMastery < 50) return true;
                          }
                        }
                        return false;
                      };

                      // DAG Level Calculation
                      const levels: Record<string, number> = {};
                      const getLevel = (nodeId: string): number => {
                        const cleanId = nodeId.toLowerCase().trim();
                        if (cleanId in levels) return levels[cleanId];
                        const n = nodesMap.get(cleanId);
                        if (!n || !n.prerequisites || n.prerequisites.length === 0) {
                          levels[cleanId] = 0;
                          return 0;
                        }
                        let maxLvl = 0;
                        for (const pre of n.prerequisites) {
                          const cleanPre = pre.toLowerCase().trim();
                          if (nodesMap.has(cleanPre)) {
                            maxLvl = Math.max(maxLvl, getLevel(cleanPre));
                          }
                        }
                        levels[cleanId] = maxLvl + 1;
                        return levels[cleanId];
                      };

                      nodes.forEach((n: any) => getLevel(n.id));

                      // Group by level
                      const levelGroups: Record<number, any[]> = {};
                      nodes.forEach((n: any) => {
                        const cleanId = n.id.toLowerCase().trim();
                        const lvl = levels[cleanId] || 0;
                        if (!levelGroups[lvl]) levelGroups[lvl] = [];
                        levelGroups[lvl].push(n);
                      });

                      const maxLevel = Math.max(...Object.keys(levelGroups).map(Number), 0);
                      const svgWidth = 600;
                      const levelHeight = 110;
                      const svgHeight = maxLevel >= 0 ? 100 + maxLevel * levelHeight : 200;
                      const nodeRadius = 18;

                      // Calculate coordinates
                      const coords: Record<string, { x: number; y: number }> = {};
                      Object.keys(levelGroups).forEach((lvlStr) => {
                        const lvl = Number(lvlStr);
                        const grpNodes = levelGroups[lvl];
                        const count = grpNodes.length;
                        grpNodes.forEach((node, index) => {
                          const cleanId = node.id.toLowerCase().trim();
                          const x = count === 1 ? svgWidth / 2 : (svgWidth / (count + 1)) * (index + 1);
                          const y = 40 + lvl * levelHeight;
                          coords[cleanId] = { x, y };
                        });
                      });

                      // Spaced repetition decay warnings
                      const decayedTopics = pathwayData.filter(item => item.review_recommended);

                      return (
                        <div className="space-y-6">
                          {/* Decay Warnings Banner */}
                          {decayedTopics.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-amber-500/10 border border-amber-500/35 p-4 rounded-xl flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-xl">⏳</span>
                                <div>
                                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">Knowledge Decay Warning</h4>
                                  <p className="text-[11px] text-gray-300">
                                    Retention of the following concepts has faded below 60%. Reviews are recommended:
                                    <span className="font-bold text-white ml-1">
                                      {decayedTopics.map(t => t.topic).join(', ')}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {/* Interactive Skill Tree Concept Graph */}
                          <div className="bg-surface border border-border rounded-2xl p-6 relative overflow-hidden">
                            <div className="flex justify-between items-center mb-4">
                              <div>
                                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Concept Dependency Map</h3>
                                <p className="text-[10px] text-gray-400">Click a node to examine prerequisites and start targeted practice.</p>
                              </div>
                              <div className="flex gap-3 text-[10px] font-mono">
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500" /> Mastered</span>
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500/20 border border-blue-500" /> Practiced</span>
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-500/20 border border-gray-500 border-dashed" /> Locked</span>
                              </div>
                            </div>

                            <div className="flex justify-center bg-black/25 border border-border/50 rounded-xl p-4 overflow-x-auto">
                              <svg width={svgWidth} height={svgHeight} className="overflow-visible">
                                <defs>
                                  <marker id="arrow" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" opacity="0.6" />
                                  </marker>
                                  <marker id="arrow-locked" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" opacity="0.3" />
                                  </marker>
                                </defs>

                                {/* Draw Connection Lines */}
                                {nodes.map((node: any) => {
                                  const cleanId = node.id.toLowerCase().trim();
                                  const targetPt = coords[cleanId];
                                  if (!targetPt || !node.prerequisites) return null;

                                  return node.prerequisites.map((preId: string) => {
                                    const cleanPre = preId.toLowerCase().trim();
                                    const sourcePt = coords[cleanPre];
                                    if (!sourcePt) return null;

                                    const isLockedEdge = isNodeLocked(node);

                                    return (
                                      <line
                                        key={`${cleanPre}-${cleanId}`}
                                        x1={sourcePt.x}
                                        y1={sourcePt.y}
                                        x2={targetPt.x}
                                        y2={targetPt.y}
                                        stroke={isLockedEdge ? '#334155' : '#6366f1'}
                                        strokeWidth={isLockedEdge ? 1 : 2}
                                        strokeDasharray={isLockedEdge ? '4' : undefined}
                                        opacity={isLockedEdge ? 0.3 : 0.6}
                                        markerEnd={isLockedEdge ? 'url(#arrow-locked)' : 'url(#arrow)'}
                                      />
                                    );
                                  });
                                })}

                                {/* Draw Nodes */}
                                {nodes.map((node: any) => {
                                  const cleanId = node.id.toLowerCase().trim();
                                  const pt = coords[cleanId];
                                  if (!pt) return null;

                                  const mastery = node.mastery || 0;
                                  const isLockedNode = isNodeLocked(node);
                                  const isMastered = mastery >= 75;
                                  
                                  const isSelected = selectedGraphNode?.id === node.id;

                                  let fillClass = 'fill-gray-900 stroke-gray-700 stroke-dashed';
                                  if (!isLockedNode) {
                                    if (isMastered) {
                                      fillClass = 'fill-green-950/40 stroke-green-500 shadow-lg';
                                    } else {
                                      fillClass = 'fill-indigo-950/40 stroke-indigo-500';
                                    }
                                  }

                                  return (
                                    <g
                                      key={node.id}
                                      transform={`translate(${pt.x}, ${pt.y})`}
                                      className="cursor-pointer group"
                                      onClick={() => setSelectedGraphNode(node)}
                                    >
                                      {/* Outer Selection Highlight Ring */}
                                      {isSelected && (
                                        <circle
                                          r={nodeRadius + 6}
                                          className="fill-none stroke-purple-400 stroke-2 animate-pulse"
                                        />
                                      )}
                                      
                                      <circle
                                        r={nodeRadius}
                                        className={`${fillClass} transition-all duration-300 group-hover:scale-110`}
                                        style={{ strokeWidth: isSelected ? 3 : 2 }}
                                      />

                                      {/* Node Icon/Text inside circle */}
                                      <text
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        className="text-[10px] font-mono fill-white pointer-events-none"
                                      >
                                        {isLockedNode ? '🔒' : `${Math.round(mastery)}%`}
                                      </text>

                                      {/* Label Text below Circle */}
                                      <text
                                        y={nodeRadius + 15}
                                        textAnchor="middle"
                                        className="text-[9px] font-mono fill-gray-300 pointer-events-none font-bold"
                                      >
                                        {node.label}
                                      </text>
                                    </g>
                                  );
                                })}
                              </svg>
                            </div>
                          </div>

                          {/* Selected Concept Panel */}
                          <AnimatePresence mode="wait">
                            {selectedGraphNode && (() => {
                              // Find corresponding pathway item for practicing metrics
                              const pItem = pathwayData.find(p => p.topic.toLowerCase().trim() === selectedGraphNode.id.toLowerCase().trim());
                              const isLockedNode = isNodeLocked(selectedGraphNode);

                              return (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 10 }}
                                  className="bg-surface border border-indigo-500/20 rounded-2xl p-5"
                                >
                                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="space-y-1">
                                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <span>{isLockedNode ? '🔒' : '🔓'}</span>
                                        {selectedGraphNode.label}
                                      </h3>
                                      <p className="text-[11px] text-gray-400 leading-relaxed max-w-xl">
                                        {selectedGraphNode.description}
                                      </p>
                                      {selectedGraphNode.prerequisites?.length > 0 && (
                                        <p className="text-[10px] text-gray-500 font-mono">
                                          Prerequisites: {selectedGraphNode.prerequisites.join(', ')}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex gap-3">
                                      <button
                                        onClick={() => handleLessonTrigger(selectedGraphNode.label)}
                                        className="px-4 py-2 border border-border text-gray-300 hover:text-white rounded-xl text-xs font-bold uppercase transition-all"
                                      >
                                        📖 Lesson
                                      </button>
                                      <button
                                        onClick={() => startPractice(selectedGraphNode.id)}
                                        disabled={isLockedNode}
                                        className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-md shadow-indigo-500/10 disabled:opacity-40 disabled:pointer-events-none"
                                      >
                                        🎯 Practice Concept
                                      </button>
                                    </div>
                                  </div>

                                  {pItem && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border-subtle text-center">
                                      <div>
                                        <span className="text-[9px] text-gray-500 uppercase tracking-wider font-mono block">BKT Mastery Level</span>
                                        <span className="text-xs font-bold text-indigo-400 font-mono block mt-0.5">
                                          {pItem.p_known !== undefined ? `${Math.round(pItem.p_known * 100)}%` : '25%'}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-[9px] text-gray-500 uppercase tracking-wider font-mono block">Accuracy</span>
                                        <span className="text-xs font-bold text-white font-mono block mt-0.5">
                                          {pItem.accuracy}%
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-[9px] text-gray-500 uppercase tracking-wider font-mono block">Retention Score</span>
                                        <span className={`text-xs font-bold font-mono block mt-0.5 ${pItem.review_recommended ? 'text-amber-400' : 'text-green-400'}`}>
                                          {pItem.retention}%
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-[9px] text-gray-500 uppercase tracking-wider font-mono block">Last Practiced</span>
                                        <span className="text-xs font-bold text-gray-400 font-mono block mt-0.5">
                                          {pItem.last_practiced ? new Date(pItem.last_practiced).toLocaleDateString() : 'Never'}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })()}
                          </AnimatePresence>

                          {/* Overall Pathway Details Table/Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pathwayData.map((item) => (
                              <div
                                key={item.topic}
                                className="bg-white/[0.02] border border-border rounded-2xl p-5 flex flex-col justify-between"
                              >
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <h3 className="font-extrabold text-sm text-white">{item.topic}</h3>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                                      item.status === 'Mastered'
                                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                        : item.status === 'In Progress'
                                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                        : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                    }`}>
                                      {item.status}
                                    </span>
                                  </div>

                                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
                                    <span>Accuracy: {item.accuracy}%</span>
                                    <span>Attempts: {item.attempts}</span>
                                    {item.retention && (
                                      <span className={item.review_recommended ? 'text-amber-400' : 'text-green-400'}>
                                        Retention: {item.retention}%
                                      </span>
                                    )}
                                  </div>

                                  <div className="w-full bg-surface border border-border rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-full transition-all ${
                                        item.accuracy >= 70 ? 'bg-green-400' : item.accuracy >= 40 ? 'bg-blue-400' : 'bg-red-400'
                                      }`}
                                      style={{ width: `${item.accuracy}%` }}
                                    />
                                  </div>
                                </div>

                                <div className="border-t border-border-subtle mt-4 pt-3 flex justify-between items-center">
                                  <div>
                                    <div className="text-[9px] text-gray-500 uppercase tracking-wider font-mono">Next Recommended Goal</div>
                                    <div className="text-xs font-bold text-gray-300">{item.next_lesson}</div>
                                  </div>
                                  <button
                                    onClick={() => handleLessonTrigger(item.topic)}
                                    aria-label={`Study concepts for ${item.topic}`}
                                    className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 hover:text-white rounded-lg text-[10px] font-bold uppercase transition-all"
                                  >
                                    📚 Study Concept
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </motion.div>
          </main>

          {/* Micro Lesson Modal */}
          <AnimatePresence>
            {activeMicroLesson && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-surface border border-border rounded-2xl shadow-2xl p-6 max-w-md w-full relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
                  <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
                    <span>💡</span> Micro-Lesson: {activeMicroLesson.topic}
                  </h3>
                  <p className="text-xs text-gray-300 leading-relaxed bg-white/[0.02] border border-border p-4 rounded-xl font-mono mb-4">
                    {activeMicroLesson.content}
                  </p>
                  <div className="flex justify-end border-t border-border pt-4">
                    <button
                      onClick={() => setActiveMicroLesson(null)}
                      aria-label="Close micro-lesson modal"
                      className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold rounded-xl shadow-md"
                    >
                      Got it, thanks!
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
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
              <h1 className="text-4xl font-black text-white">Quiz Results 🎉</h1>

              {/* Triggered Micro Lessons Alert Box */}
              {triggeredLessons.length > 0 && (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-amber-500/10 border-2 border-amber-500/35 rounded-2xl p-5 space-y-3"
                >
                  <h3 className="font-extrabold text-amber-400 text-sm flex items-center gap-2">
                    <span>💡</span> Adaptive Feedback: Review Micro-Lessons
                  </h3>
                  <p className="text-[11px] text-gray-300">
                    You missed a couple of questions in these topics. Read the brief micro-lessons below to clear your concepts:
                  </p>
                  <div className="space-y-3 mt-2">
                    {triggeredLessons.map((item, idx) => (
                      <div key={idx} className="bg-white/5 border border-white/5 p-3.5 rounded-xl font-mono text-[10px] text-gray-300">
                        <span className="font-bold text-amber-300 uppercase block mb-1">Topic: {item.topic}</span>
                        {item.lesson}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Score Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-2xl p-6 shadow-lg relative overflow-hidden"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-green-400/80">Correct Answers</p>
                  <p className="text-5xl font-black text-white mt-2">{correctCount}</p>
                  <p className="text-xs text-primary-light/40 mt-1">out of {totalCount} total questions</p>
                </motion.div>

                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20 rounded-2xl p-6 shadow-lg relative overflow-hidden"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400/80">Accuracy Rate</p>
                  <p className="text-5xl font-black text-white mt-2">{results.accuracy}%</p>
                  <p className="text-xs text-primary-light/40 mt-1">Success Performance</p>
                </motion.div>

                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-6 shadow-lg relative overflow-hidden"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 dark:text-amber-400/80">ELO Arena Rating</p>
                  <p className="text-5xl font-black text-white mt-2">
                    {eloUpdate ? eloUpdate.newElo : '1200'}
                  </p>
                  <p className="text-xs text-primary-light/40 mt-1">
                    {eloUpdate && eloUpdate.eloChange >= 0 ? `+${eloUpdate.eloChange}` : eloUpdate ? eloUpdate.eloChange : '0'} ELO change
                  </p>
                </motion.div>

                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-2xl p-6 shadow-lg relative overflow-hidden"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-purple-400/80">Evaluation Grade</p>
                  <p className="text-5xl font-black text-white mt-2">
                    {results.accuracy >= 90 ? 'A' : results.accuracy >= 80 ? 'B' : results.accuracy >= 70 ? 'C' : 'D'}
                  </p>
                  <p className="text-xs text-primary-light/40 mt-1">AI Assessed Rank</p>
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
                <h2 className="text-md font-bold mb-6 text-white uppercase tracking-wider font-mono text-xs">Review Details</h2>
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
                          <h3 className="font-bold text-white text-sm">Q{idx + 1}: {question.question}</h3>
                          <span className={`text-xs font-bold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                            {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mb-1">
                          <span className="font-bold">Your Selection:</span> {question.options[answers[idx]] || 'None'}
                        </p>
                        <p className="text-xs text-gray-400 mb-2">
                          <span className="font-bold">Correct Selection:</span> {question.options[question.correct]}
                        </p>
                        <p className="text-xs text-primary-light/40 italic font-mono mt-3 border-t border-border-subtle pt-2">{question.explanation}</p>
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
                    setTriggeredLessons([]);
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
              <h2 className="text-xl font-bold mb-8 text-white">{question.question}</h2>

              {/* Options */}
              <div className="space-y-3 mb-8">
                {question.options.map((option, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => handleAnswerSelect(idx)}
                    className={`w-full p-4 text-left rounded-xl border-2 font-medium transition-all text-sm ${
                      answers[currentQuestion] === idx
                        ? 'border-indigo-500 bg-indigo-500/10 text-white font-bold'
                        : 'border-border-subtle hover:border-indigo-500/30 text-text-secondary/70 hover:text-white bg-white/[0.02]'
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
      {/* Sliding Practice Panel */}
      <AnimatePresence>
        {activePracticeQuestion && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
            <div className="absolute inset-0" onClick={() => { if (!practiceAnswerSubmitting) { setActivePracticeQuestion(null); setPracticeResult(null); } }} />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-[#080814] border-l border-indigo-500/20 h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto text-text-primary noise-overlay"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-border pb-4">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono text-[9px] font-bold uppercase">
                      Concept Practice
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1">
                      {activePracticeQuestion.topic}
                    </h3>
                  </div>
                  <button
                    onClick={() => { setActivePracticeQuestion(null); setPracticeResult(null); }}
                    className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all font-mono"
                  >
                    ✕
                  </button>
                </div>

                <div className="bg-white/[0.02] border border-border rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] text-gray-400 font-mono">
                      Difficulty: {activePracticeQuestion.difficulty}/5
                    </span>
                    <span className="text-[9px] text-indigo-400 font-mono">
                      Type: {activePracticeQuestion.type}
                    </span>
                  </div>
                  <p className="text-xs text-white leading-relaxed font-mono">
                    {activePracticeQuestion.question_text}
                  </p>
                </div>

                {!practiceResult ? (
                  <div className="space-y-4">
                    {activePracticeQuestion.type === 'SHORT' ? (
                      <div className="space-y-2">
                        <label className="text-[9px] text-gray-400 uppercase tracking-wider font-mono">Your Answer</label>
                        <textarea
                          value={practiceAnswer}
                          onChange={(e) => setPracticeAnswer(e.target.value)}
                          placeholder="Type your answer here..."
                          className="w-full h-24 bg-black/40 border border-border focus:border-indigo-500/60 rounded-xl p-3 text-xs text-white focus:outline-none placeholder-gray-600 font-mono"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <label className="text-[9px] text-gray-400 uppercase tracking-wider font-mono">Select Option</label>
                        {activePracticeQuestion.options?.map((option: string, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => setPracticeAnswer(option)}
                            className={`w-full p-3.5 text-left rounded-xl border text-xs font-mono transition-all ${
                              practiceAnswer === option
                                ? 'border-indigo-500 bg-indigo-500/10 text-white font-bold'
                                : 'border-border bg-white/[0.01] hover:bg-white/5 text-gray-300'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={submitPracticeAnswer}
                      disabled={practiceAnswerSubmitting || !practiceAnswer.trim()}
                      className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold rounded-xl active:scale-98 disabled:opacity-40 transition-all uppercase tracking-wider font-mono"
                    >
                      {practiceAnswerSubmitting ? 'Evaluating...' : 'Submit Answer 🚀'}
                    </button>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5"
                  >
                    <div className={`p-4 rounded-xl border text-center ${
                      practiceResult.correct
                        ? 'bg-green-500/10 border-green-500/30 text-green-400'
                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}>
                      <span className="text-3xl block mb-1">
                        {practiceResult.correct ? '🎉' : '❌'}
                      </span>
                      <span className="font-black text-xs uppercase tracking-wider font-mono">
                        {practiceResult.correct ? 'Correct Answer' : 'Incorrect Answer'}
                      </span>
                    </div>

                    {practiceResult.misconception_detected && (
                      <div className="bg-amber-500/10 border border-amber-500/35 p-4 rounded-xl">
                        <span className="font-bold text-amber-400 text-xs font-mono uppercase block mb-1">⚠️ Misconception Detected</span>
                        <p className="text-[10px] text-gray-300 font-mono">{practiceResult.misconception_detected}</p>
                      </div>
                    )}

                    <div className="bg-white/[0.02] border border-border rounded-xl p-4 space-y-2">
                      <span className="font-bold text-indigo-400 text-[9px] font-mono uppercase block">Tutor Explanation & Hint</span>
                      <p className="text-[10px] text-gray-300 leading-relaxed font-mono">
                        {practiceResult.feedback}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/[0.01] border border-border rounded-xl p-3 text-center">
                        <span className="text-[8px] text-gray-500 uppercase tracking-wider font-mono block">ELO Rating</span>
                        <span className="text-xs font-bold text-white block mt-1 font-mono">
                          {practiceResult.new_elo} ELO
                        </span>
                        <span className={`text-[9px] font-mono ${practiceResult.elo_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {practiceResult.elo_change >= 0 ? `+${practiceResult.elo_change}` : practiceResult.elo_change} ELO
                        </span>
                      </div>
                      <div className="bg-white/[0.01] border border-border rounded-xl p-3 text-center">
                        <span className="text-[8px] text-gray-500 uppercase tracking-wider font-mono block">Concept Mastery</span>
                        <span className="text-xs font-bold text-white block mt-1 font-mono">
                          {practiceResult.p_known !== undefined ? `${Math.round(practiceResult.p_known * 100)}%` : '?%'}
                        </span>
                        <span className="text-[8px] text-gray-500 font-mono block">
                          Updated in graph
                        </span>
                      </div>
                    </div>

                    {practiceResult.triggered_micro_lesson && (
                      <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl space-y-1">
                        <span className="font-bold text-blue-400 text-xs font-mono uppercase block">📖 Micro-Lesson Study</span>
                        <p className="text-[9px] text-gray-300 font-mono leading-relaxed">
                          {practiceResult.triggered_micro_lesson}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3 mt-4 pt-3 border-t border-border">
                      <button
                        onClick={() => { setPracticeResult(null); setPracticeAnswer(''); }}
                        className="flex-1 py-2 border border-border text-gray-400 hover:text-white rounded-xl text-xs font-bold uppercase transition-all font-mono"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={() => startPractice(activePracticeQuestion.topic)}
                        className="flex-1 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-xs font-bold uppercase transition-all font-mono"
                      >
                        Next Question →
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
