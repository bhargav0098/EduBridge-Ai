'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/authStore';
import { Suspense } from 'react';

const studentMenuItems = [
  { label: 'Dashboard',        href: '/dashboard',  icon: '📊' },
  { label: 'AI Chat',          href: '/chat/student', icon: '💬' },
  { label: 'Quiz',             href: '/quiz',       icon: '📝' },
  { label: 'Notes',            href: '/notes',      icon: '📚' },
  { label: 'Events',           href: '/events',     icon: '📅' },
  { label: 'Resources',        href: '/resources',  icon: '🏢' },
  { label: 'Peer Matching',    href: '/peers',      icon: '👥' },
];

const teacherMenuItems = [
  { label: 'Dashboard',        href: '/dashboard',  icon: '📊' },
  { label: 'AI Chat',          href: '/chat/teacher', icon: '💬' },
  { label: 'Classes',          href: '/dashboard',  icon: '🏫', tab: 'classes'    },
  { label: 'Mark Attendance',  href: '/dashboard',  icon: '📅', tab: 'attendance' },
  { label: 'Student Roster',   href: '/dashboard',  icon: '👥', tab: 'students'   },
  { label: 'Upload Materials', href: '/dashboard',  icon: '📤', tab: 'upload'     },
  { label: 'Events',           href: '/events',     icon: '🎉' },
  { label: 'Admin',            href: '/admin',      icon: '⚙️' },
];

export function Sidebar() {
  return (
    <Suspense fallback={<aside className="w-64 sidebar-premium h-screen sticky top-0" />}>
      <SidebarContent />
    </Suspense>
  );
}

function SidebarContent() {
  const pathname  = usePathname();
  const router    = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams ? searchParams.get('tab') : null;
  const { user, logout } = useAuthStore();

  const isTeacher = user?.role === 'teacher';
  const menuItems = (isTeacher ? teacherMenuItems : studentMenuItems) as Array<{
    label: string;
    href: string;
    icon: string;
    tab?: string;
  }>;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="w-64 sidebar-premium h-screen sticky top-0 overflow-y-auto flex flex-col justify-between">
      <div>
        {/* Logo */}
        <div className="p-6 border-b border-indigo-500/10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
              <span className="text-lg">🎓</span>
            </div>
            <div>
              <h1 className="text-lg font-extrabold gradient-text">EduBridge</h1>
              <p className="text-[10px] text-indigo-300/40 font-mono tracking-wider uppercase">AI Platform</p>
            </div>
          </Link>
        </div>

        {/* Role badge */}
        {user && (
          <div className="px-5 pt-4 pb-2">
            <div className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border',
              isTeacher
                ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
            )}>
              <span>{isTeacher ? '🎓' : '📖'}</span>
              {isTeacher ? 'Teacher' : 'Student'}
            </div>
            <p className="mt-1.5 text-xs text-gray-400 truncate">{user.name}</p>
          </div>
        )}

        {/* Nav */}
        <nav className="p-3 space-y-1 pb-24">
          {menuItems.map((item) => {
            const isDashboard = item.href === '/dashboard';
            const isActive = isDashboard
              ? (pathname === '/dashboard' && (item.tab ? activeTab === item.tab : (!activeTab || activeTab === 'home' || !isTeacher)))
              : (pathname === item.href || pathname.startsWith(item.href + '/'));
            return (
              <Link
                key={item.label}
                href={item.tab ? `${item.href}?tab=${item.tab}` : item.href}
                className={cn(
                  'sidebar-item flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm',
                  isActive
                    ? 'active bg-indigo-500/10 text-white font-semibold'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'
                )}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-indigo-500/10 bg-surface">
        <button
          onClick={handleLogout}
          suppressHydrationWarning={true}
          className="w-full px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition-all text-sm font-medium"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
