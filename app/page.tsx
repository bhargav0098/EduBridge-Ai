'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

/* ═══════════════════════════════════════════════════
   EDUBRIDGE AI — CINEMATIC INTRO PAGE
   All animations run on GPU (transform + opacity).
   No setState in animation loops.
   ═══════════════════════════════════════════════════ */

// ── Types ──────────────────────────────────────────
type Particle = {
  x: number; y: number;
  vx: number; vy: number;
  size: number; alpha: number;
  color: string;
};

type CodeChip = {
  id: number; text: string;
  left: string; bottom: string;
  delay: string; duration: string;
  opacity: number; fontSize: string;
};

type StreamItem = {
  left: string; delay: string; duration: string;
  fontSize: string; opacity: number; content: string;
};

// ── Interactive particle canvas with warp-speed streaks ──
function ParticleField({ isWarping }: { isWarping: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isWarpingRef = useRef(isWarping);

  useEffect(() => { isWarpingRef.current = isWarping; }, [isWarping]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#a78bfa', '#22d3ee', '#c084fc'];
    const mouse = { x: null as number | null, y: null as number | null, radius: 190 };
    let particles: Particle[] = [];

    const createParticle = (): Particle => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.75,
      vy: (Math.random() - 0.5) * 0.75,
      size: Math.random() * 2.2 + 0.4,
      alpha: Math.random() * 0.5 + 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
    });

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const init = () => {
      resize();
      // 60 particles for dense, lively background
      particles = Array.from({ length: 60 }, createParticle);
    };

    const drawConnections = () => {
      const maxDist = 145;
      const maxDistSqr = maxDist * maxDist;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distSqr = dx * dx + dy * dy;
          if (distSqr < maxDistSqr) {
            const dist = Math.sqrt(distSqr);
            ctx.beginPath();
            ctx.strokeStyle = `rgba(99,102,241,${0.065 * (1 - dist / maxDist)})`;
            ctx.lineWidth = 0.4;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    const hexToRgb = (hex: string) => ({
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    });

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const warping = isWarpingRef.current;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      particles.forEach((p) => {
        const { r, g, b } = hexToRgb(p.color);

        if (warping) {
          // Hyperdrive: accelerate radially outward from center
          const dx = p.x - cx;
          const dy = p.y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          p.vx += (dx / dist) * 1.4;
          p.vy += (dy / dist) * 1.4;
          p.x += p.vx;
          p.y += p.vy;

          // Warp streak line
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${r},${g},${b},${Math.min(p.alpha * 2, 0.9)})`;
          ctx.lineWidth = p.size * 2.2;
          ctx.moveTo(p.x - p.vx * 4, p.y - p.vy * 4);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        } else {
          // Mouse gravity attraction
          if (mouse.x !== null && mouse.y !== null) {
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const distSqr = dx * dx + dy * dy;
            if (distSqr < mouse.radius * mouse.radius) {
              const dist = Math.sqrt(distSqr) || 1;
              const force = (mouse.radius - dist) / mouse.radius;
              p.vx += (dx / dist) * force * 0.06;
              p.vy += (dy / dist) * force * 0.06;
            }
          }

          // Friction + minimum speed
          p.vx *= 0.97;
          p.vy *= 0.97;
          const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (speed < 0.15) {
            p.vx = (Math.random() - 0.5) * 0.5;
            p.vy = (Math.random() - 0.5) * 0.5;
          }

          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

          // Dot with radial glow
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
          ctx.fill();

          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4.5);
          grad.addColorStop(0, `rgba(${r},${g},${b},${p.alpha * 0.28})`);
          grad.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 4.5, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }
      });

      if (!warping) drawConnections();
      animationId = requestAnimationFrame(animate);
    };

    const onMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onLeave = () => { mouse.x = null; mouse.y = null; };

    init();
    animate();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="absolute inset-0 z-0" style={{ pointerEvents: 'none' }} />
  );
}

// ── Matrix-style vertical code rain columns ──
function DataStreams() {
  const [streams, setStreams] = useState<StreamItem[]>([]);

  useEffect(() => {
    const techSnippets = [
      '0110101', '0x7E3A', 'SYS_BOOT', 'AI_CORE', 'LEARN.init()',
      'NEURAL_LINK', 'CONNECT: OK', '0x88FF', '1011010', 'ADAPTIVE: ON',
      'model.predict()', '0x2C4F', 'GRADIENT_DESCENT', 'TUTOR_BOT', '0xFA91',
      'PARAMS: OK', 'FEEDBACK_LOOP', '010101', 'VECTOR_SPACE', 'MATH.sqrt()',
      'INPUT_LAYER', 'WEIGHTS: CAL', 'BIAS_VAL', 'OPTIMIZER: ADAM',
    ];

    const generate = (i: number): StreamItem => {
      const lines = Array.from({ length: 14 }, () => {
        const t = Math.random();
        if (t < 0.35) return techSnippets[Math.floor(Math.random() * techSnippets.length)];
        if (t < 0.65) return Math.random() < 0.5
          ? Math.random().toString(2).slice(2, 9)
          : `0x${Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2,'0')}`;
        return Array.from({ length: 5 }, () =>
          String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96))
        ).join('');
      });

      return {
        left: `${2 + i * 5.8}%`,
        delay: `${(Math.random() * 5).toFixed(2)}s`,
        duration: `${6 + Math.random() * 7}s`,
        fontSize: `${Math.random() * 3 + 10}px`,
        opacity: Math.random() * 0.12 + 0.08,
        content: lines.join('\n'),
      };
    };

    setStreams(Array.from({ length: 16 }, (_, i) => generate(i)));
  }, []);

  if (streams.length === 0) return null;

  return (
    <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden select-none">
      {streams.map((s, i) => (
        <div
          key={i}
          className="absolute font-mono text-cyan-400 whitespace-pre leading-relaxed tracking-widest"
          style={{
            left: s.left,
            fontSize: s.fontSize,
            opacity: s.opacity,
            animation: `matrix-fall ${s.duration} linear ${s.delay} infinite`,
            top: '-60%',
            willChange: 'transform',
            // @ts-ignore
            '--stream-opacity': s.opacity,
          }}
        >
          {s.content}
        </div>
      ))}
    </div>
  );
}

// ── Floating code chip particles (pure CSS animations) ──
function FloatingCodeChips() {
  const [chips, setChips] = useState<CodeChip[]>([]);

  useEffect(() => {
    const snippets = [
      'const tutor = new EduBridgeAI()',
      'await tutor.generateLearningPath(student)',
      'const embedding = embedText(doubtContext)',
      'vectorDb.similaritySearch(embedding, k=5)',
      'interface StudentProfile { id: string; role: Role; }',
      'const [chats, setChats] = useState<Message[]>([])',
      'learningRate = adaptiveOptimizer.calc(progress)',
      'attention(Q, K, V) = softmax(QKᵀ / √d)V',
      'model.fit(X_train, y_train, epochs=42)',
      'class PeerMatcher { findMatch(student) }',
      'const doubt = await db.doubt.resolve(id)',
      'RAGContext.retrieveDocuments(query)',
      'python -m uvicorn backend.main:app',
      'const response = await fetch("/api/ocr")',
      'AdaptiveQuiz.increaseComplexity()',
      'SpeechToText.transcribeAudio(wave)',
      'DonutOCR.solveImage(uploadedPDF)',
      'useTutorSession(studentId, "hi-IN")',
      'loss.backward(); optimizer.step()',
      'export const dynamic = "force-dynamic"',
    ];

    setChips(
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        text: snippets[i % snippets.length],
        left: `${1 + ((i * 17 + i * i * 3) % 94)}%`,
        bottom: `${-8 + (i * 11) % 50}%`,
        delay: `${((i * 1.3) % 14).toFixed(1)}s`,
        duration: `${13 + (i * 1.7) % 11}s`,
        opacity: 0.12 + (i % 6) * 0.04,
        fontSize: `${11 + (i % 4) * 2}px`,
      }))
    );
  }, []);

  if (chips.length === 0) return null;

  return (
    <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden select-none">
      {chips.map((chip) => (
        <div
          key={chip.id}
          className="absolute font-mono text-indigo-300 whitespace-nowrap"
          style={{
            left: chip.left,
            bottom: chip.bottom,
            fontSize: chip.fontSize,
            opacity: chip.opacity,
            animation: `float-code-up ${chip.duration} ease-in-out ${chip.delay} infinite`,
            willChange: 'transform, opacity',
            // @ts-ignore
            '--chip-opacity': chip.opacity,
          }}
        >
          {chip.text}
        </div>
      ))}
    </div>
  );
}

// ── Concentric pulse rings ──
function PulseRings() {
  return (
    <div className="absolute inset-0 z-[2] pointer-events-none">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="intro-pulse-ring"
          style={{
            width: 320 + i * 130,
            height: 320 + i * 130,
            animation: `pulse-ring ${3.2 + i * 0.55}s ease-out ${i * 0.9}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ── Orbital ring ──
function OrbitalRing({ size, duration, delay, color }: {
  size: number; duration: number; delay: number; color: string;
}) {
  return (
    <motion.div
      className="absolute rounded-full border"
      style={{
        width: size, height: size,
        borderColor: color,
        top: '50%', left: '50%',
        marginTop: -size / 2, marginLeft: -size / 2,
      }}
      initial={{ opacity: 0, scale: 0.75 }}
      animate={{ opacity: 0.18, scale: 1, rotate: 360 }}
      transition={{
        opacity: { delay, duration: 1.4, ease: [0.16, 1, 0.3, 1] },
        scale:   { delay, duration: 1.4, ease: [0.16, 1, 0.3, 1] },
        rotate:  { delay, duration, repeat: Infinity, ease: 'linear' },
      }}
    />
  );
}

// ── Orbital node icon ──
function OrbitalNode({ orbitSize, duration, delay, icon, label }: {
  orbitSize: number; duration: number; delay: number; icon: string; label: string;
}) {
  return (
    <motion.div
      className="absolute z-10"
      style={{ top: '50%', left: '50%', marginTop: -20, marginLeft: -20 }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay + 0.1, type: 'spring', stiffness: 90, damping: 14 }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration, repeat: Infinity, ease: 'linear', delay }}
        style={{ transformOrigin: '20px 20px' }}
      >
        <motion.div
          style={{ transform: `translateX(${orbitSize / 2}px)` }}
          animate={{ rotate: -360 }}
          transition={{ duration, repeat: Infinity, ease: 'linear', delay }}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 backdrop-blur-sm flex items-center justify-center text-sm group relative cursor-default">
            <span>{icon}</span>
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-indigo-300/60 font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {label}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ── Telemetry HUD overlay ──
function TelemetryHUD() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
      <svg className="w-[320px] h-[320px] absolute opacity-25 animate-spin-clockwise" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="46" stroke="#6366f1" strokeWidth="0.5" strokeDasharray="3 4 1 2" fill="none" />
        <circle cx="50" cy="50" r="42" stroke="#06b6d4" strokeWidth="1" strokeDasharray="0.5 5" fill="none" />
      </svg>
      <svg className="w-[240px] h-[240px] absolute opacity-35 animate-spin-counter" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" stroke="#8b5cf6" strokeWidth="0.5" strokeDasharray="8 20" fill="none" />
        <line x1="50" y1="4"  x2="50" y2="9"  stroke="#8b5cf6" strokeWidth="0.5" />
        <line x1="50" y1="91" x2="50" y2="96" stroke="#8b5cf6" strokeWidth="0.5" />
        <line x1="4"  y1="50" x2="9"  y2="50" stroke="#8b5cf6" strokeWidth="0.5" />
        <line x1="91" y1="50" x2="96" y2="50" stroke="#8b5cf6" strokeWidth="0.5" />
      </svg>
      <svg className="w-[180px] h-[180px] absolute opacity-30 animate-spin-clockwise" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" stroke="#06b6d4" strokeWidth="0.5" strokeDasharray="40 10 5 15" fill="none" />
      </svg>
      <div className="absolute w-[290px] h-[290px] animate-spin-clockwise opacity-20 text-[7px] font-mono text-cyan-400 flex items-center justify-center">
        <span className="absolute top-1 -translate-x-1/2 left-1/2">[ CORE_RADAR: ACTIVE ]</span>
        <span className="absolute bottom-1 rotate-180 -translate-x-1/2 left-1/2">[ 180.00° / NEURAL_L ]</span>
      </div>
    </div>
  );
}

// ── Loading bar with terminal status ──
function LoadingSequence({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);

  const statusMessages = [
    'Initializing neural pathways...',
    'Loading AI models...',
    'Connecting peer networks...',
    'Calibrating learning algorithms...',
    'System ready.',
  ];

  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.random() * 18 + 7;
        if (next >= 100) {
          clearInterval(interval);
          setStatusIdx(statusMessages.length - 1);
          setTimeout(() => onCompleteRef.current(), 280);
          return 100;
        }
        setStatusIdx(Math.min(
          Math.floor((next / 100) * statusMessages.length),
          statusMessages.length - 2
        ));
        return next;
      });
    }, 210);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      className="w-full max-w-md space-y-3"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: 0.1, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Progress bar */}
      <div className="h-[2px] bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)',
            boxShadow: '0 0 12px rgba(99,102,241,0.7), 0 0 32px rgba(99,102,241,0.25)',
          }}
        />
      </div>
      {/* Terminal status */}
      <div className="flex justify-between items-center font-mono">
        <span className="text-xs text-cyan-400/70 tracking-wide typing-cursor">
          <span className="text-indigo-400/40 mr-1">$</span>
          {statusMessages[statusIdx]}
        </span>
        <span className="text-xs text-indigo-400/80 font-bold tabular-nums">
          {Math.round(progress)}%
        </span>
      </div>
    </motion.div>
  );
}

