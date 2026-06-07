'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { Sidebar } from '@/components/ui/Sidebar';
import { Navbar } from '@/components/ui/Navbar';
import { Button } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { Message } from '@/types';
import { motion } from 'framer-motion';

const templates = [
  {
    title: "📝 Generate Test Questions",
    description: "Draft MCQs and short-answers for class evaluations.",
    prompt: "Generate 5 multiple-choice questions (with correct options and brief explanations) on Chemical Kinetics for Class 12 Chemistry."
  },
  {
    title: "📚 Lesson Plan Generator",
    description: "Create structured 45-minute lesson timelines.",
    prompt: "Create a 45-minute lesson plan for Class 11 Physics about Newton's Laws of Motion. Include a 10m starter, 25m core activities, and a 10m wrap-up."
  },
  {
    title: "📣 Draft Announcement",
    description: "Write homework and deadline alerts for students.",
    prompt: "Write a warm and encouraging class announcement reminding students to complete their trigonometry assignment by Friday."
  },
  {
    title: "🎓 Pedagogical Advice",
    description: "Get ideas to explain complex topics visually.",
    prompt: "Suggest 3 visual or hands-on activities to help students intuitively grasp the concept of derivative rates of change in calculus."
  }
];

export default function TeacherChatPage() {
  const { messages, isLoading, addMessage, sendMessage, clearChat } = useChatStore();
  const { user } = useAuthStore();
  const router = useRouter();

  // Auth guard
  useEffect(() => {
    if (!user) {
      const t = setTimeout(() => {
        if (!useAuthStore.getState().user) {
          router.replace('/login');
        }
      }, 300);
      return () => clearTimeout(t);
    } else if (user.role !== 'teacher') {
      router.replace('/chat');
    }
  }, [user, router]);

  // Clear chat history on mount or user switch
  useEffect(() => {
    clearChat();
  }, [user, clearChat]);

  const [input, setInput] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (messageText = input) => {
    const textToSend = messageText.trim();
    if (!textToSend) return;

    // Add user message to UI
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInput('');

    // Call state action with language parameter
    await sendMessage(textToSend, undefined, selectedLanguage);
  };

  const selectTemplate = (templatePrompt: string) => {
    setInput(templatePrompt);
  };

  return (
    <div className="flex h-screen bg-background text-text-primary tech-grid overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />

        <div className="flex flex-1 overflow-hidden">
          {/* Chat History / Info Left Bar */}
          <div className="w-68 bg-surface-2/45 dark:bg-[#0f172a]/60 backdrop-blur-md border-r border-border p-5 overflow-y-auto hidden lg:flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-xs uppercase tracking-widest text-purple-600 dark:text-purple-400 font-mono">Teacher Session</h2>
                <button
                  onClick={clearChat}
                  suppressHydrationWarning={true}
                  className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-350 transition-colors bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20"
                >
                  🗑️ Clear
                </button>
              </div>

              {/* Tips block */}
              <div className="p-3 bg-purple-500/5 dark:bg-purple-950/20 border border-purple-500/10 dark:border-purple-500/20 rounded-xl mb-6">
                <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-300 mb-1">
                  💡 Prompting Pro-tip
                </div>
                <p className="text-[10px] text-purple-600/60 dark:text-purple-300/50 leading-relaxed font-mono">
                  You can specify class grades, textbook chapters, difficulty guidelines, or format requirements (e.g. Markdown tables).
                </p>
              </div>

              {/* RAG Context block */}
              <div className="p-3 bg-fuchsia-500/5 dark:bg-fuchsia-950/20 border border-fuchsia-500/10 dark:border-fuchsia-500/20 rounded-xl">
                <h3 className="text-xs font-bold text-fuchsia-600 dark:text-fuchsia-300 mb-1 font-mono">Curricular Context</h3>
                <p className="text-[10px] text-fuchsia-600/60 dark:text-fuchsia-300/50 leading-relaxed">
                  Queries leverage direct index alignments to standard secondary curricula structures for precise textbook cross-references.
                </p>
              </div>
            </div>

            <div className="text-[10px] font-mono text-purple-500/40 dark:text-purple-300/30 text-center border-t border-border pt-4">
              Pedagogical Engine v2.0
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col bg-background/30 dark:bg-[#0f172a]/40">
            {/* Header Toolbar */}
            <div className="px-6 py-3 border-b border-border flex items-center justify-between bg-surface/20 dark:bg-slate-950/20 backdrop-blur">
              <div className="flex items-center gap-2">
                <span className="text-lg">👨‍🏫</span>
                <div>
                  <h2 className="text-sm font-bold text-text-primary leading-tight">AI Teacher Assistant</h2>
                  <p className="text-[10px] text-purple-600/60 dark:text-purple-400/60 font-mono">Syllabus & Curriculum Planner</p>
                </div>
              </div>

              {/* Language Selector */}
              <div className="flex items-center gap-1 bg-surface-2/80 dark:bg-slate-900/60 border border-border p-1 rounded-xl">
                {['English', 'Hindi'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedLanguage === lang
                        ? 'bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white shadow-md'
                        : 'text-purple-600 dark:text-purple-400 hover:text-text-primary dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {lang === 'Hindi' ? 'हिन्दी' : lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {messages.length === 0 ? (
                <motion.div
                  className="h-full flex items-center justify-center flex-col px-4 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg text-3xl mb-4 animate-pulse-glow">
                    👨‍🏫
                  </div>
                  <h2 className="text-2xl font-black text-text-primary mb-2 tracking-tight">Welcome to your AI Assistant</h2>
                  <p className="text-text-secondary/70 dark:text-purple-200/50 text-center max-w-md text-sm mb-8 leading-relaxed">
                    Choose one of the quick templates below or draft a custom request to generate structured classroom assets.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl w-full">
                    {templates.map((t, idx) => (
                      <button
                        key={idx}
                        onClick={() => selectTemplate(t.prompt)}
                        className="p-4 text-left rounded-xl bg-surface hover:bg-purple-500/5 dark:hover:bg-purple-950/20 border border-border hover:border-purple-500/30 dark:hover:border-purple-500/30 transition-all group flex flex-col justify-between cursor-pointer shadow-sm"
                      >
                        <h4 className="text-xs font-bold text-text-primary group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors mb-1">
                          {t.title}
                        </h4>
                        <p className="text-[11px] text-text-secondary group-hover:text-text-primary dark:group-hover:text-purple-200/60 transition-colors leading-relaxed">
                          {t.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs md:max-w-md lg:max-w-2xl rounded-2xl p-4 shadow-md ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white rounded-br-none border border-purple-500/20'
                          : 'bg-surface border border-border text-text-primary rounded-bl-none backdrop-blur-sm shadow-sm'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <p
                        className={`text-[9px] font-mono mt-2 text-right ${
                          msg.role === 'user' ? 'text-purple-200/60' : 'text-text-muted/60 dark:text-purple-300/40'
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-surface border border-border rounded-2xl p-4 rounded-bl-none flex items-center gap-3 shadow-sm">
                    <Loader />
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-300 animate-pulse">
                      Assistant is drafting pedagogical content...
                    </span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-border bg-surface-2/40 dark:bg-slate-950/40 p-4 md:p-6 backdrop-blur-md">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    selectedLanguage === 'Hindi'
                      ? "हिन्दी में प्रश्न पूछें या निर्देश दें..."
                      : "Draft syllabus, test queries, or lesson outlines..."
                  }
                  className="flex-1 px-4 py-3 bg-surface border border-border focus:border-purple-500 text-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all text-sm placeholder:text-text-muted/50 dark:placeholder:text-purple-400/40"
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  disabled={isLoading}
                  aria-label="Teacher prompt input"
                />

                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className="px-6 bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-700 text-white rounded-xl font-bold transition-all shadow-md flex items-center justify-center text-sm disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Send template request"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
