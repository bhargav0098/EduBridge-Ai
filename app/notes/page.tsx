'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/ui/Sidebar';
import { Navbar } from '@/components/ui/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';

interface Note {
  id: string;
  title: string;
  subject: string;
  uploader: {
    name: string;
    avatar: string;
    role: string;
  };
  fileType: 'PDF' | 'TXT';
  tags: string[];
  isPrivate: boolean;
  uploadedAt: string;
  description: string;
}

const INITIAL_NOTES: Note[] = [
  {
    id: '1',
    title: 'Quantum Physics Fundamentals',
    subject: 'Physics',
    uploader: {
      name: 'Dr. Ramesh Kumar',
      avatar: 'RK',
      role: 'Professor'
    },
    fileType: 'PDF',
    tags: ['Quantum', 'Mechanics', 'Lecture'],
    isPrivate: false,
    uploadedAt: '2026-06-01',
    description: 'Core concepts of quantum mechanics, wave-particle duality, and Schrodinger equation derivation with detailed notes and solved examples.'
  },
  {
    id: '2',
    title: 'Data Structures Cheat Sheet',
    subject: 'Computer Science',
    uploader: {
      name: 'Sarah Jenkins',
      avatar: 'SJ',
      role: 'TA'
    },
    fileType: 'TXT',
    tags: ['Trees', 'Graphs', 'Algos'],
    isPrivate: false,
    uploadedAt: '2026-06-03',
    description: 'Quick reference for Big O complexities, array operations, binary search trees, graph traversals, and common dynamic programming patterns.'
  },
  {
    id: '3',
    title: 'Organic Chemistry Mechanisms',
    subject: 'Chemistry',
    uploader: {
      name: 'Dr. Alisha Patel',
      avatar: 'AP',
      role: 'Professor'
    },
    fileType: 'PDF',
    tags: ['Organic', 'Reactions', 'Exam'],
    isPrivate: true,
    uploadedAt: '2026-06-04',
    description: 'Comprehensive mechanism charts for electrophilic substitution, nucleophilic addition, and elimination reactions in aromatic hydrocarbons.'
  },
  {
    id: '4',
    title: 'Linear Algebra Final Prep',
    subject: 'Mathematics',
    uploader: {
      name: 'Prof. Arthur Pendelton',
      avatar: 'AP',
      role: 'Professor'
    },
    fileType: 'PDF',
    tags: ['Matrices', 'Vectors', 'Linear'],
    isPrivate: false,
    uploadedAt: '2026-06-05',
    description: 'Review of vector spaces, subspaces, linear transformations, eigen values, eigen vectors, and orthogonal projection techniques.'
  },
  {
    id: '5',
    title: 'Shakespearean Tragedy Themes',
    subject: 'English',
    uploader: {
      name: 'Emily Blunt',
      avatar: 'EB',
      role: 'Student'
    },
    fileType: 'TXT',
    tags: ['English', 'Literature', 'Drama'],
    isPrivate: false,
    uploadedAt: '2026-06-05',
    description: 'Analysis of power, betrayal, and madness themes across Hamlet, Macbeth, and King Lear with critical text quotes.'
  },
  {
    id: '6',
    title: 'Introduction to Neural Networks',
    subject: 'Computer Science',
    uploader: {
      name: 'Alan Turing',
      avatar: 'AT',
      role: 'Legend'
    },
    fileType: 'PDF',
    tags: ['AI', 'Deep Learning', 'Neural'],
    isPrivate: false,
    uploadedAt: '2026-06-06',
    description: 'Detailed explanation of feedforward neural networks, backpropagation math, activation functions, and gradient descent optimization.'
  }
];

