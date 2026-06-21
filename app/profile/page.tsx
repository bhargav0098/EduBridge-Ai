'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Sidebar } from '@/components/ui/Sidebar';
import { Navbar } from '@/components/ui/Navbar';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { toast, Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-background text-text-primary tech-grid justify-center items-center">
        <div className="text-lg font-bold">Loading Profile Settings...</div>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const { user, token, updateUser } = useAuthStore();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  // Form states
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');

  // Role specific states
  const [className, setClassName] = useState('');
  const [studyTimePreference, setStudyTimePreference] = useState('');
  const [weakSubjects, setWeakSubjects] = useState('');

  const [subject, setSubject] = useState('');
  const [experience, setExperience] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prepopulate form when user details are loaded
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setGender(user.gender || 'Prefer not to say');
      setPhone(user.phone || '');
      setBio(user.bio || '');

      if (user.role === 'student') {
        setClassName(user.className || 'CS-3A');
        setStudyTimePreference(user.studyTimePreference || 'Morning');
        setWeakSubjects(user.weakSubjects || '');
      } else if (user.role === 'teacher') {
        setSubject(user.subject || '');
        setExperience(user.experience || '');
      }
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Name is required.');
      return;
    }

    setIsSubmitting(true);

    const payload: any = {
      name,
      gender,
      phone,
      bio,
    };

    if (user?.role === 'student') {
      payload.className = className;
      payload.studyTimePreference = studyTimePreference;
      payload.weakSubjects = weakSubjects;
    } else if (user?.role === 'teacher') {
      payload.subject = subject;
      payload.experience = experience;
    }

    try {
      // 1. Submit update to server
      const response = await fetch('/api/me', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile settings.');
      }

      // 2. Sync local Zustand store
      updateUser(payload);
      toast.success('Profile settings updated successfully!');
      
      // Delay navigation slightly to let user read toast
      setTimeout(() => {
        router.push('/dashboard');
      }, 800);
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while updating profile.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isTeacher = user?.role === 'teacher';

  return (
    <div className="flex h-screen bg-background text-text-primary tech-grid">
      <Toaster position="top-right" />
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />

        <main className="flex-1 overflow-auto p-6 md:p-8">
          <motion.div 
            initial={{ opacity: 0, y: 12 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="max-w-3xl mx-auto"
          >
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold text-white bg-gradient-to-r from-indigo-200 to-white bg-clip-text text-transparent flex items-center gap-3">
                <span>👤</span> Profile Settings
              </h1>
              <p className="text-gray-600 dark:text-text-muted mt-1.5 text-sm">
                Manage your personal details, credentials, and classroom preferences.
              </p>
            </div>

            {/* Profile Card */}
            <div className="bg-surface border border-border rounded-2xl shadow-xl p-6 backdrop-blur-sm relative overflow-hidden text-white">
              {/* Decorative background glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[40px] pointer-events-none" />

              <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                <div className="border-b border-border/40 pb-5 mb-5">
                  <h2 className="text-base font-bold text-indigo-400 font-mono tracking-wider uppercase">General Details</h2>
                  <p className="text-[11px] text-text-muted mt-1">Information visible to other classroom members.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Name field */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] text-text-secondary uppercase font-mono font-bold tracking-wider">Full Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
                      required
                    />
                  </div>

                  {/* Email address (readonly) */}
                  <div className="space-y-1.5 opacity-65">
                    <label className="block text-[11px] text-text-secondary uppercase font-mono font-bold tracking-wider">Email Address</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      className="w-full bg-surface-2/65 border border-border/40 rounded-xl px-4 py-3 text-sm text-gray-400 outline-none cursor-not-allowed"
                      disabled
                    />
                  </div>

                  {/* Gender Select dropdown */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] text-text-secondary uppercase font-mono font-bold tracking-wider">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  {/* Phone number */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] text-text-secondary uppercase font-mono font-bold tracking-wider">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +1 (555) 019-2834"
                      className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Biography */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] text-text-secondary uppercase font-mono font-bold tracking-wider">Biography / Description</label>
                  <textarea
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us a little bit about yourself, interests, or teaching goals..."
                    className="w-full bg-surface-2 border border-border rounded-xl p-4 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Student specific fields */}
                {!isTeacher && (
                  <div className="space-y-5 pt-4">
                    <div className="border-b border-border/40 pb-5 mb-5 pt-2">
                      <h2 className="text-base font-bold text-indigo-400 font-mono tracking-wider uppercase">Academic Preferences</h2>
                      <p className="text-[11px] text-text-muted mt-1">Configure your classroom attendance group and study topics.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] text-text-secondary uppercase font-mono font-bold tracking-wider">Class Enrollment</label>
                        <select
                          value={className}
                          onChange={(e) => setClassName(e.target.value)}
                          className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
                        >
                          <option value="CS-3A">CS-3A (Data Structures)</option>
                          <option value="CS-3B">CS-3B (Mathematics)</option>
                          <option value="CS-4A">CS-4A (English Literature)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] text-text-secondary uppercase font-mono font-bold tracking-wider">Study Time Preference</label>
                        <select
                          value={studyTimePreference}
                          onChange={(e) => setStudyTimePreference(e.target.value)}
                          className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
                        >
                          <option value="Morning">Morning Preference</option>
                          <option value="Afternoon">Afternoon Preference</option>
                          <option value="Evening">Evening Preference</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] text-text-secondary uppercase font-mono font-bold tracking-wider">Weak Subjects / Topics</label>
                      <input
                        type="text"
                        value={weakSubjects}
                        onChange={(e) => setWeakSubjects(e.target.value)}
                        placeholder="e.g. Calculus, Graphs, Organic Chemistry"
                        className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
                      />
                      <p className="text-[10px] text-text-muted mt-1 font-mono">Use comma-separated values to list topics you want customized help in.</p>
                    </div>
                  </div>
                )}

                {/* Teacher specific fields */}
                {isTeacher && (
                  <div className="space-y-5 pt-4">
                    <div className="border-b border-border/40 pb-5 mb-5 pt-2">
                      <h2 className="text-base font-bold text-purple-400 font-mono tracking-wider uppercase">Professional Credentials</h2>
                      <p className="text-[11px] text-text-muted mt-1">Configure your department details and teaching summary.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] text-text-secondary uppercase font-mono font-bold tracking-wider">Subject Specialty Area</label>
                        <input
                          type="text"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="e.g. Data Structures, Calculus"
                          className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-purple-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] text-text-secondary uppercase font-mono font-bold tracking-wider">Years of Experience</label>
                        <input
                          type="text"
                          value={experience}
                          onChange={(e) => setExperience(e.target.value)}
                          placeholder="e.g. 5+ Years"
                          className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-purple-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Buttons */}
                <div className="flex gap-4 pt-5 border-t border-border/40 justify-end">
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-gray-300 transition-all uppercase tracking-wider active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-8 py-3 rounded-xl text-xs font-bold text-white uppercase tracking-wider transition-all shadow-lg active:scale-95 border border-white/10 ${
                      isTeacher 
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 shadow-purple-500/20' 
                        : 'bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 shadow-indigo-500/20'
                    }`}
                  >
                    {isSubmitting ? 'Saving Changes...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
