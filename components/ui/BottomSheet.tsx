'use client';

import { ReactNode, useEffect, useState } from 'react';

interface BottomSheetProps {
  onClose: () => void;
  children: ReactNode;
  /** Clases extra para el panel (ej. max-h-[90vh] overflow-y-auto en formularios largos). */
  panelClassName?: string;
  /** Para un BottomSheet abierto arriba de otro BottomSheet (ej. un picker dentro de un formulario). */
  stacked?: boolean;
}

const TRANSITION_MS = 300;

/** Overlay + panel deslizable desde abajo, usado por todos los action sheets de la app. */
export function BottomSheet({ onClose, children, panelClassName = '', stacked = false }: BottomSheetProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, TRANSITION_MS);
  };

  return (
    <>
      <div
        className={`fixed inset-0 ${stacked ? 'z-[60]' : 'z-40'} bg-black/60 transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />
      <div
        className={`fixed bottom-0 left-0 right-0 ${stacked ? 'z-[70]' : 'z-50'} bg-slate-900 rounded-t-2xl border-t border-slate-800 transition-transform duration-300 ease-out ${
          visible ? 'translate-y-0' : 'translate-y-full'
        } ${panelClassName}`}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-700 rounded-full" />
        </div>
        <div className="px-6 pt-3 pb-10">{children}</div>
      </div>
    </>
  );
}
