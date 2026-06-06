'use client';

import { cn } from '@/lib/cn';

interface CardProps {
  title: string;
  value: string;
  icon?: string;
  subtitle?: string;
  className?: string;
}

export function Card({ title, value, icon, subtitle, className }: CardProps) {
  return (
    <div
      className={cn(
        'tech-card p-6 group',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-black mt-2 dark:text-white tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
