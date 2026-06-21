'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/ui/Sidebar';
import { Navbar } from '@/components/ui/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

interface Note {
  id: number;
  title: string;
  content: string;
  file_path: string | null;
  owner_id: string;
  created_at: string;
  tags: string[];
  upvotes_count: number;
  subject: string;
}

const SUBJECT_STYLES: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  Physics: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    glow: 'shadow-amber-500/10'
  },
  Chemistry: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    glow: 'shadow-emerald-500/10'
  },
  Mathematics: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    glow: 'shadow-blue-500/10'
  },
  'Computer Science': {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
    glow: 'shadow-purple-500/10'
  },
  English: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
    glow: 'shadow-rose-500/10'
  },
  General: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    border: 'border-indigo-500/20',
    glow: 'shadow-indigo-500/10'
  }
};

export default function WikiPage() {
  const { token, user } = useAuthStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [loading, setLoading] = useState(false);
  const [activeUpvotedIds, setActiveUpvotedIds] = useState<Record<number, boolean>>({});

  // View note detail modal
  const [viewingNote, setViewingNote] = useState<Note | null>(null);

  // New Note Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('Physics');
  const [newTagsString, setNewTagsString] = useState('');
  const [newContent, setNewContent] = useState('');

  const fetchNotes = async (searchQuery = '') => {
    setLoading(true);
    try {
      const url = `/api/notes/wiki/search?search=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      } else {
        toast.error('Failed to load wiki notes');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching wiki notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes(searchTerm);
  }, [searchTerm, token]);

  const handleUpvote = async (noteId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/notes/${noteId}/upvote`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveUpvotedIds(prev => ({ ...prev, [noteId]: data.upvoted }));
        
        // Update upvote count locally
        setNotes(prevNotes =>
          prevNotes.map(n =>
            n.id === noteId
              ? { ...n, upvotes_count: n.upvotes_count + data.change }
              : n
          )
        );

        if (viewingNote && viewingNote.id === noteId) {
          setViewingNote(prev => prev ? { ...prev, upvotes_count: prev.upvotes_count + data.change } : null);
        }

        if (data.upvoted) {
          toast.success('Note upvoted! 🚀');
        } else {
          toast.success('Upvote removed.');
        }
      } else {
        toast.error('Failed to toggle upvote');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error toggling upvote');
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Please enter a note title.');
      return;
    }

    const tags = newTagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    try {
      const response = await fetch('/api/notes/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: newTitle,
          content: newContent,
          subject: newSubject,
          tags: tags,
        }),
      });

      if (response.ok) {
        toast.success('Wiki note shared successfully! 🌐');
        setNewTitle('');
        setNewSubject('Physics');
        setNewTagsString('');
        setNewContent('');
        setIsUploadModalOpen(false);
        fetchNotes(searchTerm);
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Failed to share wiki note.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload study note.');
    }
  };

  // Filter notes by subject client-side for smoother interaction
  const displayedNotes = selectedSubject === 'All'
    ? notes
    : notes.filter(note => note.subject.toLowerCase() === selectedSubject.toLowerCase());

  return (
    <div className="flex h-screen bg-background text-text-primary tech-grid">
      <Toaster position="top-right" />
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />

        <main className="flex-1 overflow-auto p-6 md:p-8">
          {/* Hero Header */}
          <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-black text-white flex items-center gap-2">
                Knowledge Wiki <span className="gradient-text font-mono text-2xl px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">WIKI</span> 🌐
              </h1>
              <p className="text-xs text-primary-light/50 mt-1">
                Collaborative community wisdom base. Upvote helpful notes to help your peers discover them.
              </p>
            </div>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="btn-primary flex items-center gap-2 text-sm !py-2.5 shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:shadow-[0_0_25px_rgba(99,102,241,0.6)] transition-all duration-300"
              aria-label="Contribute new note to wiki"
            >
              <span>✍️</span> Contribute to Wiki
            </button>
          </div>

          {/* Search & Subject Filters */}
          <div className="bg-surface/60 border border-border/80 rounded-2xl p-5 shadow-2xl mb-8 space-y-4 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="flex flex-col sm:flex-row gap-4 relative z-10">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <span className="absolute left-3.5 top-3.5 text-primary-light/40 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Search the wiki by title, tags, or content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-primary-light/25 shadow-inner"
                  aria-label="Search Wiki"
                />
              </div>

              {/* Subject Dropdown */}
              <div className="w-full sm:w-56">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner"
                  aria-label="Filter by Subject Dropdown"
                >
                  <option value="All" className="bg-gray-900">All Subjects</option>
                  <option value="Physics" className="bg-gray-900">Physics</option>
                  <option value="Chemistry" className="bg-gray-900">Chemistry</option>
                  <option value="Mathematics" className="bg-gray-900">Mathematics</option>
                  <option value="Computer Science" className="bg-gray-900">Computer Science</option>
                  <option value="English" className="bg-gray-900">English</option>
                </select>
              </div>
            </div>

            {/* Subject Chips */}
            <div className="flex gap-2 flex-wrap text-xs font-semibold relative z-10">
              {['All', 'Physics', 'Chemistry', 'Mathematics', 'Computer Science', 'English'].map(subject => (
                <button
                  key={subject}
                  onClick={() => setSelectedSubject(subject)}
                  className={`px-3.5 py-1.5 rounded-xl border transition-all duration-300 ${
                    selectedSubject === subject
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                      : 'bg-surface border-border text-text-secondary/50 hover:text-indigo-200 hover:bg-white/[0.05]'
                  }`}
                  aria-label={`Filter by ${subject}`}
                >
                  {subject}
                </button>
              ))}
            </div>
          </div>

          {/* Note Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-primary-light/40 font-mono">Searching wiki database...</p>
            </div>
          ) : displayedNotes.length === 0 ? (
            <div className="text-center py-16 bg-surface/40 border border-border rounded-2xl backdrop-blur-sm">
              <span className="text-4xl">📭</span>
              <h3 className="font-bold text-lg mt-3 text-white">No Wiki Articles Found</h3>
              <p className="text-xs text-primary-light/40 mt-1">Be the first to share knowledge on this topic!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedNotes.map((note, index) => {
                const subjectKey = note.subject.charAt(0).toUpperCase() + note.subject.slice(1).toLowerCase();
                const colors = SUBJECT_STYLES[subjectKey] || SUBJECT_STYLES['General'];
                const isUpvoted = activeUpvotedIds[note.id] || false;
                return (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    onClick={() => setViewingNote(note)}
                    className={`tech-card p-5 flex flex-col justify-between cursor-pointer hover:border-indigo-500/50 hover:shadow-2xl hover:${colors.glow} transition-all duration-300 group relative overflow-hidden`}
                  >
                    <div className="space-y-4">
                      {/* Topic Header */}
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider font-mono ${colors.bg} ${colors.text} ${colors.border}`}>
                          {note.subject}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-primary-light/40" suppressHydrationWarning>📅 {new Date(note.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-base text-white leading-snug group-hover:text-indigo-400 transition-colors">
                        {note.title}
                      </h3>

                      {/* Content Snippet */}
                      <p className="text-xs text-text-secondary/50 line-clamp-3 leading-relaxed">
                        {note.content || 'No description provided.'}
                      </p>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {note.tags.map(tag => (
                          <span key={tag} className="text-[10px] font-mono font-semibold bg-surface border border-border-subtle text-primary-light/60 px-2 py-0.5 rounded-md">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Footer / Upvote action */}
                    <div className="border-t border-border mt-5 pt-4 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-primary-light/40 font-mono">
                        <span>👤 Uploader:</span>
                        <span className="text-indigo-200 font-sans font-semibold">User #{note.owner_id.slice(0, 4)}</span>
                      </div>

                      <button
                        onClick={(e) => handleUpvote(note.id, e)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-300 ${
                          isUpvoted
                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.3)] animate-pulse'
                            : 'bg-surface border-border text-text-secondary/60 hover:border-indigo-500/40 hover:text-indigo-400'
                        }`}
                        aria-label={`Upvote note: ${note.title}`}
                      >
                        <span>🔺</span>
                        <span>{note.upvotes_count}</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Note Detail Modal */}
      <AnimatePresence>
        {viewingNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative backdrop-blur-xl"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
              {/* Header */}
              <div className="p-6 border-b border-border flex justify-between items-start">
                <div>
                  {(() => {
                    const subKey = viewingNote.subject.charAt(0).toUpperCase() + viewingNote.subject.slice(1).toLowerCase();
                    const styles = SUBJECT_STYLES[subKey] || SUBJECT_STYLES['General'];
                    return (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider font-mono ${styles.bg} ${styles.text} ${styles.border}`}>
                        {viewingNote.subject}
                      </span>
                    );
                  })()}
                  <h3 className="text-xl font-black text-white mt-2">{viewingNote.title}</h3>
                  <p className="text-[10px] text-primary-light/40 mt-1 font-mono" suppressHydrationWarning>
                    Posted on {new Date(viewingNote.created_at).toLocaleString()} | Owner: User #{viewingNote.owner_id.slice(0, 8)}
                  </p>
                </div>
                <button
                  onClick={() => setViewingNote(null)}
                  className="text-text-secondary/60 hover:text-white text-xl transition-colors"
                  aria-label="Close Note Details"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 max-h-[50vh] overflow-y-auto">
                <div className="bg-background/50 border border-border/60 rounded-xl p-4 text-sm text-text-secondary/90 leading-relaxed font-sans whitespace-pre-wrap">
                  {viewingNote.content || 'No content description available.'}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {viewingNote.tags.map(tag => (
                    <span key={tag} className="text-xs font-mono font-semibold bg-surface border border-border-subtle text-primary-light/60 px-3 py-1 rounded-lg">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border flex justify-between items-center bg-background/25">
                <button
                  onClick={(e) => handleUpvote(viewingNote.id, e)}
                  className={`flex items-center gap-2.5 px-4.5 py-2 rounded-xl border text-sm font-bold transition-all duration-300 ${
                    activeUpvotedIds[viewingNote.id]
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                      : 'bg-surface border-border text-text-secondary/60 hover:border-indigo-500/40 hover:text-indigo-400'
                  }`}
                  aria-label="Upvote Note Detail"
                >
                  <span>🔺 Upvote Note</span>
                  <span className="font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded">{viewingNote.upvotes_count}</span>
                </button>

                <button
                  onClick={() => setViewingNote(null)}
                  className="px-5 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-200 text-xs font-bold rounded-xl transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload/Contribution Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
              {/* Modal Header */}
              <div className="p-5 border-b border-border flex justify-between items-center">
                <h3 className="text-lg font-black text-white">Contribute Study Material to Wiki</h3>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="text-text-secondary/60 hover:text-white text-xl transition-colors"
                  aria-label="Close Contribute Modal"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 relative z-10">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-primary-light/60 font-mono">Title:</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., Matrix Inversion Quick Guide"
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-primary-light/25 shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Subject */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-primary-light/60 font-mono">Subject:</label>
                    <select
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    >
                      <option value="Physics" className="bg-gray-900">Physics</option>
                      <option value="Chemistry" className="bg-gray-900">Chemistry</option>
                      <option value="Mathematics" className="bg-gray-900">Mathematics</option>
                      <option value="Computer Science" className="bg-gray-900">Computer Science</option>
                      <option value="English" className="bg-gray-900">English</option>
                    </select>
                  </div>

                  {/* Tags */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-primary-light/60 font-mono">Tags (comma-separated):</label>
                    <input
                      type="text"
                      value={newTagsString}
                      onChange={(e) => setNewTagsString(e.target.value)}
                      placeholder="e.g., algebra, matrices"
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-primary-light/25 shadow-inner"
                    />
                  </div>
                </div>

                {/* Content description */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-primary-light/60 font-mono">Wiki Content:</label>
                  <textarea
                    rows={6}
                    required
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Write detailed notes, formulas, or cheat sheets here..."
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-primary-light/25 resize-none shadow-inner"
                  />
                </div>

                {/* Footer buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-4 py-2 bg-surface border border-border text-text-secondary/60 text-xs font-bold rounded-xl hover:bg-white/10 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                  >
                    Confirm Upload
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
