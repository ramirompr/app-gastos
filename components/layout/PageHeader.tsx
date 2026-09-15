'use client';

import { ChevronLeftIcon } from '@/components/icons/ChevronLeftIcon';

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  onMenu: () => void;
}

export function PageHeader({ title, onBack, onMenu }: PageHeaderProps) {
  return (
    <div className="relative flex items-center px-4 pt-6 pb-4 min-h-[3.5rem]">
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Volver"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-800 text-white z-10 flex-shrink-0"
        >
          <ChevronLeftIcon />
        </button>
      )}
      <h1 className="absolute inset-0 flex items-center justify-center px-16 text-xl font-bold text-white pointer-events-none truncate">
        {title}
      </h1>
      <button
        onClick={onMenu}
        aria-label="Menú"
        className="ml-auto text-white text-2xl leading-none z-10 flex-shrink-0"
      >
        ☰
      </button>
    </div>
  );
}
