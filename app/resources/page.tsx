'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/ui/Sidebar';
import { Navbar } from '@/components/ui/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';

interface Resource {
  id: string;
  name: string;
  category: 'Lab Equipment' | 'Library Books';
  availableSlots: number;
  locationOrCallNo: string;
  imageEmoji: string;
  description: string;
}

interface Booking {
  id: string;
  resourceId: string;
  resourceName: string;
  category: 'Lab Equipment' | 'Library Books';
  date: string;
  timeSlot: string;
  status: 'upcoming' | 'past';
}

const INITIAL_RESOURCES: Resource[] = [
  {
    id: 'res-1',
    name: 'Digital Oscilloscope (Tektronix)',
    category: 'Lab Equipment',
    availableSlots: 3,
    locationOrCallNo: 'Electronics Lab - Rm 304',
    imageEmoji: '📟',
    description: 'High-frequency digital storage oscilloscope for testing signal wave frequencies and circuit debugging.'
  },
  {
    id: 'res-2',
    name: 'Gas Chromatography Spectrometer',
    category: 'Lab Equipment',
    availableSlots: 1,
    locationOrCallNo: 'Chemistry Lab A - Rm 212',
    imageEmoji: '🧪',
    description: 'Precision analytical instrument for separation and analysis of volatile compounds in chemical mixtures.'
  },
  {
    id: 'res-3',
    name: '3D Printer (Ultimaker S5)',
    category: 'Lab Equipment',
    availableSlots: 2,
    locationOrCallNo: 'Innovation Hub - Rm 101',
    imageEmoji: '🖨️',
    description: 'Dual-extrusion industrial 3D printer for prototyping and physical project part fabrication.'
  },
  {
    id: 'res-4',
    name: 'CO2 Laser Cutter (60W)',
    category: 'Lab Equipment',
    availableSlots: 0,
    locationOrCallNo: 'Fabrication Lab - Rm 105',
    imageEmoji: '⚡',
    description: 'Computer-controlled laser cutter for engraving and cutting acrylic, wood, and composite boards.'
  },
  {
    id: 'res-5',
    name: 'Introduction to Algorithms (CLRS)',
    category: 'Library Books',
    availableSlots: 5,
    locationOrCallNo: 'QA76.6.I58 - Stack 4A',
    imageEmoji: '📚',
    description: 'Comprehensive guide to algorithms, data structures, analysis, and pseudo-code implementations.'
  },
  {
    id: 'res-6',
    name: 'Principles of Physics (Halliday & Resnick)',
    category: 'Library Books',
    availableSlots: 2,
    locationOrCallNo: 'QC21.3.P75 - Stack 3C',
    imageEmoji: '📖',
    description: 'Foundation textbook covering mechanics, electromagnetism, optics, and thermodynamics principles.'
  },
  {
    id: 'res-7',
    name: 'Organic Chemistry (Clayden & Greeves)',
    category: 'Library Books',
    availableSlots: 0,
    locationOrCallNo: 'QD251.3.O74 - Stack 2B',
    imageEmoji: '📘',
    description: 'Authoritative textbook outlining chemical reactions, mechanisms, synthetic routes, and retrosynthesis.'
  }
];

const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'book-1',
    resourceId: 'res-1',
    resourceName: 'Digital Oscilloscope (Tektronix)',
    category: 'Lab Equipment',
    date: '2026-06-08',
    timeSlot: '11:00 AM - 12:00 PM',
    status: 'upcoming'
  },
  {
    id: 'book-2',
    resourceId: 'res-5',
    resourceName: 'Introduction to Algorithms (CLRS)',
    category: 'Library Books',
    date: '2026-06-10',
    timeSlot: '02:00 PM - 03:00 PM',
    status: 'upcoming'
  },
  {
    id: 'book-3',
    resourceId: 'res-3',
    resourceName: '3D Printer (Ultimaker S5)',
    category: 'Lab Equipment',
    date: '2026-06-02',
    timeSlot: '01:00 PM - 02:00 PM',
    status: 'past'
  }
];

const TIME_SLOTS = [
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 01:00 PM',
  '01:00 PM - 02:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM'
];

