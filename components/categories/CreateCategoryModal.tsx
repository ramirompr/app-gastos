'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Category } from '@/lib/types';
import { EmojiPicker } from './EmojiPicker';

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#ec4899', '#f43f5e', '#78716c', '#64748b',
];

interface CreateCategoryModalProps {
  parentCategories: Category[];
  onClose: () => void;
  onCreated: (category: Category) => void;
}

export function CreateCategoryModal({ parentCategories, onClose, onCreated }: CreateCategoryModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📦');
  const [color, setColor] = useState('#8b5cf6');
  const [parentId, setParentId] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Ingresá un nombre');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: dbError } = await supabase
        .from('categories')
        .insert({
          user_id: user!.id,
          name: name.trim(),
          icon: emoji,
          color,
          parent_id: parentId || null,
        })
        .select()
        .single();
      if (dbError) throw dbError;
      onCreated(data);
    } catch {
      setError('Error al crear la categoría. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showEmojiPicker && (
        <EmojiPicker
          onSelect={(e) => { setEmoji(e); setShowEmojiPicker(false); }}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}

      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 rounded-t-2xl border-t border-slate-800">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-700 rounded-full" />
        </div>

        <div className="px-6 pt-4 pb-10">
          <h2 className="text-white font-semibold text-lg mb-6">Nueva categoría</h2>

          {/* Emoji + nombre */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setShowEmojiPicker(true)}
              className="w-14 h-14 flex items-center justify-center text-2xl rounded-xl flex-shrink-0 transition active:scale-90"
              style={{ backgroundColor: color }}
            >
              {emoji}
            </button>
            <input
              type="text"
              placeholder="Nombre..."
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              className="flex-1 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none transition"
              autoFocus
            />
          </div>

          {/* Color */}
          <div className="mb-6">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Color</p>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full transition-all active:scale-90"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? '3px solid white' : '3px solid transparent',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Subcategoría de (solo si hay categorías padre) */}
          {parentCategories.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">
                Subcategoría de
              </p>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-violet-500 focus:outline-none transition"
              >
                <option value="">Ninguna (categoría principal)</option>
                {parentCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-xl transition"
          >
            {loading ? 'Creando...' : 'Crear categoría'}
          </button>
        </div>
      </div>
    </>
  );
}
