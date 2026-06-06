'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/ui/Sidebar';
import { Navbar } from '@/components/ui/Navbar';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';

interface Event {
  id: string;
  title: string;
  date: Date;
  time: string;
  location: string;
  type: 'Exam' | 'Seminar' | 'Club';
  rsvpStatus: 'RSVP' | 'Attending';
  description: string;
}

const INITIAL_EVENTS: Event[] = [
  {
    id: '1',
    title: 'Midterm Physics Exam',
    date: new Date(2026, 5, 15), // June 15, 2026
    time: '10:00 AM - 12:00 PM',
    location: 'Room 402, Science Block',
    type: 'Exam',
    rsvpStatus: 'RSVP',
    description: 'Covers kinematics, thermodynamics, and electromagnetism. Make sure to bring your calculators.'
  },
  {
    id: '2',
    title: 'AI Seminar: Future of Agentic Systems',
    date: new Date(2026, 5, 18), // June 18, 2026
    time: '2:00 PM - 3:30 PM',
    location: 'Seminar Hall B',
    type: 'Seminar',
    rsvpStatus: 'Attending',
    description: 'Guest lecture by DeepMind scientists on LLM-based autonomous agents and developer tooling.'
  },
  {
    id: '3',
    title: 'Coding Club Hackathon Orientation',
    date: new Date(2026, 5, 20), // June 20, 2026
    time: '4:30 PM - 6:00 PM',
    location: 'Tech Lab 1',
    type: 'Club',
    rsvpStatus: 'RSVP',
    description: 'Learn about the rules, team forming guidelines, and themes for the upcoming summer hackathon.'
  },
  {
    id: '4',
    title: 'Chemistry Lab Practical Quiz',
    date: new Date(2026, 5, 22), // June 22, 2026
    time: '9:00 AM - 11:00 AM',
    location: 'Chemistry Lab B',
    type: 'Exam',
    rsvpStatus: 'RSVP',
    description: 'Practical test on volumetric analysis and identification of acidic and basic radicals.'
  },
  {
    id: '5',
    title: 'English Literature Book Review Session',
    date: new Date(2026, 5, 25), // June 25, 2026
    time: '3:00 PM - 4:30 PM',
    location: 'Library Study Room 3',
    type: 'Club',
    rsvpStatus: 'RSVP',
    description: 'Group discussion reviewing Shakespearean tragedies and themes of tragic flaws in Hamlet.'
  }
];

