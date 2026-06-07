'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Loader } from '@/components/ui/Loader';

export default function ChatRouterPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      const t = setTimeout(() => {
        if (!useAuthStore.getState().user) {
          router.replace('/login');
        }
      }, 300);
      return () => clearTimeout(t);
    } else {
      if (user.role === 'teacher') {
        router.replace('/chat/teacher');
      } else {
        router.replace('/chat/student');
      }
    }
  }, [user, router]);

  return (
    <div className="h-screen flex items-center justify-center bg-[#050b18] text-white">
      <div className="flex flex-col items-center gap-4">
        <Loader />
        <span className="text-sm font-semibold tracking-wider text-indigo-400 animate-pulse font-mono">
          Syncing chat environment...
        </span>
      </div>
    </div>
  );
}
