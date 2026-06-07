'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/ui/Sidebar';
import { Navbar } from '@/components/ui/Navbar';
import { motion } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import { Skeleton } from '@/components/ui/Skeleton';

interface GroupMember {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

interface Message {
  id: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: string;
  isSelf: boolean;
}

const DEFAULT_MEMBERS: GroupMember[] = [
  { id: 'me', name: 'You (Student)', avatar: 'ME', role: 'Group Leader' },
  { id: 'match-1', name: 'Aria Sharma', avatar: 'AS', role: 'Member' },
  { id: 'match-2', name: 'Rohan Das', avatar: 'RD', role: 'Member' },
  { id: 'match-3', name: 'Priya Singh', avatar: 'PS', role: 'Member' }
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    senderName: 'Rohan Das',
    senderAvatar: 'RD',
    text: 'Hey guys! Thanks for creating the study group. When should we meet to discuss the Physics assignment?',
    timestamp: '11:24 AM',
    isSelf: false
  },
  {
    id: 'msg-2',
    senderName: 'Aria Sharma',
    senderAvatar: 'AS',
    text: "I'm free tomorrow afternoon. We can review notes on kinematics and solve the double-slit experiment questions.",
    timestamp: '11:26 AM',
    isSelf: false
  },
  {
    id: 'msg-3',
    senderName: 'Priya Singh',
    senderAvatar: 'PS',
    text: "Tomorrow afternoon works for me too! Let's book a library study room using the Resource Allocator.",
    timestamp: '11:28 AM',
    isSelf: false
  }
];

