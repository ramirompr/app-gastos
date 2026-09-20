'use client';

import { ChevronLeftIcon } from '@/components/icons/ChevronLeftIcon';
import { Menu } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  onMenu: () => void;
  /** Botones extra (ej. descargar) que se muestran a la izquierda del menú. */
  actions?: React.ReactNode;
}

export function PageHeader({ title, onBack, onMenu, actions }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur-sm">
      <div className="relative flex items-center max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4 min-h-[3.5rem]">
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
        <div className="ml-auto flex items-center gap-4 z-10 flex-shrink-0">
          {actions}
          <button onClick={onMenu} aria-label="Menú" className="text-white">
            <Menu size={24} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
