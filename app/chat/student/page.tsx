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
import { motion, AnimatePresence } from 'framer-motion';

const suggestions = [
  { text: "Explain Newton's second law of motion 🍎", prompt: "Explain Newton's second law of motion in detail with examples." },
  { text: "Solve x² - 5x + 6 = 0 step-by-step 📐", prompt: "How do I solve the quadratic equation x² - 5x + 6 = 0?" },
  { text: "How do catalysts affect kinetics? 🧪", prompt: "How do catalysts affect the rate of a chemical reaction in chemical kinetics?" },
  { text: "What is photosynthesis in Santali? 🌿", prompt: "Can you explain photosynthesis and respond in Santali language?" }
];

export default function StudentChatPage() {
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
    } else if (user.role !== 'student') {
      router.replace('/chat');
    }
  }, [user, router]);

  // Clear chat history on mount or user switch
  useEffect(() => {
    clearChat();
  }, [user, clearChat]);

  const [input, setInput] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onstart = () => {
        setIsRecording(true);
      };

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInput((prev) => prev + (prev ? ' ' : '') + transcript);
      };

      recognitionRef.current.onerror = (e: any) => {
        console.error('Speech recognition error', e);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const handleSend = async (messageText = input) => {
    const textToSend = messageText.trim();
    if (!textToSend && !uploadedImage) return;

    // Add user message to UI
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      image: uploadedImage || undefined,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInput('');
    setUploadedImage(null);

    // Call state action with language parameter
    await sendMessage(textToSend, uploadedImage || undefined, selectedLanguage);
  };

  const handleVoiceInput = () => {
    if (recognitionRef.current) {
      if (isRecording) {
        recognitionRef.current.stop();
      } else {
        if (selectedLanguage === 'Hindi') {
          recognitionRef.current.lang = 'hi-IN';
        } else if (selectedLanguage === 'Santali') {
          // Fallback or generic recognition setting
          recognitionRef.current.lang = 'en-IN';
        } else {
          recognitionRef.current.lang = 'en-US';
        }
        recognitionRef.current.start();
      }
    } else {
      alert("Speech recognition is not supported in this browser. Try Chrome!");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const selectSuggestion = (promptText: string) => {
    setInput(promptText);
    handleSend(promptText);
  };

  return (
    <div className="flex h-screen bg-background text-text-primary tech-grid overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />

        <div className="flex flex-1 overflow-hidden">
          {/* Chat History / Info Left Bar */}
          <div className="w-68 bg-surface-2/45 dark:bg-[#050b18]/60 backdrop-blur-md border-r border-border p-5 overflow-y-auto hidden lg:flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-xs uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-mono">Tutor Session</h2>
                <button
                  onClick={clearChat}
                  suppressHydrationWarning={true}
                  className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-350 transition-colors bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20"
                >
                  🗑️ Clear
                </button>
              </div>

              {/* Status Badge */}
              <div className="p-3 bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/10 dark:border-indigo-500/20 rounded-xl mb-6">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-300 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  RAG Database Online
                </div>
                <p className="text-[10px] text-indigo-600/60 dark:text-indigo-300/50 leading-relaxed font-mono">
                  Syncing questions and formulas with NCERT textbook indexes.
                </p>
              </div>

              {/* Dialect Info */}
              <div className="p-3 bg-violet-500/5 dark:bg-violet-950/20 border border-violet-500/10 dark:border-violet-500/20 rounded-xl">
                <h3 className="text-xs font-bold text-violet-600 dark:text-violet-300 mb-1 font-mono">Multilingual Mode</h3>
                <p className="text-[10px] text-violet-600/60 dark:text-violet-300/50 leading-relaxed">
                  Submit queries in Santali or Hindi. Speech modules automatically run whisper translations.
                </p>
              </div>
            </div>

            <div className="text-[10px] font-mono text-indigo-500/40 dark:text-indigo-300/30 text-center border-t border-border pt-4">
              EduBridge AI Core v2.0
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col bg-background/30 dark:bg-[#050b18]/40">
            {/* Header Toolbar */}
            <div className="px-6 py-3 border-b border-border flex items-center justify-between bg-surface/20 dark:bg-slate-950/20 backdrop-blur">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <div>
                  <h2 className="text-sm font-bold text-text-primary leading-tight">EduBridge AI Tutor</h2>
                  <p className="text-[10px] text-indigo-600/60 dark:text-indigo-400/60 font-mono">Adaptive STEM & RAG Solver</p>
                </div>
              </div>

              {/* Language Selector */}
              <div className="flex items-center gap-1 bg-surface-2/80 dark:bg-slate-900/60 border border-border p-1 rounded-xl">
                {['English', 'Hindi', 'Santali'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${selectedLanguage === lang
                        ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md'
                        : 'text-indigo-600 dark:text-indigo-400 hover:text-text-primary dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                  >
                    {lang === 'Hindi' ? 'हिन्दी' : lang === 'Santali' ? 'ᱥᱟᱱᱛᱟᱲᱤ' : lang}
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
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg text-3xl mb-4 animate-pulse-glow">
                    🤖
                  </div>
                  <h2 className="text-2xl font-black text-text-primary mb-2 tracking-tight">How can I help you today?</h2>
                  <p className="text-text-secondary/70 dark:text-indigo-200/50 text-center max-w-md text-sm mb-8 leading-relaxed">
                    Ask questions from your physics, chemistry, mathematics, or biology books. Upload drawings, notes, or use audio files!
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => selectSuggestion(s.prompt)}
                        className="p-3.5 text-left rounded-xl bg-surface hover:bg-indigo-500/5 dark:hover:bg-indigo-950/20 border border-border hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-all group flex items-start justify-between cursor-pointer"
                      >
                        <span className="text-xs font-medium text-text-secondary group-hover:text-indigo-600 dark:group-hover:text-white transition-colors">
                          {s.text}
                        </span>
                        <span className="text-xs text-indigo-500 group-hover:translate-x-1 transition-transform pl-2">
                          ➔
                        </span>
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
                      className={`max-w-xs md:max-w-md lg:max-w-xl rounded-2xl p-4 shadow-md ${msg.role === 'user'
                          ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-br-none border border-indigo-500/20'
                          : 'bg-surface border border-border text-text-primary rounded-bl-none backdrop-blur-sm shadow-sm'
                        }`}
                    >
                      {msg.image && (
                        <img
                          src={msg.image}
                          alt="uploaded image"
                          className="w-full max-w-xs rounded-lg mb-2 border border-border"
                        />
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <p
                        className={`text-[9px] font-mono mt-2 text-right ${msg.role === 'user' ? 'text-indigo-200/60' : 'text-text-muted/60 dark:text-indigo-300/40'
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
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 animate-pulse">
                      Tutor is compiling NCERT RAG answers...
                    </span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-border bg-surface-2/40 dark:bg-slate-950/40 p-4 md:p-6 backdrop-blur-md">
              {uploadedImage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-4 relative w-24 h-24"
                >
                  <img
                    src={uploadedImage}
                    alt="preview"
                    className="w-full h-full object-cover rounded-xl border border-border shadow-md"
                  />
                  <button
                    onClick={() => setUploadedImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center transition-colors shadow-md text-xs font-bold"
                    aria-label="Remove image"
                  >
                    ✕
                  </button>
                </motion.div>
              )}

              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageUpload}
                  aria-label="Upload equation image"
                />

                <div className="flex gap-2 flex-1">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      selectedLanguage === 'Santali'
                        ? "ᱥᱟᱱᱛᱟᱲᱤ ᱛᱮ ᱠᱩᱞᱤ ᱢᱮ..."
                        : selectedLanguage === 'Hindi'
                          ? "हिन्दी में प्रश्न पूछें..."
                          : "Ask EduBridge AI Tutor..."
                    }
                    className="flex-1 px-4 py-3 bg-surface border border-border focus:border-indigo-500 text-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm placeholder:text-text-muted/50 dark:placeholder:text-indigo-400/40"
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    disabled={isLoading}
                    aria-label="Student message input"
                  />

                  {/* Math Solver / OCR Attachment button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 bg-surface border border-border hover:bg-indigo-50/10 dark:hover:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-white rounded-xl transition-all flex items-center justify-center text-lg"
                    title="Upload equation image for OCR solver"
                    aria-label="Attach math formula picture"
                  >
                    📐📷
                  </button>

                  {/* Speech input */}
                  <button
                    onClick={handleVoiceInput}
                    className={`px-4 bg-surface border border-border hover:bg-indigo-5/10 dark:hover:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-white rounded-xl transition-all flex items-center justify-center text-lg ${isRecording ? 'ring-2 ring-red-500 bg-red-500/10 text-red-500 hover:text-red-400' : ''
                      }`}
                    title="Voice input"
                    aria-label="Record voice speech query"
                  >
                    {isRecording ? '⏹️' : '🎤'}
                  </button>

                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() && !uploadedImage}
                    className="px-5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl font-bold transition-all shadow-md flex items-center justify-center text-sm disabled:opacity-40 disabled:pointer-events-none"
                    aria-label="Send query"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