export default function GroupPage() {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessageText, setNewMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load members from local storage or fallback to defaults
  useEffect(() => {
    // Simulate loading state using Charu's shared Skeleton
    const timer = setTimeout(() => {
      const stored = localStorage.getItem('temp_group_members');
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as any[];
          const formatted: GroupMember[] = [
            { id: 'me', name: 'You (Student)', avatar: 'ME', role: 'Group Leader' },
            ...parsed.map(p => ({
              id: p.id,
              name: p.name,
              avatar: p.avatar,
              role: 'Member'
            }))
          ];
          setMembers(formatted);
        } catch (e) {
          setMembers(DEFAULT_MEMBERS);
        }
      } else {
        setMembers(DEFAULT_MEMBERS);
      }
      setMessages(INITIAL_MESSAGES);
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Scroll to bottom of chat when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      senderName: 'You (Student)',
      senderAvatar: 'ME',
      text: newMessageText,
      timestamp: time,
      isSelf: true
    };

    setMessages([...messages, newMsg]);
    setNewMessageText('');
  };

  return (
    <div className="flex h-screen bg-background text-text-primary tech-grid">
      <Toaster position="top-right" />
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />

        <main className="flex-1 overflow-hidden p-6 md:p-8 flex flex-col">
          {/* Header */}
          <div className="mb-6 flex justify-between items-center shrink-0">
            <div>
              <h1 className="text-2xl font-black text-white">Alpha Study <span className="gradient-text">Circle</span> 📣</h1>
              <p className="text-[10px] text-primary-light/40 uppercase tracking-wider font-mono mt-0.5">Active Group Collaboration Space</p>
            </div>
            
            <div className="flex gap-1.5 flex-wrap">
              {['Physics', 'Mathematics', 'Chemistry'].map(tag => (
                <span
                  key={tag}
                  className="text-[9px] font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono uppercase"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="flex-1 flex gap-6 overflow-hidden">
            {/* Left Box: Chat Window */}
            <div className="flex-1 bg-surface border border-border rounded-2xl flex flex-col overflow-hidden shadow-lg backdrop-blur-sm relative">
              <div className="absolute top-10 -left-10 w-48 h-48 bg-indigo-500/5 rounded-full blur-[60px] pointer-events-none" />
              {/* Chat Header */}
              <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-black/20 shrink-0 z-10 relative">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">Active Study Room Chat</span>
                </div>
                <span className="text-[10px] text-primary-light/40 font-mono">{messages.length} Messages</span>
              </div>

              {/* Chat Messages List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 z-10 relative">
                {isLoading ? (
                  /* Loading skeletons inside chat */
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <Skeleton className="w-8 h-8 rounded-xl !bg-surface" />
                      <div className="space-y-2 flex-1 max-w-md">
                        <Skeleton className="w-24 h-3 !bg-surface" />
                        <Skeleton className="w-full h-8 rounded-xl !bg-surface" />
                      </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <div className="space-y-2 flex-1 max-w-md">
                        <div className="flex justify-end"><Skeleton className="w-24 h-3 !bg-surface" /></div>
                        <Skeleton className="w-full h-8 rounded-xl !bg-surface" />
                      </div>
                      <Skeleton className="w-8 h-8 rounded-xl !bg-surface" />
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  /* Chat Empty State */
                  <div className="h-full flex flex-col justify-center items-center text-center space-y-3">
                    <span className="text-3xl">💬</span>
                    <h3 className="font-bold text-white text-sm">No Messages Yet</h3>
                    <p className="text-xs text-primary-light/40 max-w-xs">Start the conversation! Introduce yourself and share your studying plans.</p>
                  </div>
                ) : (
                  messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.isSelf ? 'justify-end' : 'justify-start'}`}
                    >
                      {!msg.isSelf && (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                          {msg.senderAvatar}
                        </div>
                      )}
                      
                      <div className={`max-w-md flex flex-col ${msg.isSelf ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-[10px] font-bold text-text-secondary">{msg.senderName}</span>
                          <span className="text-[9px] text-primary-light/40 font-mono">{msg.timestamp}</span>
                        </div>
                        
                        <div
                          className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                            msg.isSelf
                              ? 'bg-gradient-to-br from-indigo-600 to-indigo-500 text-white rounded-tr-sm border border-indigo-400/20'
                              : 'bg-surface text-indigo-100 rounded-tl-sm border border-border'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>

                      {msg.isSelf && (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                          {msg.senderAvatar}
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-border flex gap-3 bg-black/20 shrink-0 z-10 relative">
                <input
                  type="text"
                  required
                  disabled={isLoading}
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder="Type a message to your study group..."
                  className="flex-1 bg-surface border border-border rounded-xl px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 placeholder:text-primary-light/30 transition-all"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-sm transition-colors shrink-0 disabled:opacity-50"
                >
                  Send 📤
                </button>
              </form>
            </div>

            {/* Right Box: Members List Sidepanel */}
            <div className="w-72 bg-surface border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between shrink-0 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-[40px] pointer-events-none" />
              <div className="space-y-5 z-10 relative">
                <h3 className="font-bold text-[10px] text-primary-light/60 uppercase tracking-wider font-mono">
                  Group Members ({members.length})
                </h3>

                <div className="space-y-3">
                  {isLoading ? (
                    [1, 2, 3, 4].map(i => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-xl !bg-surface" />
                        <div className="space-y-1.5 flex-1">
                          <Skeleton className="w-20 h-3 !bg-surface" />
                          <Skeleton className="w-12 h-2 !bg-surface" />
                        </div>
                      </div>
                    ))
                  ) : (
                    members.map(member => (
                      <div key={member.id} className="flex items-center justify-between border-b border-border-subtle pb-2.5 group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-sm group-hover:scale-110 transition-transform">
                            {member.avatar}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">{member.name}</div>
                            <div className="text-[9px] text-primary-light/40 font-mono uppercase tracking-wide mt-0.5">{member.role}</div>
                          </div>
                        </div>
                        
                        <span className={`w-2 h-2 rounded-full ${member.id === 'me' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-white/20'}`} />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Sidebar Footer CTA to Resource Allocator */}
              <div className="border-t border-border pt-4 mt-4 text-center z-10 relative">
                <p className="text-[10px] text-primary-light/50 mb-2.5 leading-relaxed font-mono uppercase tracking-wider">
                  Need a private room?
                </p>
                <a
                  href="/resources"
                  className="inline-block w-full py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-primary-light hover:text-white rounded-xl text-[10px] font-bold border border-indigo-500/20 transition-all uppercase tracking-wider shadow-sm"
                >
                  🏢 Reserve Library Room
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
