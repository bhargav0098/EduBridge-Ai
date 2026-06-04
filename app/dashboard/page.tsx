'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/ui/Sidebar';
import { Navbar } from '@/components/ui/Navbar';
import { Card } from '@/components/ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import Link from 'next/link';
import { motion } from 'framer-motion';

const progressData = [
  { name: 'Mon', score: 75 },
  { name: 'Tue', score: 82 },
  { name: 'Wed', score: 88 },
  { name: 'Thu', score: 85 },
  { name: 'Fri', score: 92 },
  { name: 'Sat', score: 89 },
  { name: 'Sun', score: 95 },
];

const subjectData = [
  { name: 'Math', value: 85 },
  { name: 'Science', value: 78 },
  { name: 'English', value: 88 },
  { name: 'History', value: 82 },
];

export default function DashboardPage() {
  const [stats] = useState({
    attendance: '92%',
    quizScore: '88/100',
    learningStreak: '7 days',
    nextEvent: 'June 5, 2pm',
  });

  const upcomingEvents = [
    { id: 1, title: 'Physics Quiz', time: 'Today at 2:00 PM', status: 'upcoming' },
    { id: 2, title: 'Chemistry Lab', time: 'Tomorrow at 10:00 AM', status: 'upcoming' },
    { id: 3, title: 'English Essay', time: 'June 6 at 4:00 PM', status: 'upcoming' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-auto p-6 md:p-8">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold dark:text-white">Welcome Back, Student! 👋</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Here's your learning progress today</p>
            </div>

            {/* Stats Cards */}
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={itemVariants}>
                <Card title="Attendance" value={stats.attendance} icon="📚" />
              </motion.div>
              <motion.div variants={itemVariants}>
                <Card title="Quiz Score" value={stats.quizScore} icon="⭐" />
              </motion.div>
              <motion.div variants={itemVariants}>
                <Card title="Learning Streak" value={stats.learningStreak} icon="🔥" />
              </motion.div>
              <motion.div variants={itemVariants}>
                <Card title="Next Event" value={stats.nextEvent} icon="📅" />
              </motion.div>
            </motion.div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Progress Chart */}
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-xl font-bold mb-4 dark:text-white">Weekly Progress</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={progressData}>
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
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Subject Performance */}
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-xl font-bold mb-4 dark:text-white">Subject Performance</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={subjectData}>
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
                    <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            </div>

            {/* Quick Actions & Upcoming Events */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <motion.div
                className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <h2 className="text-xl font-bold mb-4 dark:text-white">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Link
                    href="/chat"
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-all transform hover:scale-105 text-center"
                  >
                    💬 Ask AI Tutor
                  </Link>
                  <Link
                    href="/quiz"
                    className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-3 rounded-lg font-medium transition-all transform hover:scale-105 text-center"
                  >
                    📝 Take Quiz
                  </Link>
                  <Link
                    href="/admin"
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-3 rounded-lg font-medium transition-all transform hover:scale-105 text-center"
                  >
                    ⚙️ Resources
                  </Link>
                </div>
              </motion.div>

              {/* Upcoming Events */}
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <h2 className="text-xl font-bold mb-4 dark:text-white">Upcoming Events</h2>
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="border-l-4 border-blue-500 bg-blue-50 dark:bg-gray-700 p-3 rounded"
                    >
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{event.title}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{event.time}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
