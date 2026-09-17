import { ReactNode } from 'react';

interface ContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Centra el contenido de una pantalla y le pone un ancho máximo, para que no
 * se estire de borde a borde en tablet/desktop. Reemplaza el clásico
 * `<div className="px-4 ...">` suelto en cada página — ver la sección
 * "Responsive" de DESIGN_SYSTEM.md antes de usar otro patrón.
 */
export function Container({ children, className = '' }: ContainerProps) {
  return (
    <div className={`w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
  );
}
