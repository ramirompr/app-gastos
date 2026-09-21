'use client';

import { useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';

interface ExpenseRowMenuProps {
  label: string;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}

type Sheet = 'menu' | 'confirm' | null;

export function ExpenseRowMenu({ label, onEdit, onDelete }: ExpenseRowMenuProps) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await onDelete();
      setSheet(null);
    } catch (err) {
      console.error(err);
      setError('No se pudo eliminar. Intentá de nuevo.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    // `contents` para no alterar el layout flex de la fila, pero sí frenar acá
    // cualquier click (menú, sheet de confirmar borrado) para que no le llegue
    // al onClick={onEdit} de la fila entera (los sheets, aunque se vean fixed
    // sobre toda la pantalla, siguen siendo descendientes del DOM de la fila).
    <div className="contents" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setSheet('menu')}
        aria-label="Opciones"
        className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-700 transition flex-shrink-0"
      >
        <MoreVertical size={18} />
      </button>

      {sheet === 'menu' && (
        <BottomSheet onClose={() => setSheet(null)}>
          <button
            onClick={() => {
              setSheet(null);
              onEdit();
            }}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-slate-800 transition text-left"
          >
            <Pencil size={20} strokeWidth={1.75} className="text-slate-400" />
            <span className="text-white font-medium">Editar</span>
          </button>
          <button
            onClick={() => {
              setError('');
              setSheet('confirm');
            }}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-slate-800 transition text-left"
          >
            <Trash2 size={20} strokeWidth={1.75} className="text-red-400" />
            <span className="text-red-400 font-medium">Eliminar</span>
          </button>
        </BottomSheet>
      )}

      {sheet === 'confirm' && (
        <BottomSheet onClose={() => setSheet(null)}>
          <p className="text-white font-semibold text-lg mb-2">¿Eliminar &quot;{label}&quot;?</p>
          <p className="text-slate-400 text-sm mb-2">Esta acción no se puede deshacer.</p>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => setSheet('menu')}
              className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 py-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
