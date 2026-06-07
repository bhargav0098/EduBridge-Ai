'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/ui/Sidebar';
import { Navbar } from '@/components/ui/Navbar';
import { motion } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import { Skeleton } from '@/components/ui/Skeleton';

interface StudentMatch {
  id: string;
  name: string;
  avatar: string;
  compatibilityScore: number;
  weakSubjects: string[];
  bio: string;
}

const MATCHED_STUDENTS: StudentMatch[] = [
  {
    id: 'match-1',
    name: 'Aria Sharma',
    avatar: 'AS',
    compatibilityScore: 94,
    weakSubjects: ['Mathematics', 'Physics'],
    bio: 'Looking for partners to crack Calculus III and quantum physics equations. Let\'s solve together!'
  },
  {
    id: 'match-2',
    name: 'Rohan Das',
    avatar: 'RD',
    compatibilityScore: 88,
    weakSubjects: ['Computer Science', 'Chemistry'],
    bio: 'Struggling with graphs algorithms and organic chemistry reactions. Great at English and history!'
  },
  {
    id: 'match-3',
    name: 'Priya Singh',
    avatar: 'PS',
    compatibilityScore: 82,
    weakSubjects: ['Physics', 'Chemistry'],
    bio: 'Aims to master electromagnetic fields and molecular structures. Available on weekday evenings.'
  }
];

