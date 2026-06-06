'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useScroll } from 'framer-motion';
import { useTheme } from 'next-themes';

function StatCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = Math.ceil(target / 125);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return <span>{count}{suffix}</span>;
}

const features = [
  { icon: '💬', title: 'AI Tutor', desc: 'Instantly resolve learning doubts, translate lecture materials, and generate markdown explanations in real-time.' },
  { icon: '📈', title: 'Adaptive Learning', desc: 'Personalized testing tracks your progress and increases quiz complexity as your scores hit targets.' },
  { icon: '👥', title: 'Peer Matching', desc: 'Connect and form study circles with peers who have complementary strengths to foster collaborative growth.' },
  { icon: '🏫', title: 'College Tools', desc: 'Book lab equipment, request library textbooks, and monitor attendance metrics all in one workspace.' },
];

const problems = [
  { icon: '🚨', title: 'Teacher Shortages', desc: 'Overcrowded classes mean teachers cannot offer tailored guidance, leaving weaker students falling behind.', color: 'red' },
  { icon: '🗣️', title: 'Language Barriers', desc: 'Core scientific terminology and lecture notes are rarely available in regional languages.', color: 'orange' },
  { icon: '📉', title: 'High Dropout Rates', desc: 'Students dropping below academic limits lack structured study circles and tracking alerts.', color: 'amber' },
  { icon: '📝', title: 'Rigid Exam Prep', desc: 'Standardized test prep causes anxiety instead of adapting questions to fill conceptual gaps.', color: 'rose' },
];

