'use client';

import { Emoji } from '@/components/ui/Emoji';
import { X } from 'lucide-react';

const EMOJI_GROUPS = [
  {
    label: 'Comida',
    emojis: ['🍕', '🍔', '🌮', '🍣', '☕', '🥤', '🍺', '🍷', '🍎', '🥗', '🍜', '🧁'],
  },
  {
    label: 'Transporte',
    emojis: ['🚗', '🚕', '🚌', '🚂', '✈️', '🚴', '⛽', '🅿️', '🛵', '🚁'],
  },
  {
    label: 'Entretenimiento',
    emojis: ['🎮', '🎬', '🎵', '🎤', '⚽', '🏋️', '📚', '🎨', '🎭', '🎲'],
  },
  {
    label: 'Casa',
    emojis: ['🏠', '🛋️', '🔧', '🧹', '⚡', '💡', '🐕', '🌱', '🔥', '🚿'],
  },
  {
    label: 'Compras',
    emojis: ['🛍️', '👕', '👞', '💄', '📱', '💍', '⌚', '🧩', '📖', '🎒'],
  },
  {
    label: 'Salud',
    emojis: ['💊', '🦷', '🏥', '❤️', '💪', '🧠', '🩺', '🧘'],
  },
  {
    label: 'Finanzas',
    emojis: ['💰', '🏦', '📈', '💳', '💸', '📋', '💵', '👛'],
  },
  {
    label: 'Otros',
    emojis: ['🎁', '🎉', '💼', '🎓', '📺', '❓', '⭐', '👥', '🏖️', '🧳'],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950 sm:items-center sm:justify-center sm:bg-black/60 sm:p-4">
      <div className="flex flex-col flex-1 min-h-0 w-full sm:flex-none sm:w-full sm:max-w-lg sm:h-[85vh] sm:rounded-2xl sm:border sm:border-slate-800 sm:shadow-2xl bg-slate-950 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800 flex-shrink-0">
          <h3 className="text-white font-semibold">Elegí un ícono</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {EMOJI_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                {group.label}
              </p>
              <div className="grid grid-cols-8 gap-2">
                {group.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => onSelect(emoji)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-90 transition-all"
                  >
                    <Emoji emoji={emoji} size={24} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
