'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/ui/Sidebar';
import { Navbar } from '@/components/ui/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import api from '@/services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface Question {
  id: number;
  subject: string;
  topic: string;
  question_text: string;
  difficulty: number;
  type: string;
  options: string[] | null;
  answer: string;
  explanation: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'users' | 'quiz' | 'content'>('users');
  
  // User states
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('student');

  // Quiz states
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizLoading, setQuizLoading] = useState(true);
  const [searchSubject, setSearchSubject] = useState('All');
  const [searchTopic, setSearchTopic] = useState('');
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  
  // Form states for new question
  const [qSubject, setQSubject] = useState('physics');
  const [qTopic, setQTopic] = useState('');
  const [qText, setQText] = useState('');
  const [qDifficulty, setQDifficulty] = useState(1);
  const [qType, setQType] = useState('MCQ');
  const [qOptions, setQOptions] = useState('');
  const [qAnswer, setQAnswer] = useState('');
  const [qExplanation, setQExplanation] = useState('');

  // JSON batch upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Content manager states
  const [materials, setMaterials] = useState<any[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);

  // Fetch Users
  const fetchUsers = async (): Promise<void> => {
    try {
      setUsersLoading(true);
      const res = await api.get('/admin/users');
      setUsers(res.data || []);
    } catch {
      toast.error('Failed to fetch users');
    } finally {
      setUsersLoading(false);
    }
  };

  // Fetch Quiz Questions
  const fetchQuestions = async (): Promise<void> => {
    try {
      setQuizLoading(true);
      const params: any = {};
      if (searchSubject !== 'All') params.subject = searchSubject;
      if (searchTopic.trim()) params.topic = searchTopic;
      
      const res = await api.get('/admin/questions', { params });
      setQuestions(res.data?.questions || []);
    } catch {
      toast.error('Failed to fetch questions');
    } finally {
      setQuizLoading(false);
    }
  };

  // Fetch Uploaded Materials
  const fetchMaterials = async (): Promise<void> => {
    try {
      setMaterialsLoading(true);
      const res = await api.get('/classes/material');
      setMaterials(res.data || []);
    } catch {
      toast.error('Failed to fetch course materials');
    } finally {
      setMaterialsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchQuestions();
    fetchMaterials();
  }, []);

  // Delete User
  const handleDeleteUser = async (userId: string): Promise<void> => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(users.filter((u) => u.id !== userId));
      toast.success('User deleted successfully');
    } catch {
      toast.error('Failed to delete user');
    }
  };

  // Create User
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail || !newUserPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    try {
      const payload = {
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole.toUpperCase(),
      };
      await api.post('/auth/register', payload);
      toast.success('User created successfully');
      setShowCreateUser(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create user');
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (qId: number): Promise<void> => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await api.delete(`/admin/questions/${qId}`);
      setQuestions(questions.filter((q) => q.id !== qId));
      toast.success('Question deleted successfully');
    } catch {
      toast.error('Failed to delete question');
    }
  };

  // Add Question
  const handleAddQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qTopic || !qText || !qAnswer) {
      toast.error('Please fill in required fields');
      return;
    }

    const optionsArray = qType === 'MCQ' 
      ? qOptions.split(',').map(o => o.trim()).filter(Boolean)
      : null;

    try {
      const payload = {
        subject: qSubject,
        topic: qTopic,
        question_text: qText,
        difficulty: Number(qDifficulty),
        type: qType,
        options: optionsArray,
        answer: qAnswer,
        explanation: qExplanation
      };
      await api.post('/admin/questions', payload);
      toast.success('Question added successfully');
      setShowAddQuestion(false);
      setQTopic('');
      setQText('');
      setQOptions('');
      setQAnswer('');
      setQExplanation('');
      fetchQuestions();
    } catch {
      toast.error('Failed to add question');
    }
  };

  // Batch Upload JSON
  const handleJsonUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a JSON file first');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await api.post('/admin/questions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`Successfully uploaded ${res.data.count} questions!`);
      setSelectedFile(null);
      fetchQuestions();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to upload JSON file');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background text-text-primary tech-grid">
      <Toaster position="top-right" />
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />

        {/* Tab Header */}
        <div className="bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-b border-border px-6 py-3.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary/60 dark:text-primary-light/60 font-mono">System Status:</span>
            <div className="px-3 py-1 rounded bg-green-500/10 text-green-400 text-xs font-bold font-mono">
              ● Active Console
            </div>
          </div>
          <div className="flex gap-2">
            {[
              { id: 'users', label: '👥 User Roster' },
              { id: 'quiz', label: '📝 Quiz Manager' },
              { id: 'content', label: '📂 Course Content' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                aria-label={`Switch to ${tab.label} tab`}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary dark:text-primary-light border border-indigo-500/35 shadow-sm'
                    : 'bg-transparent text-text-secondary/40 hover:text-text-secondary/70 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 overflow-auto p-6 md:p-8">
          <AnimatePresence mode="wait">
            {/* USER TAB */}
            {activeTab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-3xl font-black text-white">User <span className="gradient-text">Roster</span> 👥</h1>
                    <p className="text-xs text-primary-light/50 mt-1">Manage and assign roles for university students and teachers.</p>
                  </div>
                  <button
                    onClick={() => setShowCreateUser(!showCreateUser)}
                    aria-label="Toggle create user form"
                    className="btn-primary text-xs font-bold uppercase tracking-wider px-5 py-2.5"
                  >
                    {showCreateUser ? 'Cancel' : '➕ Create User'}
                  </button>
                </div>

                {/* Create User Form */}
                {showCreateUser && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="bg-surface border border-border p-6 rounded-2xl shadow-lg"
                  >
                    <form onSubmit={handleCreateUserSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-primary-light/60 font-mono">Full Name</label>
                        <input
                          type="text"
                          required
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          placeholder="e.g. Diya Majee"
                          aria-label="Full name input"
                          className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-primary-light/60 font-mono">Email Address</label>
                        <input
                          type="email"
                          required
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          placeholder="e.g. student@edu.ai"
                          aria-label="Email input"
                          className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-primary-light/60 font-mono">Temporary Password</label>
                        <input
                          type="password"
                          required
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          placeholder="At least 6 chars"
                          aria-label="Password input"
                          className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold uppercase tracking-wider text-primary-light/60 font-mono">Role</label>
                          <select
                            value={newUserRole}
                            onChange={(e) => setNewUserRole(e.target.value)}
                            aria-label="Select role dropdown"
                            className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <button type="submit" aria-label="Confirm user creation" className="btn-primary text-xs font-bold uppercase tracking-wider w-full h-10">
                          Confirm
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* Users Table */}
                <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-lg backdrop-blur-sm">
                  {usersLoading ? (
                    <div className="p-12 text-center text-xs text-primary-light/40 font-mono">Loading users roster...</div>
                  ) : users.length === 0 ? (
                    <div className="p-12 text-center text-xs text-primary-light/40 font-mono">No users found.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-white/5 uppercase font-mono text-primary-light/50">
                            <th className="p-4 font-bold">User Name</th>
                            <th className="p-4 font-bold">Email Address</th>
                            <th className="p-4 font-bold">Assigned Role</th>
                            <th className="p-4 font-bold">Created On</th>
                            <th className="p-4 font-bold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u) => (
                            <tr key={u.id} className="border-b border-border hover:bg-white/[0.02] transition-all">
                              <td className="p-4 font-bold text-white">{u.name}</td>
                              <td className="p-4 text-gray-400 font-mono">{u.email}</td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                                  u.role === 'admin' 
                                    ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                                    : u.role === 'teacher'
                                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                }`}>
                                  {u.role.toUpperCase()}
                                </span>
                              </td>
                              <td className="p-4 text-gray-500 font-mono">
                                {u.createdAt ? u.createdAt.split('T')[0] : 'N/A'}
                              </td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  aria-label={`Delete user ${u.name}`}
                                  className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 hover:text-red-300 font-bold transition-all"
                                >
                                  Delete User
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* QUIZ TAB */}
            {activeTab === 'quiz' && (
              <motion.div
                key="quiz"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <h1 className="text-3xl font-black text-white">Quiz <span className="gradient-text">Question Bank</span> 📝</h1>
                    <p className="text-xs text-primary-light/50 mt-1">Add, update, or batch upload structured JSON STEM questions.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddQuestion(!showAddQuestion)}
                      aria-label="Toggle add question form"
                      className="btn-primary text-xs font-bold uppercase tracking-wider px-5 py-2.5"
                    >
                      {showAddQuestion ? 'Cancel' : '➕ Add Question'}
                    </button>
                  </div>
                </div>

                {/* Question Search Filters */}
                <div className="bg-surface border border-border p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
                  <div className="flex-1 w-full relative">
                    <span className="absolute left-3 top-2.5 text-primary-light/40 text-xs">🔍</span>
                    <input
                      type="text"
                      placeholder="Search questions by topic keywords..."
                      value={searchTopic}
                      onChange={(e) => setSearchTopic(e.target.value)}
                      aria-label="Search topic"
                      className="w-full bg-surface border border-border rounded-xl pl-8 pr-4 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="w-full md:w-48">
                    <select
                      value={searchSubject}
                      onChange={(e) => setSearchSubject(e.target.value)}
                      aria-label="Filter by subject"
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="All">All Subjects</option>
                      <option value="physics">Physics</option>
                      <option value="math">Mathematics</option>
                      <option value="data structures">Data Structures</option>
                      <option value="english literature">English Literature</option>
                    </select>
                  </div>
                  <button 
                    onClick={fetchQuestions}
                    aria-label="Apply search filters"
                    className="w-full md:w-auto px-5 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/35 text-indigo-300 font-bold rounded-xl text-xs uppercase"
                  >
                    Apply Filters
                  </button>
                </div>

                {/* Batch Upload Form & Single Question Add Form */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Single Question form */}
                  <div className={`lg:col-span-2 space-y-4 ${showAddQuestion ? 'block' : 'hidden'}`}>
                    <div className="bg-surface border border-border p-6 rounded-2xl shadow-lg">
                      <h3 className="font-extrabold text-sm mb-4 text-white">Create New Quiz Question</h3>
                      <form onSubmit={handleAddQuestionSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs text-primary-light/60 font-mono">Subject</label>
                            <select
                              value={qSubject}
                              onChange={(e) => setQSubject(e.target.value)}
                              aria-label="New question subject"
                              className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                            >
                              <option value="physics">Physics</option>
                              <option value="math">Mathematics</option>
                              <option value="data structures">Data Structures</option>
                              <option value="english literature">English Literature</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-primary-light/60 font-mono">Topic Name</label>
                            <input
                              type="text"
                              required
                              value={qTopic}
                              onChange={(e) => setQTopic(e.target.value)}
                              placeholder="e.g. Kinematics, AVL Trees"
                              aria-label="New question topic"
                              className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-primary-light/60 font-mono">Question Text</label>
                          <textarea
                            rows={3}
                            required
                            value={qText}
                            onChange={(e) => setQText(e.target.value)}
                            placeholder="What is the time complexity of..."
                            aria-label="New question text"
                            className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-xs text-white outline-none resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs text-primary-light/60 font-mono">Difficulty (1-5)</label>
                            <input
                              type="number"
                              min={1}
                              max={5}
                              required
                              value={qDifficulty}
                              onChange={(e) => setQDifficulty(Number(e.target.value))}
                              aria-label="New question difficulty"
                              className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-primary-light/60 font-mono">Question Type</label>
                            <select
                              value={qType}
                              onChange={(e) => setQType(e.target.value)}
                              aria-label="New question type"
                              className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                            >
                              <option value="MCQ">MCQ (Multiple Choice)</option>
                              <option value="SHORT">SHORT (Written Answer)</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-primary-light/60 font-mono">Correct Answer</label>
                            <input
                              type="text"
                              required
                              value={qAnswer}
                              onChange={(e) => setQAnswer(e.target.value)}
                              placeholder="MCQ: index (0-3) | Short: exact string"
                              aria-label="New question answer"
                              className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                            />
                          </div>
                        </div>

                        {qType === 'MCQ' && (
                          <div className="space-y-1">
                            <label className="text-xs text-primary-light/60 font-mono">MCQ Options (comma-separated, exactly 4)</label>
                            <input
                              type="text"
                              value={qOptions}
                              onChange={(e) => setQOptions(e.target.value)}
                              placeholder="Option A, Option B, Option C, Option D"
                              aria-label="New question options"
                              className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                            />
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-xs text-primary-light/60 font-mono">Explanation / Micro-lesson text</label>
                          <textarea
                            rows={2}
                            value={qExplanation}
                            onChange={(e) => setQExplanation(e.target.value)}
                            placeholder="Provide a micro-lesson explanation for wrong attempts..."
                            aria-label="New question explanation"
                            className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-xs text-white outline-none resize-none"
                          />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowAddQuestion(false)}
                            aria-label="Cancel adding question"
                            className="px-4 py-2 border border-border text-xs text-gray-400 font-bold rounded-xl"
                          >
                            Cancel
                          </button>
                          <button type="submit" aria-label="Confirm adding question" className="btn-primary text-xs font-bold uppercase tracking-wider px-6 h-9">
                            Save Question
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>

                  {/* Batch upload form */}
                  <div className="bg-surface border border-border p-6 rounded-2xl shadow-lg h-fit space-y-4">
                    <h3 className="font-extrabold text-sm text-white">Batch Upload Questions JSON</h3>
                    <p className="text-[10px] text-primary-light/40 leading-relaxed">
                      Upload a JSON file containing a list of questions to fully seed the quiz bank. 
                      This replaces existing records.
                    </p>
                    <form onSubmit={handleJsonUpload} className="space-y-4">
                      <div className="border border-dashed border-border hover:border-indigo-500/50 rounded-xl p-6 text-center cursor-pointer relative bg-white/[0.01]">
                        <input
                          type="file"
                          accept=".json"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setSelectedFile(e.target.files[0]);
                            }
                          }}
                          aria-label="Choose JSON file"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <span className="text-2xl block mb-1">📂</span>
                        <span className="text-xs text-gray-300 font-bold">
                          {selectedFile ? selectedFile.name : 'Select quiz_bank.json'}
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={isUploading || !selectedFile}
                        aria-label="Upload JSON file"
                        className="w-full py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-all"
                      >
                        {isUploading ? 'Uploading...' : 'Upload JSON'}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Questions Listing */}
                <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-lg">
                  {quizLoading ? (
                    <div className="p-12 text-center text-xs text-primary-light/40 font-mono">Loading questions...</div>
                  ) : questions.length === 0 ? (
                    <div className="p-12 text-center text-xs text-primary-light/40 font-mono">No questions match filter.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-white/5 uppercase font-mono text-primary-light/50">
                            <th className="p-4 font-bold w-24">Subject</th>
                            <th className="p-4 font-bold w-32">Topic</th>
                            <th className="p-4 font-bold">Question Text</th>
                            <th className="p-4 font-bold w-16">Diff</th>
                            <th className="p-4 font-bold w-20">Type</th>
                            <th className="p-4 font-bold text-right w-24">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {questions.map((q) => (
                            <tr key={q.id} className="border-b border-border hover:bg-white/[0.02] transition-all">
                              <td className="p-4 font-bold text-indigo-400 capitalize">{q.subject}</td>
                              <td className="p-4 text-gray-300 font-bold">{q.topic}</td>
                              <td className="p-4 text-gray-400 leading-normal line-clamp-2 max-w-sm">{q.question_text}</td>
                              <td className="p-4 font-mono font-bold text-amber-500">{q.difficulty}</td>
                              <td className="p-4 font-mono text-[10px] text-gray-400">{q.type}</td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  aria-label={`Delete question ${q.id}`}
                                  className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 hover:text-red-300 font-bold transition-all"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* CONTENT TAB */}
            {activeTab === 'content' && (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-3xl font-black text-white">Course <span className="gradient-text">Materials Feed</span> 📂</h1>
                  <p className="text-xs text-primary-light/50 mt-1">Review lecture summaries and study aids uploaded by teachers.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {materialsLoading ? (
                    <div className="col-span-full p-12 text-center text-xs text-primary-light/40 font-mono">Loading course materials...</div>
                  ) : materials.length === 0 ? (
                    <div className="col-span-full p-12 text-center text-xs text-primary-light/40 font-mono">No course materials uploaded yet.</div>
                  ) : (
                    materials.map((m) => (
                      <div key={m.id} className="bg-surface border border-border p-5 rounded-2xl flex flex-col justify-between hover:border-indigo-500/20 transition-all">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-bold font-mono px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 rounded uppercase">
                              Class {m.classId}
                            </span>
                            <span className="text-[9px] font-mono text-gray-500">{m.uploadedAt}</span>
                          </div>
                          <h3 className="font-bold text-white text-sm">{m.title}</h3>
                          <p className="text-xs text-gray-400 leading-normal line-clamp-3">
                            {m.content}
                          </p>
                        </div>
                        <div className="border-t border-border mt-4 pt-3 flex justify-between items-center text-[10px] text-gray-500 font-mono">
                          <span>Uploaded by: {m.uploadedBy}</span>
                          <span className="font-bold text-indigo-300">📄 {m.fileType || 'TXT'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