const steps = [
  { num: 1, title: 'Ask Doubts', desc: 'Type questions, speak voice inputs, or drop lecture PDF notes directly into the AI assistant.' },
  { num: 2, title: 'AI Retrieves', desc: 'Our model queries vectors, reviews your weakness log, and pulls academic contexts.' },
  { num: 3, title: 'Personalized Answer', desc: 'Receive interactive formulas, diagrams, and targeted review quizzes to verify understanding.' },
];

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="min-h-screen bg-background text-text-muted overflow-x-hidden">
      {/* Scroll Progress */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3px] z-50 origin-left"
        style={{ scaleX: scrollYProgress, background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)' }}
      />

      {/* Navbar */}
      <header className="sticky top-0 z-40 navbar-premium">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
              <span className="text-lg">🎓</span>
            </div>
            <span className="text-xl font-extrabold gradient-text">EduBridge AI</span>
          </Link>
          <div className="flex gap-3 items-center">
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-gray-700 dark:text-gray-300 transition-colors border border-gray-200/50 dark:border-white/[0.06] flex items-center justify-center"
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
            )}
            <Link href="/login" className="text-sm font-semibold text-text-secondary hover:text-primary px-4 py-2 transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="btn-primary text-sm !px-5 !py-2.5 !rounded-xl">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-28 lg:pt-32 lg:pb-40 tech-grid">
        {/* Ambient glows */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/[0.06] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-500/[0.05] rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <motion.span initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              AI-Powered Learning Platform
            </motion.span>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-text-primary">
              Bridging the{' '}
              <span className="gradient-text">Education Gap</span>
              {' '}with AI
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="text-lg text-text-muted max-w-xl mx-auto lg:mx-0 leading-relaxed">
              An inclusive, AI-powered learning companion providing personalized guidance, peer collaboration matching, and automated resource booking.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-4 justify-center lg:justify-start pt-4">
              <Link href="/dashboard" className="btn-primary flex items-center gap-2 !text-base">
                <span>💻</span> Try Demo View
              </Link>
              <a href="#problems" className="btn-ghost flex items-center gap-2">
                Learn More <span>↓</span>
              </a>
            </motion.div>
          </div>

          {/* Hero visual */}
          <div className="lg:col-span-5 flex justify-center">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }} className="w-full max-w-md relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl opacity-50 dark:opacity-30 -z-10" />
              <svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-xl">
                <rect x="50" y="80" width="400" height="340" rx="24" fill="#1e1b4b" fillOpacity="0.95" />
                <rect x="50" y="80" width="400" height="340" rx="24" stroke="#4f46e5" strokeWidth="2" strokeOpacity="0.4" />
                <circle cx="250" cy="180" r="50" fill="#4f46e5" />
                <path d="M250 155c-13.8 0-25 11.2-25 25 0 13.8 11.2 25 25 25s25-11.2 25-25c0-13.8-11.2-25-25-25zm0 10c8.3 0 15 6.7 15 15s-6.7 15-15 15-15-6.7-15-15 6.7-15 15-15z" fill="#a5b4fc" />
                <circle cx="250" cy="180" r="5" fill="#34d399" className="animate-ping" />
                <circle cx="120" cy="300" r="35" fill="#312e81" stroke="#818cf8" strokeWidth="2" />
                <text x="120" y="305" fill="#e0e7ff" fontSize="12" fontWeight="bold" textAnchor="middle">Student A</text>
                <circle cx="380" cy="300" r="35" fill="#312e81" stroke="#818cf8" strokeWidth="2" />
                <text x="380" y="305" fill="#e0e7ff" fontSize="12" fontWeight="bold" textAnchor="middle">Student B</text>
                <line x1="150" y1="280" x2="210" y2="210" stroke="#818cf8" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="350" y1="280" x2="290" y2="210" stroke="#818cf8" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="155" y1="300" x2="345" y2="300" stroke="#10b981" strokeWidth="2" />
                <rect x="200" y="320" width="100" height="24" rx="12" fill="#10b981" />
                <text x="250" y="336" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle">Peer Matched</text>
              </svg>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative overflow-hidden py-14" style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)' }}>
        <div className="absolute inset-0 opacity-10 tech-grid" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { target: 30, suffix: '–50%', label: 'Learning Improvement' },
              { target: 1000, suffix: '+', label: 'Active Students' },
              { target: 3, suffix: ' Languages', label: 'Localization Support' },
              { target: 24, suffix: 'h MVP', label: 'Platform Build Cycle' },
            ].map((s, i) => (
              <div key={i} className="space-y-1">
                <div className="text-3xl sm:text-4xl font-black text-white">
                  <StatCounter target={s.target} suffix={s.suffix} />
                </div>
                <p className="text-xs sm:text-sm text-primary-light/70 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problems */}
      <section id="problems" className="py-20 tech-grid">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-red-500 uppercase tracking-widest">The Challenge</span>
            <h2 className="text-3xl sm:text-4xl font-black text-text-primary">Why Educational Equity is Failing</h2>
            <p className="text-text-muted max-w-xl mx-auto text-sm">Underserved students face deep academic and structural hurdles that conventional systems neglect.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {problems.map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="tech-card p-6 space-y-4">
                <span className="text-3xl block">{p.icon}</span>
                <h3 className="font-bold text-lg text-text-primary">{p.title}</h3>
                <p className="text-xs text-text-muted leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/[0.04] rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 space-y-12 relative z-10">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Core Capabilities</span>
            <h2 className="text-3xl sm:text-4xl font-black text-text-primary">EduBridge AI Learning System</h2>
            <p className="text-text-muted max-w-xl mx-auto text-sm">Advanced AI that automates personalized learning and administrative tasks.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="tech-card p-6 space-y-4 group">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="font-bold text-lg text-text-primary">{f.title}</h3>
                <p className="text-xs text-text-muted leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 tech-grid">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 tracking-widest uppercase">Flow Overview</span>
            <h2 className="text-3xl sm:text-4xl font-black text-text-primary">How It Works</h2>
            <p className="text-text-muted max-w-xl mx-auto text-sm">Three simple steps to unlock a smarter, personalized study session.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {steps.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-2xl font-black text-white shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  {s.num}
                </div>
                <h3 className="font-bold text-lg text-text-primary">{s.title}</h3>
                <p className="text-xs text-text-muted leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6 space-y-10">
          <div className="text-center">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 tracking-widest uppercase block mb-2">Real Impact</span>
            <h2 className="text-3xl font-black text-text-primary">Student Testimonials</h2>
          </div>
          <div className="tech-card p-8 md:p-12 space-y-6 relative overflow-hidden">
            <span className="absolute top-6 left-6 text-6xl text-text-secondary/20 font-serif select-none">"</span>
            <p className="text-base sm:text-lg md:text-xl text-text-primary italic leading-relaxed relative z-10 font-light">
              EduBridge AI changed the way I prepare for exams. I went from struggling with Calculus matrices and Physics wave equations to helping my classmates organize peer study circles. The localized translation makes study sheets instantly click.
            </p>
            <div className="flex items-center gap-4 border-t border-border pt-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}>RD</div>
              <div>
                <div className="text-sm font-bold text-text-primary">Rohan Das</div>
                <div className="text-xs text-text-muted">Undergraduate Engineering Student</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-gray-50 dark:bg-transparent" style={{ background: undefined }}>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="space-y-4">
            <span className="text-lg font-extrabold gradient-text">EduBridge AI</span>
            <p className="text-xs text-text-muted leading-relaxed">Personalized learning portals leveling academic progression for every student.</p>
          </div>
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-text-disabled">Resources</span>
            <div className="flex flex-col gap-2 text-xs text-text-muted">
              <Link href="/dashboard" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Platform Dashboard</Link>
              <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-indigo-600 dark:hover:text-white transition-colors">GitHub Repository</a>
              <a href="mailto:contact@edubridge.ai" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Contact Support</a>
            </div>
          </div>
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-text-disabled">Platform Developer</span>
            <div className="text-xs text-text-muted space-y-1">
              <div>Created by Team: <strong className="text-text-primary">Achievers</strong></div>
              <div>License: MIT Open Source</div>
              <div>Contact: <a href="mailto:support@edubridge.ai" className="underline hover:text-indigo-600 dark:hover:text-white">support@edubridge.ai</a></div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 border-t border-gray-200 dark:border-gray-800 mt-8 pt-6 text-center text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} EduBridge AI. Open-source under Team Achievers.</p>
        </div>
      </footer>
    </main>
  );
}
