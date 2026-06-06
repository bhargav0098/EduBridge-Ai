'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

/* ═══════════════════════════════════════════
   EDUBRIDGE AI — CINEMATIC INTRO PAGE
   Premium tech-forward splash experience
   ═══════════════════════════════════════════ */

// Particle system for background
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      color: string;
    }> = [];

    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#a78bfa', '#22d3ee'];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticle = () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.5 + 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
    });

    const init = () => {
      resize();
      particles = Array.from({ length: 80 }, createParticle);
    };

    const drawConnections = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.08 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(')', `, ${p.alpha})`).replace('rgb', 'rgba');
        
        // Create hex color with alpha
        const r = parseInt(p.color.slice(1, 3), 16);
        const g = parseInt(p.color.slice(3, 5), 16);
        const b = parseInt(p.color.slice(5, 7), 16);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.alpha})`;
        ctx.fill();

        // Glow effect
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${p.alpha * 0.3})`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      drawConnections();
      animationId = requestAnimationFrame(animate);
    };

    init();
    animate();
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0"
      style={{ pointerEvents: 'none' }}
    />
  );
}

// Concentric pulse rings that emanate from center
function PulseRings() {
  return (
    <div className="absolute inset-0 z-[2] pointer-events-none">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="intro-pulse-ring"
          style={{
            width: 300 + i * 120,
            height: 300 + i * 120,
            animation: `pulse-ring ${3 + i * 0.5}s ease-out ${i * 0.8}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// Vertical data stream columns (matrix-style)
function DataStreams() {
  const [columns, setColumns] = useState<Array<{ left: string; delay: string; duration: string; chars: string }>>([]);

  useEffect(() => {
    setColumns(
      Array.from({ length: 12 }, (_, i) => ({
        left: `${8 + i * 8}%`,
        delay: `${(i * 0.25).toFixed(2)}s`,
        duration: `${4 + i * 0.5}s`,
        chars: Array.from({ length: 8 }, (__, j) =>
          String.fromCharCode(0x30A0 + ((i * 13 + j * 7) % 96))
        ).join('\n'),
      }))
    );
  }, []);

  if (columns.length === 0) return null;

  return (
    <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden opacity-[0.06]">
      {columns.map((col, i) => (
        <div
          key={i}
          className="absolute top-full text-[10px] font-mono text-cyan-400 whitespace-pre leading-5"
          style={{
            left: col.left,
            animation: `data-stream ${col.duration} linear ${col.delay} infinite`,
          }}
        >
          {col.chars}
        </div>
      ))}
    </div>
  );
}

// Orbital ring component
function OrbitalRing({ size, duration, delay, color }: { size: number; duration: number; delay: number; color: string }) {
  return (
    <motion.div
      className="absolute rounded-full border"
      style={{
        width: size,
        height: size,
        borderColor: color,
        top: '50%',
        left: '50%',
        marginTop: -size / 2,
        marginLeft: -size / 2,
      }}
      initial={{ opacity: 0, scale: 0.8, rotate: 0 }}
      animate={{ opacity: 0.15, scale: 1, rotate: 360 }}
      transition={{
        opacity: { delay, duration: 1.5, ease: [0.16, 1, 0.3, 1] },
        scale: { delay, duration: 1.5, ease: [0.16, 1, 0.3, 1] },
        rotate: { delay, duration, repeat: Infinity, ease: 'linear' },
      }}
    />
  );
}

// Glowing node on orbital ring
function OrbitalNode({ orbitSize, duration, delay, icon, label }: {
  orbitSize: number;
  duration: number;
  delay: number;
  icon: string;
  label: string;
}) {
  return (
    <motion.div
      className="absolute z-10"
      style={{
        top: '50%',
        left: '50%',
        marginTop: -20,
        marginLeft: -20,
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay + 0.1, type: "spring", stiffness: 100, damping: 15 }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration, repeat: Infinity, ease: 'linear', delay }}
        style={{ transformOrigin: '20px 20px' }}
      >
        <motion.div
          style={{
            transform: `translateX(${orbitSize / 2}px)`,
          }}
          animate={{ rotate: -360 }}
          transition={{ duration, repeat: Infinity, ease: 'linear', delay }}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 backdrop-blur-sm flex items-center justify-center text-sm group relative cursor-default">
            <span>{icon}</span>
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-primary-light/60 font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              {label}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// Loading bar animation
function LoadingSequence({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing neural pathways...');

  const statusMessages = [
    'Initializing neural pathways...',
    'Loading AI models...',
    'Connecting peer networks...',
    'Calibrating learning algorithms...',
    'System ready.',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.random() * 20 + 8;
        if (next >= 100) {
          clearInterval(interval);
          setStatusText('System ready.');
          setTimeout(onComplete, 300);
          return 100;
        }

        const index = Math.min(
          Math.floor((next / 100) * statusMessages.length),
          statusMessages.length - 1
        );
        setStatusText(statusMessages[index]);
        return next;
      });
    }, 220);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div
      className="w-full max-w-md space-y-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: 0.1, duration: 0.28 }}
    >
      {/* Progress bar */}
      <div className="h-[2px] bg-white/5 rounded-full overflow-hidden relative">
        <motion.div
          className="h-full rounded-full relative"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)',
            boxShadow: '0 0 12px rgba(99, 102, 241, 0.6), 0 0 30px rgba(99, 102, 241, 0.2)',
          }}
        />
      </div>

      {/* Terminal-style status */}
      <div className="flex justify-between items-center font-mono">
        <span className="text-xs text-cyan-400/70 tracking-wide typing-cursor">
          <span className="text-indigo-400/40 mr-1">$</span>{statusText}
        </span>
        <span className="text-xs text-indigo-400/80 font-bold tabular-nums">
          {Math.round(progress)}%
        </span>
      </div>
    </motion.div>
  );
}

// Feature highlight cards for the intro
function FeatureChip({ icon, label, delay }: { icon: string; label: string; delay: number }) {
  return (
    <motion.div
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 120, damping: 14 }}
    >
      <span className="text-sm">{icon}</span>
      <span className="text-xs text-text-secondary/70 font-medium">{label}</span>
    </motion.div>
  );
}

export default function IntroPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'loading' | 'ready'>('loading');
  const [isExiting, setIsExiting] = useState(false);

  const handleLoadComplete = useCallback(() => {
    setPhase('ready');
  }, []);

  // Auto-navigate to /home after the reveal animations finish
  useEffect(() => {
    if (phase === 'ready' && !isExiting) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          router.push('/home');
        }, 450);
      }, 1500); // Wait for title + chips + orbital reveal to finish
      return () => clearTimeout(timer);
    }
  }, [phase, isExiting, router]);

  return (
    <AnimatePresence>
      <motion.div
        className="intro-bg min-h-screen flex flex-col items-center justify-center relative"
        exit={{ opacity: 0, scale: 1.02 }}
        animate={{
          opacity: isExiting ? 0 : 1,
          scale: isExiting ? 1.02 : 1,
          filter: isExiting ? 'blur(8px)' : 'blur(0px)',
        }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Particle canvas background */}
        <ParticleField />

        {/* Data stream columns */}
        <DataStreams />

        {/* Pulse rings */}
        <PulseRings />

        {/* Hex grid pattern */}
        <div className="hex-grid" />

        {/* Radial gradient spotlight */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: '800px',
              height: '800px',
              background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.04) 40%, transparent 70%)',
            }}
          />
        </div>

        {/* Scan line effect */}
        <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden opacity-[0.03]">
          <div
            className="w-full h-[2px] bg-indigo-400"
            style={{ animation: 'scan-line 4s linear infinite' }}
          />
        </div>

        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl">
          {/* Orbital system */}
          <div className="relative mb-8" style={{ width: 300, height: 300 }}>
            {phase === 'ready' && (
              <>
                <OrbitalRing size={280} duration={20} delay={0.1} color="rgba(99, 102, 241, 0.2)" />
                <OrbitalRing size={200} duration={15} delay={0.3} color="rgba(139, 92, 246, 0.15)" />
                <OrbitalRing size={120} duration={10} delay={0.5} color="rgba(6, 182, 212, 0.1)" />
                <OrbitalNode orbitSize={280} duration={20} delay={0.1} icon="🤖" label="AI Tutor" />
                <OrbitalNode orbitSize={200} duration={15} delay={0.3} icon="📊" label="Analytics" />
                <OrbitalNode orbitSize={200} duration={15} delay={0.5} icon="👥" label="Peers" />
                <OrbitalNode orbitSize={120} duration={10} delay={0.7} icon="📝" label="Quiz" />
              </>
            )}

            {/* Center logo */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
              initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg animate-pulse-glow relative">
                {phase === 'loading' && (
                  <>
                    <motion.div
                      className="absolute -inset-3 rounded-[22px] border-2 border-dashed border-indigo-400/30"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                    />
                    <motion.div
                      className="absolute -inset-6 rounded-[26px] border border-cyan-400/15"
                      animate={{ rotate: -360 }}
                      transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
                    />
                  </>
                )}
                <span className="text-3xl">🎓</span>
              </div>
            </motion.div>
          </div>

          {/* Title with glitch effect */}
          <motion.div
            className="space-y-2 mb-4"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={phase === 'ready' ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.9 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight">
              <span className="intro-title-gradient intro-glitch" data-text="EduBridge">EduBridge</span>
              <span className="intro-ai-gradient text-4xl sm:text-5xl lg:text-6xl ml-2 font-light">AI</span>
            </h1>
          </motion.div>

          {/* Tagline with letter spacing animation */}
          <motion.p
            className="text-base sm:text-lg text-text-secondary/50 font-light max-w-xl mb-6 leading-relaxed"
            initial={{ opacity: 0, y: 20, letterSpacing: '0.3em' }}
            animate={phase === 'ready' ? { opacity: 1, y: 0, letterSpacing: '0em' } : { opacity: 0, y: 20, letterSpacing: '0.3em' }}
            transition={{ delay: 0.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            Next-generation AI-powered learning ecosystem.
            <br />
            <span className="text-primary-light/40 text-sm">Personalized • Adaptive • Inclusive</span>
          </motion.p>

          {/* Feature chips */}
          <motion.div
            className="flex flex-wrap gap-3 justify-center mb-10"
            initial={{ opacity: 0, y: 15 }}
            animate={phase === 'ready' ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            {phase === 'ready' && (
              <>
                <FeatureChip icon="💬" label="AI Tutor" delay={0.5} />
                <FeatureChip icon="📈" label="Adaptive Learning" delay={0.6} />
                <FeatureChip icon="👥" label="Peer Matching" delay={0.7} />
                <FeatureChip icon="🏫" label="Smart Resources" delay={0.8} />
              </>
            )}
          </motion.div>

          {/* Loading sequence */}
          <AnimatePresence mode="wait">
            {phase === 'loading' && (
              <LoadingSequence key="loading" onComplete={handleLoadComplete} />
            )}
          </AnimatePresence>
        </div>

        {/* Bottom info bar */}
        <motion.div
          className="absolute bottom-6 left-0 right-0 flex justify-center gap-8 text-[10px] text-indigo-400/30 font-mono tracking-wider uppercase z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.4 }}
        >
          <span>v2.0.0</span>
          <span>·</span>
          <span>AI-Powered</span>
          <span>·</span>
          <span>Team Achievers</span>
          <span>·</span>
          <span>Open Source</span>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
