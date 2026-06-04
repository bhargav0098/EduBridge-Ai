'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/ui/Sidebar';
import { Navbar } from '@/components/ui/Navbar';
import { Button } from '@/components/ui/Button';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

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
    { label: 'Total Users', value: '1,245', icon: '👥', color: 'from-blue-500 to-blue-600' },
    { label: 'Active Users', value: '892', icon: '✅', color: 'from-green-500 to-green-600' },
    { label: 'Quizzes Taken', value: '3,421', icon: '📝', color: 'from-purple-500 to-purple-600' },
    { label: 'Chat Sessions', value: '5,678', icon: '💬', color: 'from-pink-500 to-pink-600' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-auto p-6 md:p-8">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold dark:text-white">Admin Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Manage users, monitor activity, and view analytics</p>
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
                    className={`bg-gradient-to-br ${stat.color} text-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm opacity-90 font-medium">{stat.label}</p>
                        <p className="text-3xl font-bold mt-2">{stat.value}</p>
                      </div>
                      <span className="text-4xl">{stat.icon}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* User Growth */}
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-xl font-bold mb-4 dark:text-white">User Growth</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" />
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
                      dataKey="users"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Activity Metrics */}
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-xl font-bold mb-4 dark:text-white">Platform Activity</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                    />
                    <Bar dataKey="quizzes" fill="#10b981" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="chats" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            </div>

            {/* Users Table */}
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-bold dark:text-white">Users Management</h2>
                <span className="text-sm text-gray-600 dark:text-gray-400">{users.length} users</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Last Active
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {users.map((user) => (
                      <motion.tr
                        key={user.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white font-medium">
                          {user.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400 text-sm">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              user.role === 'student'
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                                : user.role === 'teacher'
                                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200'
                                : 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200'
                            }`}
                          >
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              user.status === 'active'
                                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200'
                                : user.status === 'inactive'
                                ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200'
                                : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200'
                            }`}
                          >
                            {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400 text-sm">
                          {user.lastActive}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2 flex">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedUser(user)}
                            className="text-xs"
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setActionModal({ type: 'resetPassword', userId: user.id })}
                            className="text-xs"
                          >
                            🔑
                          </Button>
                          <Button
                            size="sm"
                            variant={user.status === 'banned' ? 'secondary' : 'danger'}
                            onClick={() => setActionModal({ type: 'ban', userId: user.id })}
                            className="text-xs"
                          >
                            {user.status === 'banned' ? 'Unban' : 'Ban'}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setActionModal({ type: 'delete', userId: user.id })}
                            className="text-xs"
                          >
                            Delete
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Confirmation Modal */}
            {actionModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <motion.div
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 max-w-sm w-full"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <h3 className="text-xl font-bold mb-4 dark:text-white">
                    {actionModal.type === 'delete'
                      ? 'Delete User'
                      : actionModal.type === 'ban'
                      ? 'Ban User'
                      : 'Reset Password'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {actionModal.type === 'delete'
                      ? 'Are you sure you want to delete this user? This action cannot be undone.'
                      : actionModal.type === 'ban'
                      ? 'Are you sure you want to ban this user?'
                      : 'Send password reset link to this user?'}
                  </p>
                  <div className="flex gap-3 justify-end">
                    <Button onClick={() => setActionModal(null)} variant="secondary">
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (actionModal.type === 'delete') {
                          handleDeleteUser(actionModal.userId);
                        } else if (actionModal.type === 'ban') {
                          handleBanUser(actionModal.userId);
                        } else {
                          handleResetPassword(actionModal.userId);
                        }
                      }}
                      variant={actionModal.type === 'delete' ? 'danger' : 'primary'}
                    >
                      {actionModal.type === 'delete' ? 'Delete' : actionModal.type === 'ban' ? 'Ban' : 'Send'}
                    </Button>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