export default function ResourceAllocatorPage() {
  const [resources, setResources] = useState<Resource[]>(INITIAL_RESOURCES);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [activeCategoryTab, setActiveCategoryTab] = useState<'Lab Equipment' | 'Library Books'>('Lab Equipment');
  const [activeMainTab, setActiveMainTab] = useState<'all-resources' | 'my-bookings'>('all-resources');

  // Booking Modal States
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [bookingDate, setBookingDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // default to tomorrow
    return d.toISOString().split('T')[0];
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');

  // Fixed slot occupancies based on date and resource
  // Returns true if slot is available (green), false if taken (gray)
  const isSlotAvailable = (slot: string) => {
    // Generate a simple deterministic pseudo-random availability based on slot string length and date day
    const day = parseInt(bookingDate.split('-')[2]) || 1;
    const isTaken = (slot.length + day) % 3 === 0;
    return !isTaken;
  };

  const handleOpenBooking = (res: Resource) => {
    if (res.availableSlots <= 0) {
      toast.error('No available slots for this resource at this moment.');
      return;
    }
    setSelectedResource(res);
    setSelectedTimeSlot('');
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResource) return;
    if (!bookingDate) {
      toast.error('Please pick a booking date.');
      return;
    }
    if (!selectedTimeSlot) {
      toast.error('Please pick an available time slot.');
      return;
    }

    const newBooking: Booking = {
      id: `book-${Date.now()}`,
      resourceId: selectedResource.id,
      resourceName: selectedResource.name,
      category: selectedResource.category,
      date: bookingDate,
      timeSlot: selectedTimeSlot,
      status: 'upcoming'
    };

    setBookings([newBooking, ...bookings]);

    // Decrement available slots in list
    setResources(prev =>
      prev.map(r => (r.id === selectedResource.id ? { ...r, availableSlots: Math.max(0, r.availableSlots - 1) } : r))
    );

    toast.success(`Successfully booked ${selectedResource.name}!`);
    setSelectedResource(null);
  };

  const handleCancelBooking = (bookingId: string, resourceId: string) => {
    setBookings(prev => prev.filter(b => b.id !== bookingId));

    // Restore slot in list
    setResources(prev =>
      prev.map(r => (r.id === resourceId ? { ...r, availableSlots: r.availableSlots + 1 } : r))
    );

    toast.success('Booking cancelled successfully.');
  };

  // Filter resource list
  const filteredResources = resources.filter(res => res.category === activeCategoryTab);

  // Group bookings
  const upcomingBookings = bookings.filter(b => b.status === 'upcoming');
  const pastBookings = bookings.filter(b => b.status === 'past');

  return (
    <div className="flex h-screen bg-background text-text-primary tech-grid">
      <Toaster position="top-right" />
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />

        <main className="flex-1 overflow-auto p-6 md:p-8">
          {/* Header & Main Tabs */}
          <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-black text-white">Resource <span className="gradient-text">Allocator</span> 🏢</h1>
              <p className="text-xs text-primary-light/50 mt-1">Book lab equipment, computing stations, or reserve library materials.</p>
            </div>

            {/* Main Tabs */}
            <div className="flex bg-surface border border-border rounded-xl p-1 shadow-sm shrink-0">
              <button
                onClick={() => setActiveMainTab('all-resources')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeMainTab === 'all-resources'
                    ? 'bg-indigo-500/10 text-primary-light border border-indigo-500/25 shadow-sm shadow-indigo-500/10'
                    : 'text-text-secondary/50 hover:text-white'
                }`}
              >
                All Resources
              </button>
              <button
                onClick={() => setActiveMainTab('my-bookings')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all relative ${
                  activeMainTab === 'my-bookings'
                    ? 'bg-indigo-500/10 text-primary-light border border-indigo-500/25 shadow-sm shadow-indigo-500/10'
                    : 'text-text-secondary/50 hover:text-white'
                }`}
              >
                My Bookings
                {upcomingBookings.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-indigo-500 text-[10px] text-white rounded-full flex items-center justify-center font-bold border border-[#030712] animate-pulse">
                    {upcomingBookings.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {activeMainTab === 'all-resources' ? (
            <>
              {/* Category tabs */}
              <div className="flex border-b border-border mb-6 gap-6">
                {(['Lab Equipment', 'Library Books'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveCategoryTab(tab)}
                    className={`pb-3 text-xs font-bold uppercase tracking-wider font-mono border-b-2 transition-all ${
                      activeCategoryTab === tab
                        ? 'border-indigo-500 text-indigo-400'
                        : 'border-transparent text-text-secondary/40 hover:text-text-secondary/70'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Resource cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredResources.map(res => (
                  <div
                    key={res.id}
                    className="tech-card p-5 flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-2xl p-2.5 bg-surface border border-border rounded-xl group-hover:scale-110 transition-transform">{res.imageEmoji}</span>
                        
                        {/* Available slots badge */}
                        {res.availableSlots > 0 ? (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                            {res.availableSlots} slots available
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                            Fully booked
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="font-bold text-base text-white group-hover:text-indigo-400 transition-colors leading-tight">{res.name}</h3>
                        <p className="text-[10px] text-primary-light/40 mt-1.5 font-mono">
                          📍 {res.category === 'Lab Equipment' ? 'Location' : 'Call No'}: <span className="font-semibold text-text-secondary/70">{res.locationOrCallNo}</span>
                        </p>
                      </div>

                      <p className="text-xs text-text-secondary/50 leading-relaxed line-clamp-3">
                        {res.description}
                      </p>
                    </div>

                    <div className="pt-5 mt-4 border-t border-border-subtle">
                      <button
                        onClick={() => handleOpenBooking(res)}
                        disabled={res.availableSlots <= 0}
                        className="w-full py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl text-xs font-bold shadow-sm transition-all text-primary-light hover:text-white disabled:bg-surface disabled:border-border-subtle disabled:text-primary-light/20 disabled:pointer-events-none"
                      >
                        {res.availableSlots > 0 ? 'Book Resource' : 'No Slots Available'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* My Bookings tab */
            <div className="space-y-8">
              {/* Upcoming Bookings Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary-light/60 font-mono flex items-center gap-2">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" /> Upcoming Reservations
                </h3>
                {upcomingBookings.length === 0 ? (
                  <div className="p-8 text-center bg-surface border border-border rounded-2xl">
                    <p className="text-xs text-primary-light/40">You have no upcoming reservations.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {upcomingBookings.map(b => (
                      <div key={b.id} className="tech-card p-5 flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-lg font-mono">
                            {b.category}
                          </span>
                          <h4 className="font-bold text-sm text-white">{b.resourceName}</h4>
                          <div className="space-y-1 text-xs text-text-secondary/50 font-mono">
                            <div>📅 Date: <strong className="text-indigo-100">{b.date}</strong></div>
                            <div>🕒 Time: <strong className="text-indigo-100">{b.timeSlot}</strong></div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCancelBooking(b.id, b.resourceId)}
                          className="px-3.5 py-1.5 border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold rounded-xl transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Past Bookings Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary-light/40 font-mono flex items-center gap-2">
                  <span className="w-2 h-2 bg-indigo-500/30 rounded-full" /> Past Reservations
                </h3>
                {pastBookings.length === 0 ? (
                  <div className="p-8 text-center bg-surface border border-border rounded-2xl">
                    <p className="text-xs text-primary-light/40">You have no past reservations.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pastBookings.map(b => (
                      <div key={b.id} className="tech-card p-5 opacity-60">
                        <div className="space-y-2">
                          <span className="text-[9px] uppercase font-bold tracking-wider text-primary-light/40 bg-surface px-2 py-0.5 rounded-lg font-mono">
                            {b.category}
                          </span>
                          <h4 className="font-bold text-sm text-white">{b.resourceName}</h4>
                          <div className="space-y-1 text-xs text-text-secondary/40 font-mono">
                            <div>📅 Date: <strong>{b.date}</strong></div>
                            <div>🕒 Time: <strong>{b.timeSlot}</strong></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {selectedResource && (
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
                <div>
                  <h3 className="text-lg font-black text-text-primary dark:text-white">Reserve Resource</h3>
                  <p className="text-xs text-text-secondary/60 dark:text-primary-light/50">{selectedResource.name}</p>
                </div>
                <button
                  onClick={() => setSelectedResource(null)}
                  className="text-text-secondary/60 hover:text-text-primary dark:text-primary-light/60 dark:hover:text-white text-xl transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleConfirmBooking} className="p-6 space-y-5">
                {/* Date Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-primary-light/60 font-mono">Select Date:</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setBookingDate(e.target.value);
                      setSelectedTimeSlot(''); // reset slot when date changes
                    }}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>

                {/* Time Slot Grid */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-primary-light/60 font-mono">Select Time Slot:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_SLOTS.map(slot => {
                      const available = isSlotAvailable(slot);
                      const isSelected = selectedTimeSlot === slot;
                      
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={!available}
                          onClick={() => setSelectedTimeSlot(slot)}
                          className={`p-2.5 rounded-xl text-left text-xs font-bold border transition-all ${
                            !available
                              ? 'bg-surface-2 border-transparent text-text-muted/20 dark:text-primary-light/20 cursor-not-allowed'
                              : isSelected
                              ? 'bg-primary border-primary text-white shadow-sm'
                              : 'bg-primary/10 hover:bg-primary/20 border-primary/20 text-primary dark:text-primary-light'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span>{slot.split(' - ')[0]}</span>
                            <span className={`text-[8px] px-1 py-0.5 rounded font-mono uppercase font-black ${available ? 'bg-primary/20 text-primary dark:text-primary-light' : 'bg-surface-2 text-text-muted/10 dark:text-primary-light/10'}`}>
                              {available ? 'Free' : 'Taken'}
                            </span>
                          </div>
                          <div className="text-[10px] font-normal opacity-85 mt-0.5">Duration: 1 hr</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setSelectedResource(null)}
                    className="px-4 py-2 bg-surface border border-border text-text-secondary/60 text-xs font-bold rounded-xl hover:bg-primary/5 hover:text-text-primary dark:hover:bg-white/10 dark:hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                  >
                    Confirm Reservation
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
