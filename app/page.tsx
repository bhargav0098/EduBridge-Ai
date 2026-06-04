'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

export default function Home() {
  const features = [
    {
      icon: '💬',
      title: 'AI-Powered Chat',
      description: 'Get instant help from our intelligent tutoring system 24/7',
    },
    {
      icon: '📝',
      title: 'Adaptive Quizzes',
      description: 'Test your knowledge with personalized quiz questions',
    },
    {
      icon: '📊',
      title: 'Progress Analytics',
      description: 'Track your learning journey with detailed insights',
    },
    {
      icon: '🎤',
      title: 'Voice & Image Support',
      description: 'Upload handwritten notes or use voice commands',
    },
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
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            🎓 EduBridge AI
          </h1>
          <div className="flex gap-3">
            <Link href="/login">
              <Button variant="secondary">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button variant="primary">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 md:py-32">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="text-center mb-12">
            <h2 className="text-5xl md:text-6xl font-bold dark:text-white mb-6">
              Learn Better with{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AI Tutoring
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
              Personalized learning paths, intelligent question solving, and instant feedback. All powered by advanced AI
              technology.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/register">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 text-lg">
                  Start Learning Free
                </Button>
              </Link>
              <Button variant="secondary" className="px-8 py-3 text-lg">
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Hero Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl p-12 min-h-64 flex items-center justify-center"
          >
            <div className="text-center text-gray-600 dark:text-gray-300">
              <div className="text-8xl mb-4">🚀</div>
              <p className="text-2xl font-bold">EduBridge AI Platform</p>
              <p className="text-lg mt-2">Transforming education with intelligent tutoring</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="bg-white dark:bg-gray-800 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className="text-4xl font-bold text-center mb-16 dark:text-white">Powerful Features</h3>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h4 className="text-xl font-bold mb-2 dark:text-white">{feature.title}</h4>
                <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">10k+</div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Students Helped</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">50k+</div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Questions Solved</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-4xl font-bold text-green-600 dark:text-green-400">98%</div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">User Satisfaction</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <div className="text-4xl font-bold text-pink-600 dark:text-pink-400">24/7</div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Available Support</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-24">
        <motion.div
          className="max-w-4xl mx-auto px-6 text-center text-white"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h3 className="text-4xl font-bold mb-6">Ready to Transform Your Learning?</h3>
          <p className="text-lg mb-8 opacity-90">
            Join thousands of students already learning smarter with EduBridge AI.
          </p>
          <Link href="/register">
            <Button className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 text-lg font-bold">
              Sign Up Free
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p>&copy; 2024 EduBridge AI. All rights reserved.</p>
          <p className="mt-2">Transforming Education with Artificial Intelligence</p>
        </div>
      </footer>
    </main>
  );
}
