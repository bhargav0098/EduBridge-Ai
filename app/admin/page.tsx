'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/ui/Sidebar';
import { Navbar } from '@/components/ui/Navbar';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  status: 'active' | 'inactive' | 'banned';
  joinDate: string;
  lastActive: string;
}

const usersData: User[] = [
  {
    id: 1,
    name: 'Raj Kumar',
    email: 'raj@example.com',
    role: 'student',
    status: 'active',
    joinDate: '2024-01-15',
    lastActive: '2024-06-04',
  },
  {
    id: 2,
    name: 'Priya Singh',
    email: 'priya@example.com',
    role: 'teacher',
    status: 'active',
    joinDate: '2024-02-20',
    lastActive: '2024-06-04',
  },
  {
    id: 3,
    name: 'Amit Patel',
    email: 'amit@example.com',
    role: 'student',
    status: 'inactive',
    joinDate: '2024-03-10',
    lastActive: '2024-05-28',
  },
  {
    id: 4,
    name: 'Neha Sharma',
    email: 'neha@example.com',
    role: 'student',
    status: 'active',
    joinDate: '2024-04-05',
    lastActive: '2024-06-03',
  },
  {
    id: 5,
    name: 'Vikram Das',
    email: 'vikram@example.com',
    role: 'teacher',
    status: 'banned',
    joinDate: '2024-05-01',
    lastActive: '2024-05-15',
  },
];

