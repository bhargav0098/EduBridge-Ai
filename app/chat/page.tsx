'use client';

import { useState, useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { Sidebar } from '@/components/ui/Sidebar';
import { Navbar } from '@/components/ui/Navbar';
import { Button } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { Message } from '@/types';
import { motion } from 'framer-motion';

export default function ChatPage() {
  const { messages, isLoading, addMessage, sendMessage, clearChat } = useChatStore();
  const [input, setInput] = useState('');
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
      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInput((prev) => prev + transcript);
      };
      recognitionRef.current.onend = () => setIsRecording(false);
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim() && !uploadedImage) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      image: uploadedImage || undefined,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    await sendMessage(input, uploadedImage || undefined);
    setInput('');
    setUploadedImage(null);
  };

  const handleVoiceInput = () => {
    if (recognitionRef.current) {
      if (isRecording) {
        recognitionRef.current.stop();
      } else {
        recognitionRef.current.start();
        setIsRecording(true);
      }
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

  return (
    <div className="flex h-screen bg-background text-text-primary tech-grid">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />

        <div className="flex flex-1 overflow-hidden">
          {/* Chat History Sidebar */}
          <div className="w-64 bg-[#0f172a]/60 backdrop-blur-md border-r border-indigo-500/10 p-4 overflow-y-auto hidden lg:block">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-xs uppercase tracking-wider text-primary-light/60 font-mono">Chat History</h2>
              <button
                onClick={clearChat}
                className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20"
              >
                🗑️ Clear
              </button>
            </div>
            <div className="space-y-2">
              {messages.slice(0, 8).map((msg, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-surface border border-border-subtle text-xs font-medium text-text-secondary hover:text-white hover:bg-white/[0.08] cursor-pointer transition-all truncate"
                >
                  {msg.content.substring(0, 30) || "Image doubt session..."}
                </div>
              ))}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col bg-[#050b18]/40">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {messages.length === 0 ? (
                <motion.div
                  className="h-full flex items-center justify-center flex-col"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg text-3xl mb-4 animate-pulse-glow">
                    🤖
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2">EduBridge AI Tutor</h2>
                  <p className="text-text-secondary/50 text-center max-w-sm text-sm">
                    Ask me anything about your studies! Upload images for OCR, use voice input, and get instant explanations.
                  </p>
                </motion.div>
              ) : (
                messages.map((msg, idx) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs md:max-w-md lg:max-w-xl rounded-2xl p-4 shadow-md ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-br-none border border-indigo-500/20'
                          : 'bg-surface border border-border text-text-primary rounded-bl-none'
                      }`}
                    >
                      {msg.image && (
                        <img
                          src={msg.image}
                          alt="uploaded"
                          className="w-full max-w-xs rounded-lg mb-2 border border-border"
                        />
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <p
                        className={`text-[10px] font-mono mt-2 text-right ${
                          msg.role === 'user' ? 'text-text-secondary/60' : 'text-primary-light/40'
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
                  <div className="bg-surface border border-border rounded-2xl p-4 rounded-bl-none flex items-center gap-3">
                    <Loader />
                    <span className="text-xs font-semibold text-primary-light animate-pulse">AI is compiling answer...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-indigo-500/10 bg-[#0f172a]/40 p-4 md:p-6 backdrop-blur-md">
              {uploadedImage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-4 relative w-24 h-24"
                >
                  <img
                    src={uploadedImage}
                    alt="preview"
                    className="w-full h-full object-cover rounded-xl border border-white/15"
                  />
                  <button
                    onClick={() => setUploadedImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors shadow"
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
                  aria-label="Upload image"
                />

                <div className="flex gap-2 flex-1">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask EduBridge AI..."
                    className="flex-1 px-4 py-3 bg-surface border border-border text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm placeholder:text-primary-light/30"
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    disabled={isLoading}
                    aria-label="Message input"
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 bg-surface border border-border hover:bg-white/10 text-primary-light hover:text-white rounded-xl transition-all flex items-center justify-center text-lg"
                    title="Upload image"
                    aria-label="Upload image"
                  >
                    📎
                  </button>

                  <button
                    onClick={handleVoiceInput}
                    className={`px-4 bg-surface border border-border hover:bg-white/10 text-primary-light hover:text-white rounded-xl transition-all flex items-center justify-center text-lg ${isRecording ? 'ring-2 ring-red-500 bg-red-500/10' : ''}`}
                    title="Voice input"
                    aria-label="Toggle voice input"
                  >
                    {isRecording ? '⏹️' : '🎤'}
                  </button>

                  <button
                    onClick={handleSend}
                    disabled={!input.trim() && !uploadedImage}
                    className="px-5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-bold transition-all shadow-md flex items-center justify-center text-sm disabled:opacity-40 disabled:pointer-events-none"
                    aria-label="Send message"
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
