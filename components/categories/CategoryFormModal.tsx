'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Category } from '@/lib/types';
import { EmojiPicker } from './EmojiPicker';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Emoji } from '@/components/ui/Emoji';

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#ec4899', '#f43f5e', '#78716c', '#64748b',
];

interface CategoryFormModalProps {
  category?: Category;
  fixedParentId?: string;
  parentCategories: Category[];
  onClose: () => void;
  onSaved: (category: Category) => void;
}

export function CategoryFormModal({
  category,
  fixedParentId,
  parentCategories,
  onClose,
  onSaved,
}: CategoryFormModalProps) {
  const { user } = useAuth();
  const isEdit = !!category;

  const [name, setName] = useState(category?.name ?? '');
  const [emoji, setEmoji] = useState(category?.icon ?? '📦');
  const [color, setColor] = useState(category?.color ?? '#8b5cf6');
  const [parentId, setParentId] = useState(
    fixedParentId ?? category?.parent_id ?? ''
  );
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
      const payload = {
        name: name.trim(),
        icon: emoji,
        color,
        parent_id: parentId || null,
      };

      let data: Category;
      if (isEdit) {
        const { data: updated, error: dbError } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', category.id)
          .select()
          .single();
        if (dbError) throw dbError;
        data = updated;
      } else {
        const { data: created, error: dbError } = await supabase
          .from('categories')
          .insert({ user_id: user!.id, ...payload })
          .select()
          .single();
        if (dbError) throw dbError;
        data = created;
      }

      onSaved(data);
    } catch {
      setError('Error al guardar. Intentá de nuevo.');
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

      <BottomSheet onClose={onClose}>
        <div>
          <h2 className="text-white font-semibold text-lg mb-6">
            {isEdit ? 'Editar categoría' : 'Nueva categoría'}
          </h2>

          {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setShowEmojiPicker(true)}
              className="w-14 h-14 flex items-center justify-center rounded-xl flex-shrink-0 transition active:scale-90"
              style={{ backgroundColor: color }}
            >
              <Emoji emoji={emoji} size={30} />
            </button>
            <input
              type="text"
              placeholder="Nombre..."
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              className={`flex-1 px-4 bg-slate-800 border rounded-xl text-white placeholder-slate-500 focus:outline-none transition ${
                error ? 'border-red-500' : 'border-slate-700 focus:border-violet-500'
              }`}
              autoFocus
            />
          </div>

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

          {!fixedParentId && parentCategories.length > 0 && (
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

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-xl transition"
          >
            {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear categoría'}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
