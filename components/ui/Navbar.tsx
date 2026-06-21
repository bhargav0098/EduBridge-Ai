'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isTeacher = user?.role === 'teacher';
  const initials   = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <nav className="navbar-premium sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Left */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold dark:text-white">EduBridge AI</h1>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
            isTeacher
              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
          }`}>
            {isTeacher ? 'Teacher Dashboard' : 'Student Dashboard'}
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.08] transition-all flex items-center justify-center border border-gray-200 dark:border-white/10"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* User info */}
          {user && (
            <Link href="/profile" className="flex items-center gap-2 hover:opacity-85 transition-opacity">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-white leading-tight">{user.name}</p>
                <p className={`text-[10px] font-medium ${isTeacher ? 'text-purple-400' : 'text-indigo-400'}`}>
                  {isTeacher ? 'Teacher' : 'Student'}
                </p>
              </div>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-md cursor-pointer status-online bg-gradient-to-br ${
                isTeacher ? 'from-purple-500 to-indigo-600' : 'from-indigo-500 to-purple-600'
              }`}>
                {initials}
              </div>
            </Link>
          )}

          {!user && (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md cursor-pointer status-online">
              U
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