// ── Feature pill chips ──
function FeatureChip({ icon, label, delay }: { icon: string; label: string; delay: number }) {
  return (
    <motion.div
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm"
      initial={{ opacity: 0, scale: 0.75, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 130, damping: 16 }}
    >
      <span className="text-sm">{icon}</span>
      <span className="text-xs text-indigo-300/70 font-medium">{label}</span>
    </motion.div>
  );
}

// ── Smooth GPU-only letter stagger title (replaces DecrambleText) ──
// Uses transform (translateY) + opacity only — both compositor-only, zero layout cost.
const letterVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.75 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

function SmoothTitle({
  text,
  delay = 0,
  className = '',
}: {
  text: string;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.span
      className={className}
      style={{ display: 'inline-block' }}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: { staggerChildren: 0.042, delayChildren: delay },
        },
      }}
    >
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          variants={letterVariants}
          transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'inline-block', transformOrigin: 'bottom center' }}
        >
          {char === ' ' ? '\u00a0' : char}
        </motion.span>
      ))}
    </motion.span>
  );
}

// ════════════════════════════════════════════
// MAIN INTRO PAGE
// ════════════════════════════════════════════
export default function IntroPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'loading' | 'ready'>('loading');
  const [isWarping, setIsWarping] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleLoadComplete = useCallback(() => {
    setPhase('ready');
  }, []);

  const handleLaunch = useCallback(() => {
    if (isWarping || isExiting) return;
    setIsWarping(true);
    // Timeline:
    //  0ms   → particles warp, center logo zooms in
    //  800ms  → trigger smooth container zoom-out & fade exit transition
    //  1400ms → route push
    setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => router.push('/home'), 600);
    }, 800);
  }, [isWarping, isExiting, router]);

  // Auto-launch 3s after content is ready
  useEffect(() => {
    if (phase === 'ready' && !isWarping && !isExiting) {
      const t = setTimeout(handleLaunch, 3000);
      return () => clearTimeout(t);
    }
  }, [phase, isWarping, isExiting, handleLaunch]);

  return (
    <AnimatePresence>
      <motion.div
        className="intro-bg min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
        animate={{
          opacity: isExiting ? 0 : 1,
          scale:  isExiting ? 1.12 : 1,
          filter: isExiting ? 'blur(24px)' : 'blur(0px)',
        }}
        transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
      >
        {/* ── Layer 0: Canvas particles ── */}
        <ParticleField isWarping={isWarping} />

        {/* ── Layer 1: Code rain + floating chips ── */}
        <DataStreams />
        <FloatingCodeChips />

        {/* ── Layer 2: Pulse rings ── */}
        <PulseRings />

        {/* ── Hex grid ── */}
        <div className="hex-grid" />

        {/* ── Radial spotlight ── */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: '900px', height: '900px',
              background: 'radial-gradient(circle, rgba(99,102,241,0.11) 0%, rgba(139,92,246,0.05) 40%, transparent 68%)',
            }}
          />
        </div>

        {/* ── Scan line ── */}
        <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden opacity-[0.028]">
          <div
            className="w-full h-[2px] bg-indigo-400"
            style={{ animation: 'scan-line 4.5s linear infinite' }}
          />
        </div>

        {/* ── Main content ── */}
        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl">

          {/* Orbital system */}
          <div className="relative mb-10" style={{ width: 300, height: 300 }}>
            {phase === 'ready' && (
              <motion.div
                className="absolute inset-0 animate-cyber-pulse"
                animate={{ opacity: isWarping ? 0 : 1, scale: isWarping ? 0.45 : 1 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              >
                <TelemetryHUD />
                <OrbitalRing size={280} duration={26} delay={0.1} color="rgba(99,102,241,0.22)" />
                <OrbitalRing size={200} duration={18} delay={0.3} color="rgba(139,92,246,0.16)" />
                <OrbitalRing size={120} duration={12} delay={0.5} color="rgba(6,182,212,0.12)" />
                <OrbitalNode orbitSize={280} duration={26} delay={0.1} icon="🤖" label="AI Tutor" />
                <OrbitalNode orbitSize={200} duration={18} delay={0.3} icon="📊" label="Analytics" />
                <OrbitalNode orbitSize={200} duration={18} delay={0.6} icon="👥" label="Peers" />
                <OrbitalNode orbitSize={120} duration={12} delay={0.8} icon="📝" label="Quiz" />
              </motion.div>
            )}

            {/* Center logo — scales to fill screen on warp */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
              initial={{ opacity: 0, scale: 0.4, rotate: -180 }}
              animate={{
                opacity: 1,
                scale:  isWarping ? 22 : 1,
                rotate: isWarping ? 135 : 0,
              }}
              transition={{
                delay:    isWarping ? 0 : 0.3,
                duration: isWarping ? 1.05 : 1.1,
                ease:     [0.16, 1, 0.3, 1],
              }}
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg animate-pulse-glow relative animate-cyber-pulse">
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
                      transition={{ repeat: Infinity, duration: 14, ease: 'linear' }}
                    />
                  </>
                )}
                <motion.span
                  className="text-3xl select-none"
                  animate={{ opacity: isWarping ? 0 : 1 }}
                  transition={{ duration: 0.12 }}
                >
                  🎓
                </motion.span>
              </div>
            </motion.div>
          </div>

          {/* Text block — fades away during warp */}
          <motion.div
            className="flex flex-col items-center"
            animate={{ opacity: isWarping ? 0 : 1, y: isWarping ? 28 : 0 }}
            transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Title: smooth letter-by-letter stagger, GPU-only transforms */}
            <motion.div
              className="space-y-2 mb-5"
              initial={{ opacity: 0 }}
              animate={phase === 'ready' ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.01 }}     // near-instant container reveal; children drive it
            >
              <h1
                className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight select-none"
                style={{ perspective: '600px' }}
              >
                {phase === 'ready' ? (
                  <SmoothTitle
                    text="EduBridge"
                    delay={0.05}
                    className="intro-title-gradient"
                  />
                ) : (
                  <span className="intro-title-gradient">EduBridge</span>
                )}
                {' '}
                {phase === 'ready' ? (
                  <SmoothTitle
                    text="AI"
                    delay={0.52}
                    className="intro-ai-gradient text-4xl sm:text-5xl lg:text-6xl font-light"
                  />
                ) : (
                  <span className="intro-ai-gradient text-4xl sm:text-5xl lg:text-6xl font-light">AI</span>
                )}
              </h1>
            </motion.div>

            {/* Tagline */}
            <motion.p
              className="text-base sm:text-lg text-indigo-300/50 font-light max-w-xl mb-7 leading-relaxed select-none"
              initial={{ opacity: 0, y: 18 }}
              animate={phase === 'ready' ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
              transition={{ delay: 0.9, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            >
              Next-generation AI-powered learning ecosystem.
              <br />
              <span className="text-indigo-400/40 text-sm tracking-wide">
                Personalized&nbsp;•&nbsp;Adaptive&nbsp;•&nbsp;Inclusive
              </span>
            </motion.p>

            {/* Feature chips */}
            {phase === 'ready' && (
              <div className="flex flex-wrap gap-3 justify-center mb-6 select-none">
                <FeatureChip icon="💬" label="AI Tutor"         delay={1.1} />
                <FeatureChip icon="📈" label="Adaptive Learning" delay={1.22} />
                <FeatureChip icon="👥" label="Peer Matching"     delay={1.34} />
                <FeatureChip icon="🏫" label="Smart Resources"   delay={1.46} />
              </div>
            )}
          </motion.div>

          {/* Loading sequence */}
          <AnimatePresence mode="wait">
            {phase === 'loading' && (
              <LoadingSequence key="loader" onComplete={handleLoadComplete} />
            )}
          </AnimatePresence>
        </div>

        {/* Bottom meta bar */}
        <motion.div
          className="absolute bottom-6 left-0 right-0 flex justify-center gap-8 text-[10px] text-indigo-400/30 font-mono tracking-wider uppercase z-10 select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.5 }}
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