const SUBJECT_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Physics: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20'
  },
  Chemistry: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20'
  },
  Mathematics: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20'
  },
  'Computer Science': {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/20'
  },
  English: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20'
  }
};

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  
  // Upload modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('Physics');
  const [newTagsString, setNewTagsString] = useState('');
  const [newIsPrivate, setNewIsPrivate] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [draggedFile, setDraggedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Client-side search and subject filtering
  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          note.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          note.uploader.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'All' || note.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  // Drag and Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setDraggedFile(file);
      toast.success(`File detected: ${file.name}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDraggedFile(file);
      toast.success(`File selected: ${file.name}`);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Please enter a note title.');
      return;
    }

    const tags = newTagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const fileExt = draggedFile?.name.split('.').pop()?.toUpperCase();
    const type: 'PDF' | 'TXT' = fileExt === 'TXT' ? 'TXT' : 'PDF';

    const newNote: Note = {
      id: String(notes.length + 1),
      title: newTitle,
      subject: newSubject,
      uploader: {
        name: 'You (Student)',
        avatar: 'ME',
        role: 'Student'
      },
      fileType: type,
      tags: tags.length > 0 ? tags : ['Notes'],
      isPrivate: newIsPrivate,
      uploadedAt: new Date().toISOString().split('T')[0],
      description: newDescription || 'No description provided.'
    };

    setNotes([newNote, ...notes]);
    toast.success('Notes uploaded successfully!');
    
    // Reset states
    setNewTitle('');
    setNewSubject('Physics');
    setNewTagsString('');
    setNewIsPrivate(false);
    setNewDescription('');
    setDraggedFile(null);
    setIsModalOpen(false);
  };

  return (
    <div className="flex h-screen bg-background text-text-primary tech-grid">
      <Toaster position="top-right" />
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />

        <main className="flex-1 overflow-auto p-6 md:p-8">
          {/* Header & Upload CTA */}
          <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-black text-white">Study Notes <span className="gradient-text">Hub</span> 📚</h1>
              <p className="text-xs text-primary-light/50 mt-1">Access, share, and organize course summaries and study sheets.</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary flex items-center gap-2 text-sm !py-2.5"
            >
              <span>📤</span> Upload Study Notes
            </button>
          </div>

          {/* Search & Subject Filters */}
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm mb-8 space-y-4 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Bar with live filtering */}
              <div className="flex-1 relative">
                <span className="absolute left-3.5 top-3 text-primary-light/40 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Search notes by title, tag, or author..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-primary-light/25"
                />
              </div>

              {/* Subject Dropdown filter */}
              <div className="w-full sm:w-56">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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
            <div className="flex gap-2 flex-wrap text-xs font-semibold">
              {['All', 'Physics', 'Chemistry', 'Mathematics', 'Computer Science', 'English'].map(subject => (
                <button
                  key={subject}
                  onClick={() => setSelectedSubject(subject)}
                  className={`px-3.5 py-1.5 rounded-xl border transition-all ${
                    selectedSubject === subject
                      ? 'bg-indigo-500/10 border-indigo-500/40 text-primary-light shadow-sm'
                      : 'bg-surface border-border text-text-secondary/50 hover:text-indigo-100 hover:bg-white/[0.08]'
                  }`}
                >
                  {subject}
                </button>
              ))}
            </div>
          </div>

          {/* Masonry Card Grid */}
          {filteredNotes.length === 0 ? (
            <div className="text-center py-16 bg-surface border border-border rounded-2xl">
              <span className="text-4xl">📭</span>
              <h3 className="font-bold text-lg mt-3 text-white">No Notes Found</h3>
              <p className="text-xs text-primary-light/40 mt-1">Try refining your search terms or subject selection.</p>
            </div>
          ) : (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              {filteredNotes.map((note) => {
                const colors = SUBJECT_STYLES[note.subject] || {
                  bg: 'bg-surface',
                  text: 'text-primary-light',
                  border: 'border-border'
                };
                return (
                  <div
                    key={note.id}
                    className="break-inside-avoid tech-card p-5 flex flex-col justify-between mb-6 group"
                  >
                    {/* Header: Title, Subject tag and visibility badge */}
                    <div className="space-y-3.5">
                      <div className="flex justify-between items-start gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider font-mono ${colors.bg} ${colors.text} ${colors.border}`}>
                          {note.subject}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          {note.isPrivate ? (
                            <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded-lg border border-red-500/15 font-bold">🔒 Private</span>
                          ) : (
                            <span className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded-lg border border-green-500/15 font-bold">🌐 Public</span>
                          )}
                          
                          {/* File Type Icon badge */}
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg ${note.fileType === 'PDF' ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-blue-500/20 text-blue-400 border border-blue-500/20'}`}>
                            📄 {note.fileType}
                          </span>
                        </div>
                      </div>

                      <h3 className="font-bold text-base text-white leading-snug group-hover:text-indigo-400 transition-colors">
                        {note.title}
                      </h3>

                      <p className="text-xs text-text-secondary/50 line-clamp-4 leading-relaxed">
                        {note.description}
                      </p>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {note.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-mono font-semibold bg-surface text-primary-light/60 px-2 py-0.5 rounded-md border border-border-subtle">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Footer: Uploader Avatar and Download button */}
                    <div className="border-t border-border mt-5 pt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow">
                          {note.uploader.avatar}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-indigo-100">{note.uploader.name}</div>
                          <div className="text-[9px] text-primary-light/40 uppercase tracking-wide font-mono">{note.uploader.role}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => toast.success(`Starting download: ${note.title}.${note.fileType.toLowerCase()}`)}
                        className="w-8 h-8 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20 rounded-xl text-primary-light hover:text-white transition-all flex items-center justify-center text-sm"
                        title="Download Note"
                      >
                        📥
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
              {/* Modal Header */}
              <div className="p-5 border-b border-border flex justify-between items-center">
                <h3 className="text-lg font-black text-text-primary dark:text-white">Upload New Study Material</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-text-secondary/60 hover:text-text-primary dark:text-primary-light/60 dark:hover:text-white text-xl transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 relative z-10">
                {/* Drag-and-drop zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer relative ${
                    dragActive
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-border hover:border-indigo-500/30 bg-white/[0.01]'
                  }`}
                >
                  <input
                    type="file"
                    id="file-upload"
                    accept=".pdf,.txt"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <span className="text-3xl block mb-2">📁</span>
                  <p className="text-xs font-semibold text-text-primary dark:text-white">
                    {draggedFile ? draggedFile.name : 'Drag & Drop your note file here'}
                  </p>
                  <p className="text-[10px] text-text-muted/60 dark:text-primary-light/40 mt-1">
                    Supports PDF or TXT up to 10MB
                  </p>
                </div>

                {/* Title Input */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-primary-light/60 font-mono">Title:</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Thermodynamics Formula Sheet"
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-text-muted/40 dark:placeholder:text-primary-light/25"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Subject Selector */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-primary-light/60 font-mono">Subject:</label>
                    <select
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    >
                      <option value="Physics" className="bg-surface text-text-primary dark:bg-gray-900 dark:text-white">Physics</option>
                      <option value="Chemistry" className="bg-surface text-text-primary dark:bg-gray-900 dark:text-white">Chemistry</option>
                      <option value="Mathematics" className="bg-surface text-text-primary dark:bg-gray-900 dark:text-white">Mathematics</option>
                      <option value="Computer Science" className="bg-surface text-text-primary dark:bg-gray-900 dark:text-white">Computer Science</option>
                      <option value="English" className="bg-surface text-text-primary dark:bg-gray-900 dark:text-white">English</option>
                    </select>
                  </div>

                  {/* Public/Private Toggle */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-primary-light/60 font-mono">Visibility:</label>
                    <div className="flex items-center h-10">
                      <button
                        type="button"
                        onClick={() => setNewIsPrivate(!newIsPrivate)}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-all ${
                          !newIsPrivate
                            ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400'
                            : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {newIsPrivate ? '🔒 Private (Just Me)' : '🌐 Public (All)'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tag Input */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-primary-light/60 font-mono">Tags (comma-separated):</label>
                  <input
                    type="text"
                    value={newTagsString}
                    onChange={(e) => setNewTagsString(e.target.value)}
                    placeholder="e.g. formula, finalprep, cheat-sheet"
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-text-muted/40 dark:placeholder:text-primary-light/25"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-primary-light/60 font-mono">Brief Description:</label>
                  <textarea
                    rows={3}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Describe what these notes cover..."
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-text-muted/40 dark:placeholder:text-primary-light/25 resize-none"
                  />
                </div>

                {/* Footer buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-surface border border-border text-text-secondary/60 text-xs font-bold rounded-xl hover:bg-primary/5 hover:text-text-primary dark:hover:bg-white/10 dark:hover:text-white transition-all"
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