const BADGE_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  Exam: {
    bg: 'bg-red-500/10 border border-red-500/20',
    text: 'text-red-400',
    dot: 'bg-red-500'
  },
  Seminar: {
    bg: 'bg-purple-500/10 border border-purple-500/20',
    text: 'text-purple-400',
    dot: 'bg-purple-500'
  },
  Club: {
    bg: 'bg-blue-500/10 border border-blue-500/20',
    text: 'text-blue-400',
    dot: 'bg-blue-500'
  }
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>(INITIAL_EVENTS);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 5, 15)); // June 15, 2026 default
  const [filterType, setFilterType] = useState<string>('All');

  // Toggle RSVP status
  const handleRSVP = (id: string) => {
    let toastMsg = '';
    setEvents(prevEvents =>
      prevEvents.map(event => {
        if (event.id === id) {
          const newStatus = event.rsvpStatus === 'RSVP' ? 'Attending' : 'RSVP';
          toastMsg = newStatus === 'Attending'
            ? `Registered for ${event.title}! See you there.`
            : `Cancelled RSVP for ${event.title}.`;
          return { ...event, rsvpStatus: newStatus };
        }
        return event;
      })
    );
    if (toastMsg) {
      toast.success(toastMsg);
    }
  };

  // Helper to format date label
  const formatDateString = (d: Date) => {
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Calendar tile class modifier to show dots under days with events
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const dayEvents = events.filter(
        e => e.date.getFullYear() === date.getFullYear() &&
             e.date.getMonth() === date.getMonth() &&
             e.date.getDate() === date.getDate()
      );
      if (dayEvents.length > 0) {
        return (
          <div className="flex justify-center gap-1 mt-1">
            {dayEvents.map(e => (
              <span
                key={e.id}
                className={`w-1.5 h-1.5 rounded-full ${BADGE_STYLES[e.type].dot}`}
              />
            ))}
          </div>
        );
      }
    }
    return null;
  };

  // Filter chronological list
  const filteredEvents = events.filter(event => {
    const matchesType = filterType === 'All' || event.type === filterType;
    return matchesType;
  });

  // Events happening on the specifically clicked calendar date
  const eventsOnSelectedDate = events.filter(
    e => e.date.getFullYear() === selectedDate.getFullYear() &&
         e.date.getMonth() === selectedDate.getMonth() &&
         e.date.getDate() === selectedDate.getDate()
  );

  return (
    <div className="flex h-screen bg-background text-text-primary tech-grid">
      <Toaster position="top-right" />
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />

        <main className="flex-1 overflow-auto p-6 md:p-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white">Events & Calendar <span className="gradient-text">Timeline</span> 📅</h1>
            <p className="text-xs text-primary-light/50 mt-1">Stay updated with class schedules, seminars, and club activities.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Col: Calendar View & Selected Date Panel */}
            <div className="lg:col-span-1 space-y-6">
              {/* Premium Calendar Container */}
              <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/[0.03] rounded-full blur-[60px] pointer-events-none" />
                <h3 className="font-bold text-xs mb-4 text-primary-light/60 uppercase tracking-wider font-mono">
                  Monthly Calendar
                </h3>
                
                {/* Custom styling applied on top of react-calendar */}
                <div className="react-calendar-custom-wrapper">
                  <Calendar
                    onChange={(val) => {
                      if (val instanceof Date) {
                        setSelectedDate(val);
                      }
                    }}
                    value={selectedDate}
                    tileContent={tileContent}
                    className="border-none w-full bg-transparent text-white"
                  />
                </div>
              </div>

              {/* Selected Date Detail Panel */}
              <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm backdrop-blur-sm">
                <h3 className="font-bold text-xs mb-2 text-primary-light/60 uppercase tracking-wider font-mono">
                  Agenda: {formatDateString(selectedDate)}
                </h3>
                {eventsOnSelectedDate.length === 0 ? (
                  <p className="text-xs text-primary-light/30 italic mt-3">No activities scheduled for this date.</p>
                ) : (
                  <div className="space-y-3 mt-3">
                    {eventsOnSelectedDate.map(event => {
                      const badge = BADGE_STYLES[event.type];
                      return (
                        <div key={event.id} className="p-3 bg-surface rounded-xl flex items-start justify-between gap-2 border border-border-subtle hover:border-border transition-all">
                          <div>
                            <div className="text-xs font-bold text-white">{event.title}</div>
                            <div className="text-[10px] text-primary-light/40 mt-1 font-mono">{event.time}</div>
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${badge.bg} ${badge.text}`}>
                            {event.type}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Chronological List View */}
            <div className="lg:col-span-2 space-y-6">
              {/* Controls */}
              <div className="flex justify-between items-center bg-surface border border-border rounded-2xl p-4 shadow-sm backdrop-blur-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-primary-light/60 font-mono">Chronological Event Timeline</span>
                
                <div className="flex gap-1.5">
                  {['All', 'Exam', 'Seminar', 'Club'].map(type => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                        filterType === type
                          ? 'bg-indigo-500/10 border-indigo-500/35 text-primary-light'
                          : 'bg-transparent border-transparent text-text-secondary/40 hover:text-text-secondary/60'
                      }`}
                    >
                      {type}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Event Cards */}
              <div className="space-y-4">
                {filteredEvents.map(event => {
                  const badge = BADGE_STYLES[event.type];
                  const isAttending = event.rsvpStatus === 'Attending';
                  
                  return (
                    <motion.div
                      key={event.id}
                      layout
                      className="tech-card p-5 flex flex-col md:flex-row justify-between gap-4 group"
                    >
                      <div className="space-y-2.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider font-mono ${badge.bg} ${badge.text}`}>
                            {event.type}
                          </span>
                          <span className="text-[10px] text-primary-light/40 font-mono">
                            📅 {formatDateString(event.date)}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                          {event.title}
                        </h3>

                        <p className="text-xs text-text-secondary/50 leading-relaxed">
                          {event.description}
                        </p>

                        <div className="flex flex-wrap gap-4 text-xs text-primary-light/40 pt-2 font-mono">
                          <span className="flex items-center gap-1">🕒 {event.time}</span>
                          <span className="flex items-center gap-1">📍 {event.location}</span>
                        </div>
                      </div>

                      {/* RSVP Button Side */}
                      <div className="flex md:flex-col justify-end items-end gap-2 shrink-0 border-t md:border-t-0 border-border-subtle pt-3 md:pt-0">
                        <button
                          onClick={() => handleRSVP(event.id)}
                          className={`w-full md:w-32 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                            isAttending
                              ? 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/25'
                              : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-primary-light border border-indigo-500/25'
                          }`}
                        >
                          {isAttending ? '✓ Attending' : 'RSVP Now'}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Styled inject for react-calendar customization */}
      <style jsx global>{`
        .react-calendar-custom-wrapper .react-calendar {
          border: none !important;
          background: transparent !important;
          font-family: inherit !important;
          color: #e2e8f0 !important;
        }
        .react-calendar-custom-wrapper .react-calendar__tile {
          padding: 0.75em 0.5em !important;
          border-radius: 0.75rem !important;
          transition: background-color 0.2s;
          color: #94a3b8 !important;
        }
        .react-calendar-custom-wrapper .react-calendar__tile:hover {
          background-color: rgba(255, 255, 255, 0.08) !important;
          color: #fff !important;
        }
        .react-calendar-custom-wrapper .react-calendar__tile--now {
          background-color: rgba(99, 102, 241, 0.1) !important;
          color: #818cf8 !important;
        }
        .react-calendar-custom-wrapper .react-calendar__tile--active {
          background-color: #6366f1 !important;
          color: white !important;
        }
        .react-calendar-custom-wrapper .react-calendar__navigation button {
          border-radius: 0.5rem !important;
          font-weight: bold !important;
          color: #fff !important;
        }
        .react-calendar-custom-wrapper .react-calendar__navigation button:hover {
          background-color: rgba(255, 255, 255, 0.08) !important;
        }
        .react-calendar-custom-wrapper .react-calendar__month-view__weekdays__weekday abbr {
          text-decoration: none !important;
          font-weight: bold !important;
          color: #818cf8 !important;
        }
      `}</style>
    </div>
  );
}
