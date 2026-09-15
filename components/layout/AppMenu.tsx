'use client';

import { useRouter } from 'next/navigation';
import { useCurrencyDisplay } from '@/lib/currency-display-context';

interface AppMenuProps {
  open: boolean;
  onClose: () => void;
}

const MENU_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/dashboard/categories', label: 'Categorías', icon: '🗂️' },
  { href: '/dashboard/history', label: 'Historial', icon: '🧾' },
  { href: '/dashboard/analysis', label: 'Análisis', icon: '📊' },
  { href: '/dashboard/recurring', label: 'Gastos recurrentes', icon: '🔁' },
  { href: '/dashboard/pending-payments', label: 'Pagos pendientes', icon: '💸' },
  { href: '/dashboard/pending-installments', label: 'Cuotas pendientes', icon: '📆' },
];

export function AppMenu({ open, onClose }: AppMenuProps) {
  const router = useRouter();
  const { showUsd, setShowUsd } = useCurrencyDisplay();

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-72 max-w-[80%] bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-1 transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <h2 className="text-white font-semibold text-lg mb-2">Menú</h2>

        <div className="mb-3">
          <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold mb-2 px-1">
            Ver montos en
          </p>
          <div className="flex gap-2 bg-slate-800/60 rounded-xl p-1">
            <button
              onClick={() => setShowUsd(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                !showUsd ? 'bg-violet-600 text-white' : 'text-slate-400'
              }`}
            >
              ARS
            </button>
            <button
              onClick={() => setShowUsd(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                showUsd ? 'bg-violet-600 text-white' : 'text-slate-400'
              }`}
            >
              USD
            </button>
          </div>
        </div>

        {MENU_ITEMS.map((item) => (
          <button
            key={item.href}
            onClick={() => {
              onClose();
              router.push(item.href);
            }}
            className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-800 transition text-left"
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-white font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
