'use client';

import { useState } from 'react';

interface ExpenseRowMenuProps {
  label: string;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}

type Sheet = 'menu' | 'confirm' | null;

export function ExpenseRowMenu({ label, onEdit, onDelete }: ExpenseRowMenuProps) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
      setSheet(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setSheet('menu');
        }}
        aria-label="Opciones"
        className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-700 transition text-lg leading-none flex-shrink-0"
      >
        ⋮
      </button>

      {sheet && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setSheet(null)} />

          {sheet === 'menu' && (
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 rounded-t-2xl border-t border-slate-800">
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-slate-700 rounded-full" />
              </div>
              <div className="px-6 pt-3 pb-10">
                <button
                  onClick={() => {
                    setSheet(null);
                    onEdit();
                  }}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-slate-800 transition text-left"
                >
                  <span className="text-xl">✏️</span>
                  <span className="text-white font-medium">Editar</span>
                </button>
                <button
                  onClick={() => setSheet('confirm')}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-slate-800 transition text-left"
                >
                  <span className="text-xl">🗑️</span>
                  <span className="text-red-400 font-medium">Eliminar</span>
                </button>
              </div>
            </div>
          )}

          {sheet === 'confirm' && (
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 rounded-t-2xl border-t border-slate-800">
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-slate-700 rounded-full" />
              </div>
              <div className="px-6 pt-3 pb-10">
                <p className="text-white font-semibold text-lg mb-2">¿Eliminar &quot;{label}&quot;?</p>
                <p className="text-slate-400 text-sm mb-6">Esta acción no se puede deshacer.</p>
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
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
