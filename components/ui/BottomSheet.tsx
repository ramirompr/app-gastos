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
        className={`fixed inset-x-0 bottom-0 sm:inset-x-auto sm:left-1/2 sm:bottom-8 sm:-translate-x-1/2 sm:w-full sm:max-w-lg ${
          stacked ? 'z-[70]' : 'z-50'
        } bg-slate-900 rounded-t-2xl sm:rounded-2xl border-t sm:border border-slate-800 sm:shadow-2xl transition-transform duration-300 ease-out ${
          visible ? 'translate-y-0' : 'translate-y-full'
        } ${panelClassName}`}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-slate-700 rounded-full" />
        </div>
        <div className="px-6 pt-3 pb-10 sm:pt-6 sm:pb-8">{children}</div>
      </div>
    </>
  );
}
