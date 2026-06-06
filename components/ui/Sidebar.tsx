'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/authStore';

const menuItems = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
  { label: 'AI Chat', href: '/chat', icon: '💬' },
  { label: 'Quiz', href: '/quiz', icon: '📝' },
  { label: 'Notes', href: '/notes', icon: '📚' },
  { label: 'Events', href: '/events', icon: '📅' },
  { label: 'Resource Allocator', href: '/resources', icon: '🏢' },
  { label: 'Peer Matching', href: '/peers', icon: '👥' },
  { label: 'Admin', href: '/admin', icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuthStore();

  return (
    <aside className="w-64 sidebar-premium h-screen sticky top-0 overflow-y-auto flex flex-col justify-between">
      <div>
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

        <nav className="p-3 space-y-1 pb-24">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
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

      <div className="p-4 border-t border-indigo-500/10 bg-surface">
        <button
          onClick={logout}
          suppressHydrationWarning={true}
          className="w-full px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition-all text-sm font-medium"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