export default function PeerMatchingPage() {
  const router = useRouter();
  const [matchingState, setMatchingState] = useState<'idle' | 'loading' | 'results'>('idle');
  const [selectedPeers, setSelectedPeers] = useState<string[]>(['match-1', 'match-2', 'match-3']); // default all selected

  const handleStartMatching = () => {
    setMatchingState('loading');
    setTimeout(() => {
      setMatchingState('results');
      toast.success('Found 3 highly compatible study partners!');
    }, 2000);
  };

  const handleToggleSelect = (id: string) => {
    if (selectedPeers.includes(id)) {
      setSelectedPeers(selectedPeers.filter(p => p !== id));
    } else {
      setSelectedPeers([...selectedPeers, id]);
    }
  };

  const handleCreateGroup = () => {
    if (selectedPeers.length === 0) {
      toast.error('Please select at least one study partner to form a group.');
      return;
    }
    
    toast.success('Creating study group...');
    // Store selected matched students to pass to group page
    const selectedStudents = MATCHED_STUDENTS.filter(s => selectedPeers.includes(s.id));
    if (typeof window !== 'undefined') {
      localStorage.setItem('temp_group_members', JSON.stringify(selectedStudents));
    }
    
    setTimeout(() => {
      router.push('/peers/group');
    }, 1200);
  };

  return (
    <div className="flex h-screen bg-background text-text-primary tech-grid">
      <Toaster position="top-right" />
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />

        <main className="flex-1 overflow-auto p-6 md:p-8 flex flex-col">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white">AI Peer <span className="gradient-text">Matcher</span> 👥</h1>
            <p className="text-xs text-primary-light/50 mt-1">Connect with compatible classmates to form collaborative study groups.</p>
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full">
            {/* IDLE STATE: Empty State illustration + button */}
            {matchingState === 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface border border-border rounded-2xl p-10 text-center shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-sm"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-indigo-500/[0.04] rounded-full blur-[90px] pointer-events-none" />
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl flex items-center justify-center text-4xl mx-auto shadow-lg animate-pulse-glow">
                  🤝
                </div>

                <div className="space-y-3 max-w-lg mx-auto">
                  <h2 className="text-2xl font-black text-white">Find Your Ideal Study Partners</h2>
                  <p className="text-text-secondary/50 text-xs leading-relaxed">
                    Our AI matchmaking model analyzes your subject grades, weak chapters, and availability to find peers who can complement your learning journey and help you study better.
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleStartMatching}
                    className="btn-primary py-3 px-8 text-sm uppercase tracking-wider font-bold"
                  >
                    🚀 Find Study Partners
                  </button>
                </div>
              </motion.div>
            )}

            {/* LOADING STATE: Charu's shared Skeleton loader */}
            {matchingState === 'loading' && (
              <div className="space-y-6">
                <div className="text-center space-y-2 mb-4">
                  <div className="animate-spin text-3xl inline-block text-indigo-400">🔄</div>
                  <h3 className="font-bold text-white text-lg">AI Matchmaker Analyzing Profiles...</h3>
                  <p className="text-xs text-primary-light/40">Comparing study habits, schedules, and topic proficiencies</p>
                </div>

                {/* Grid of 3 Skeleton Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-4">
                      {/* Header skeleton */}
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-12 h-12 rounded-full !bg-surface" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="w-24 h-4 !bg-surface" />
                          <Skeleton className="w-16 h-3 !bg-surface" />
                        </div>
                      </div>
                      
                      {/* Compatibility bar skeleton */}
                      <div className="space-y-1.5 pt-2">
                        <Skeleton className="w-full h-2 rounded !bg-surface" />
                        <Skeleton className="w-2/3 h-3 !bg-surface" />
                      </div>

                      {/* Chip tags skeletons */}
                      <div className="flex gap-2 pt-2">
                        <Skeleton className="w-16 h-5 rounded-full !bg-surface" />
                        <Skeleton className="w-16 h-5 rounded-full !bg-surface" />
                      </div>

                      {/* Description skeleton */}
                      <div className="space-y-2 pt-2">
                        <Skeleton className="w-full h-3 !bg-surface" />
                        <Skeleton className="w-full h-3 !bg-surface" />
                        <Skeleton className="w-3/4 h-3 !bg-surface" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RESULTS STATE: Match Cards */}
            {matchingState === 'results' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-white">AI Study Partner Matches</h3>
                    <p className="text-xs text-primary-light/40">Select classmates to form a new study group.</p>
                  </div>

                  <button
                    onClick={handleCreateGroup}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-md transition-all text-xs tracking-wider uppercase"
                  >
                    🤝 Create Study Group ({selectedPeers.length})
                  </button>
                </div>

                {/* Grid of matched student cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {MATCHED_STUDENTS.map(student => {
                    const isSelected = selectedPeers.includes(student.id);
                    return (
                      <div
                        key={student.id}
                        onClick={() => handleToggleSelect(student.id)}
                        className={`tech-card p-5 cursor-pointer relative flex flex-col justify-between select-none transition-all ${
                          isSelected
                            ? '!border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-500/5'
                            : ''
                        }`}
                      >
                        {/* Selector check indicator */}
                        <div className="absolute top-4 right-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="w-4 h-4 rounded text-indigo-600 border-white/20 bg-surface focus:ring-indigo-500"
                          />
                        </div>

                        <div className="space-y-4">
                          {/* Profile Header */}
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow">
                              {student.avatar}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-white">{student.name}</h4>
                              <span className="text-[9px] text-primary-light/40 font-mono tracking-wider uppercase">STUDENT</span>
                            </div>
                          </div>

                          {/* Compatibility Score Bar */}
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between text-xs font-semibold text-text-secondary/80">
                              <span>Match score:</span>
                              <span className="text-indigo-400 font-bold">{student.compatibilityScore}%</span>
                            </div>
                            <div className="w-full bg-surface border border-border-subtle h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${student.compatibilityScore}%` }}
                              />
                            </div>
                          </div>

                          {/* Shared weak subjects */}
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[9px] text-primary-light/40 font-mono uppercase block">Shared Weak Subjects:</span>
                            <div className="flex flex-wrap gap-1">
                              {student.weakSubjects.map(sub => (
                                <span
                                  key={sub}
                                  className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/15"
                                >
                                  {sub}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Bio */}
                          <p className="text-xs text-text-secondary/50 leading-relaxed italic">
                            &ldquo;{student.bio}&rdquo;
                          </p>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
