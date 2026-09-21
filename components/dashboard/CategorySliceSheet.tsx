'use client';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Emoji } from '@/components/ui/Emoji';
import { Category } from '@/lib/types';
import { formatMoney } from '@/lib/format-money';

interface CategorySliceSheetProps {
  category: Category;
  amount: number;
  percent: number;
  showUsd: boolean;
  onClose: () => void;
}

/** Popup con el detalle de una porción del donut al tocarla: categoría, % y monto del período. */
export function CategorySliceSheet({ category, amount, percent, showUsd, onClose }: CategorySliceSheetProps) {
  return (
    <BottomSheet onClose={onClose}>
      <div className="flex flex-col items-center gap-2 text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-1"
          style={{ backgroundColor: category.color }}
        >
          <Emoji emoji={category.icon} size={26} />
        </div>
        <p className="text-white font-semibold text-lg">{category.name}</p>
        <p className="text-slate-400 text-sm">{percent} % del período</p>
        <p className="text-white font-bold text-2xl mt-1">{formatMoney(amount, showUsd)}</p>
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition"
        >
          Cerrar
        </button>
      </div>
    </BottomSheet>
  );
}
