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
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />

        <div className="flex flex-1 overflow-hidden">
          {/* Chat History Sidebar */}
          <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto hidden lg:block">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg dark:text-white">Chat History</h2>
              <button
                onClick={clearChat}
                className="text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                🗑️ Clear
              </button>
            </div>
            <div className="space-y-2">
              {messages.slice(0, 5).map((msg, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-colors truncate"
                >
                  {msg.content.substring(0, 30)}...
                </div>
              ))}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {messages.length === 0 ? (
                <motion.div
                  className="h-full flex items-center justify-center flex-col"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="text-6xl mb-4">🤖</div>
                  <h2 className="text-2xl font-bold dark:text-white mb-2">EduBridge AI Tutor</h2>
                  <p className="text-gray-600 dark:text-gray-400 text-center max-w-sm">
                    Ask me anything about your studies! Upload images for OCR, use voice input, and get instant help.
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
                      className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg p-4 ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
                      }`}
                    >
                      {msg.image && (
                        <img
                          src={msg.image}
                          alt="uploaded"
                          className="w-full max-w-xs rounded-lg mb-2"
                        />
                      )}
                      <p className="text-sm md:text-base">{msg.content}</p>
                      <p
                        className={`text-xs mt-2 ${
                          msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {msg.timestamp.toLocaleTimeString()}
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
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-4 rounded-bl-none flex items-center gap-2">
                    <Loader />
                    <span className="text-sm text-gray-700 dark:text-gray-300">AI is thinking...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 md:p-6">
              {uploadedImage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-4 relative w-24 h-24"
                >
                  <img
                    src={uploadedImage}
                    alt="preview"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    onClick={() => setUploadedImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors"
                    aria-label="Remove image"
                  >
                    ✕
                  </button>
                </motion.div>
              )}

              <div className="flex gap-2 flex-wrap">
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
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    disabled={isLoading}
                    aria-label="Message input"
                  />

                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="secondary"
                    size="md"
                    title="Upload image"
                    aria-label="Upload image"
                  >
                    📎
                  </Button>

                  <Button
                    onClick={handleVoiceInput}
                    variant="secondary"
                    size="md"
                    title="Voice input"
                    aria-label="Toggle voice input"
                    className={isRecording ? 'ring-2 ring-red-500' : ''}
                  >
                    {isRecording ? '⏹️' : '🎤'}
                  </Button>

                  <Button
                    onClick={handleSend}
                    isLoading={isLoading}
                    disabled={!input.trim() && !uploadedImage}
                    aria-label="Send message"
                  >
                    📤
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
