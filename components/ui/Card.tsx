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
        'bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold mt-2 dark:text-white">{value}</p>
          {subtitle && (
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{subtitle}</p>
          )}
        </div>
        {icon && <span className="text-3xl">{icon}</span>}
      </div>
    </div>
  );
}
