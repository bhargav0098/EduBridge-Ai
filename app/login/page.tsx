'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { email: '', password: '', remember: false },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const [view, setView] = useState<'login' | 'forgot'>('login');
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [demoOtp, setDemoOtp] = useState('');

  // ── Forgot password flow ─────────────────────────────────────────────────
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      if (forgotStep === 1) {
        if (!forgotEmail) { setForgotError('Email is required'); setIsLoading(false); return; }
        const res = await fetch('/api/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail.trim() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setForgotError(data.error || data.detail || 'Failed to send OTP. Please try again.');
          return;
        }
        const otp = data.demo_otp || '';
        setDemoOtp(otp);
        setForgotSuccess(otp
          ? `OTP sent! (Dev mode — your code is: ${otp})`
          : 'A verification code has been sent to your email.');
        setForgotStep(2);
      } else {
        if (!forgotOtp || !forgotNewPassword) { setForgotError('Both OTP and new password are required'); setIsLoading(false); return; }
        if (forgotNewPassword.length < 6) { setForgotError('Password must be at least 6 characters'); setIsLoading(false); return; }
        const res = await fetch('/api/reset-password/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail.trim(), otp: forgotOtp, new_password: forgotNewPassword }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setForgotError(data.error || data.detail || 'Failed to reset password. Check your OTP.');
          return;
        }
        setForgotSuccess('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          setView('login');
          setForgotStep(1);
          setForgotEmail(''); setForgotOtp(''); setForgotNewPassword('');
          setForgotSuccess(''); setForgotError('');
        }, 2000);
      }
    } catch (err) {
      setForgotError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Login flow ────────────────────────────────────────────────────────────
  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setApiError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email.trim(), password: data.password, remember: !!data.remember }),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        setApiError(resData.error || resData.detail || resData.message || 'Login failed. Please check your credentials.');
        return;
      }
      // Persist to zustand
      const { useAuthStore } = await import('@/store/authStore');
      useAuthStore.setState({
        user: resData.user,
        token: resData.access_token || resData.token || null,
        remember: !!data.remember,
      });
      router.push('/dashboard');
    } catch (error) {
      setApiError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden intro-bg">
      <div className="hex-grid" />
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-indigo-500/[0.06] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/[0.05] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md p-4">
        <div className="glass rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg mx-auto mb-4">
              <span className="text-2xl">🎓</span>
            </div>
            <h1 className="text-3xl font-black gradient-text">EduBridge</h1>
            <p className="text-primary-light/50 mt-2 text-sm">
              {view === 'login' ? 'Sign in to your AI Learning Platform' : 'Reset your account password'}
            </p>
          </div>

          {/* Error / success banners */}
          {apiError && view === 'login' && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">
              {apiError}
            </div>
          )}
          {forgotError && view === 'forgot' && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">
              {forgotError}
            </div>
          )}
          {forgotSuccess && view === 'forgot' && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl mb-4 text-sm animate-pulse">
              {forgotSuccess}
            </div>
          )}

          {view === 'login' ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="your@email.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email format' },
                })}
                error={errors.email?.message as string}
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Min 6 characters' },
                })}
                error={errors.password?.message as string}
              />
              <label className="flex items-center gap-2 text-sm text-text-secondary/60">
                <input type="checkbox" {...register('remember')} className="w-4 h-4 rounded" />
                <span>Remember me</span>
              </label>
              <Button type="submit" isLoading={isLoading} className="w-full">
                Sign In
              </Button>
            </form>
          ) : (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              {forgotStep === 1 ? (
                <>
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="your@email.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                  <Button type="submit" isLoading={isLoading} className="w-full">
                    Send Verification Code
                  </Button>
                </>
              ) : (
                <>
                  <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl text-xs text-indigo-300 font-mono mb-2">
                    Email: <span className="text-white">{forgotEmail}</span>
                  </div>
                  {demoOtp && (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-4 py-2 rounded-xl text-xs font-mono">
                      Dev OTP: <span className="text-white font-bold tracking-widest">{demoOtp}</span>
                    </div>
                  )}
                  <Input
                    label="Verification Code (OTP)"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    required
                  />
                  <Input
                    label="New Password"
                    type="password"
                    placeholder="••••••••"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    required
                  />
                  <Button type="submit" isLoading={isLoading} className="w-full">
                    Reset Password
                  </Button>
                </>
              )}
            </form>
          )}

          <div className="mt-6 flex flex-col items-center gap-2">
            {view === 'login' ? (
              <>
                <p className="text-center text-sm text-text-secondary/50">
                  Don&apos;t have an account?{' '}
                  <Link href="/register" className="text-indigo-400 font-semibold hover:text-primary-light transition-colors">
                    Sign up
                  </Link>
                </p>
                <button
                  type="button"
                  onClick={() => { setView('forgot'); setForgotStep(1); setForgotError(''); setForgotSuccess(''); }}
                  className="text-sm text-indigo-400/60 hover:text-primary-light transition-colors"
                >
                  Forgot password?
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => { setView('login'); setForgotError(''); setForgotSuccess(''); }}
                className="text-sm text-indigo-400/60 hover:text-primary-light transition-colors"
              >
                ← Back to Login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