const analyticsData = [
  { date: 'Jun 1', users: 450, quizzes: 320, chats: 580 },
  { date: 'Jun 2', users: 480, quizzes: 350, chats: 610 },
  { date: 'Jun 3', users: 520, quizzes: 380, chats: 650 },
  { date: 'Jun 4', users: 560, quizzes: 410, chats: 720 },
];

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>(usersData);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionModal, setActionModal] = useState<{ type: string; userId: number } | null>(null);

  const handleDeleteUser = (id: number) => {
    setUsers(users.filter((user) => user.id !== id));
    setActionModal(null);
  };

  const handleBanUser = (id: number) => {
    setUsers(
      users.map((user) =>
        user.id === id ? { ...user, status: 'banned' } : user
      )
    );
    setActionModal(null);
  };

  const handleResetPassword = (id: number) => {
    alert(`Password reset link sent to ${users.find(u => u.id === id)?.email}`);
    setActionModal(null);
  };

  const stats = [
    { label: 'Total Users', value: '1,245', icon: '👥', color: 'from-blue-600 to-indigo-600' },
    { label: 'Active Users', value: '892', icon: '✅', color: 'from-emerald-500 to-teal-600' },
    { label: 'Quizzes Taken', value: '3,421', icon: '📝', color: 'from-purple-500 to-fuchsia-600' },
    { label: 'Chat Sessions', value: '5,678', icon: '💬', color: 'from-pink-500 to-rose-600' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
  };

  return (
    <div className="flex h-screen bg-background text-text-primary tech-grid">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-auto p-6 md:p-8 relative">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-black text-white">System <span className="gradient-text">Administration</span> 🛡️</h1>
              <p className="text-xs text-primary-light/50 mt-1 uppercase tracking-wider font-mono">Manage users, monitor platform activity, and view global analytics</p>
            </div>

            {/* Stats Cards */}
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {stats.map((stat, idx) => (
                <motion.div key={idx} variants={itemVariants}>
                  <div
                    className="tech-card p-6 relative overflow-hidden group"
                  >
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-[0.05] group-hover:opacity-[0.15] rounded-full blur-[40px] transition-opacity duration-500 pointer-events-none`} />
                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <p className="text-[10px] text-primary-light/60 uppercase tracking-wider font-mono">{stat.label}</p>
                        <p className="text-3xl font-black text-white mt-1 group-hover:text-indigo-400 transition-colors">{stat.value}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center text-2xl border border-border shadow-sm group-hover:scale-110 transition-transform">
                        {stat.icon}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* User Growth */}
              <motion.div
                className="bg-surface border border-border rounded-2xl p-6 backdrop-blur-sm relative"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.2 }}
              >
                <h2 className="text-xs font-bold mb-6 text-primary-light/60 uppercase tracking-wider font-mono">Platform Growth Trajectory</h2>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.9)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          color: '#fff',
                          backdropFilter: 'blur(10px)',
                          fontSize: '12px',
                          fontFamily: 'monospace'
                        }}
                        itemStyle={{ color: '#818cf8' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="users"
                        stroke="#818cf8"
                        strokeWidth={3}
                        dot={{ fill: '#818cf8', r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: '#fff', stroke: '#818cf8', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Activity Metrics */}
              <motion.div
                className="bg-surface border border-border rounded-2xl p-6 backdrop-blur-sm relative"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.2 }}
              >
                <h2 className="text-xs font-bold mb-6 text-primary-light/60 uppercase tracking-wider font-mono">Global System Activity</h2>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.9)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          color: '#fff',
                          backdropFilter: 'blur(10px)',
                          fontSize: '12px',
                          fontFamily: 'monospace'
                        }}
                      />
                      <Bar dataKey="quizzes" fill="url(#colorQuizzes)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="chats" fill="url(#colorChats)" radius={[4, 4, 0, 0]} />
                      <defs>
                        <linearGradient id="colorQuizzes" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.2}/>
                        </linearGradient>
                        <linearGradient id="colorChats" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#818cf8" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            {/* Users Table */}
            <motion.div
              className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm backdrop-blur-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.2 }}
            >
              <div className="p-5 border-b border-border flex justify-between items-center bg-black/20">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" /> Global Users Registry
                </h2>
                <span className="text-[10px] font-mono text-primary-light/40 bg-surface px-2 py-0.5 rounded-md">{users.length} registered</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface border-b border-border text-[10px] uppercase tracking-wider font-mono text-primary-light/60">
                      <th className="px-6 py-4 font-semibold">User Ident</th>
                      <th className="px-6 py-4 font-semibold">Contact Email</th>
                      <th className="px-6 py-4 font-semibold">Privilege Level</th>
                      <th className="px-6 py-4 font-semibold">Account Status</th>
                      <th className="px-6 py-4 font-semibold">Last Telemetry</th>
                      <th className="px-6 py-4 font-semibold">Administrative Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map((user) => (
                      <motion.tr
                        key={user.id}
                        className="hover:bg-white/[0.02] transition-colors"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-border flex items-center justify-center font-bold text-xs text-primary-light">
                              {user.name.charAt(0)}
                            </div>
                            <span className="text-sm font-bold text-white">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-text-secondary/50 font-mono">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                              user.role === 'student'
                                ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                : user.role === 'teacher'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border flex items-center gap-1.5 w-fit ${
                              user.status === 'active'
                                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                : user.status === 'inactive'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              user.status === 'active' ? 'bg-green-500' : user.status === 'inactive' ? 'bg-amber-500' : 'bg-red-500'
                            }`} />
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-text-secondary/50 font-mono">
                          {user.lastActive}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="w-8 h-8 rounded-lg bg-surface border border-border hover:bg-white/10 flex items-center justify-center text-xs transition-colors"
                            title="Edit User"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => setActionModal({ type: 'resetPassword', userId: user.id })}
                            className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs transition-colors"
                            title="Reset Password"
                          >
                            🔑
                          </button>
                          <button
                            onClick={() => setActionModal({ type: 'ban', userId: user.id })}
                            className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs transition-colors ${
                              user.status === 'banned'
                                ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
                                : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                            }`}
                            title={user.status === 'banned' ? 'Unban User' : 'Ban User'}
                          >
                            {user.status === 'banned' ? '🛡️' : '⚠️'}
                          </button>
                          <button
                            onClick={() => setActionModal({ type: 'delete', userId: user.id })}
                            className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 flex items-center justify-center text-xs transition-colors"
                            title="Delete User"
                          >
                            🗑️
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Confirmation Modal */}
            <AnimatePresence>
              {actionModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <motion.div
                    className="bg-[#0b1224] border border-border rounded-2xl shadow-2xl p-6 max-w-sm w-full relative overflow-hidden"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-[40px] pointer-events-none" />
                    
                    <h3 className="text-lg font-black mb-2 text-white relative z-10 flex items-center gap-2">
                      {actionModal.type === 'delete'
                        ? '🗑️ Confirm Deletion'
                        : actionModal.type === 'ban'
                        ? '⚠️ Change Access Status'
                        : '🔑 Security Reset'}
                    </h3>
                    <p className="text-xs text-primary-light/60 mb-6 leading-relaxed relative z-10 font-mono">
                      {actionModal.type === 'delete'
                        ? 'Are you absolutely sure you want to permanently purge this user record? This action cannot be reversed.'
                        : actionModal.type === 'ban'
                        ? 'Are you sure you want to modify this user\'s platform access privileges?'
                        : 'Transmit a secure password reset token to this user\'s registered email address?'}
                    </p>
                    <div className="flex gap-3 justify-end relative z-10 pt-4 border-t border-border">
                      <button 
                        onClick={() => setActionModal(null)}
                        className="px-4 py-2 bg-surface border border-border text-text-secondary/60 text-xs font-bold rounded-xl hover:bg-white/10 hover:text-white transition-all"
                      >
                        Abort
                      </button>
                      <button
                        onClick={() => {
                          if (actionModal.type === 'delete') {
                            handleDeleteUser(actionModal.userId);
                          } else if (actionModal.type === 'ban') {
                            handleBanUser(actionModal.userId);
                          } else {
                            handleResetPassword(actionModal.userId);
                          }
                        }}
                        className={`px-5 py-2 text-xs font-bold rounded-xl shadow-md transition-all ${
                          actionModal.type === 'delete' 
                            ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20' 
                            : actionModal.type === 'ban' 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20' 
                            : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700'
                        }`}
                      >
                        {actionModal.type === 'delete' ? 'Confirm Purge' : actionModal.type === 'ban' ? 'Execute Action' : 'Dispatch Link'}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
