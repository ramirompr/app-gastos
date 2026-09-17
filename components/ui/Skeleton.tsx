/** Bloque gris pulsante genérico, base de todos los esqueletos de carga. */
export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-800 rounded-lg ${className}`} />;
}

/** Fila tipo "ícono + dos líneas de texto + monto", la forma más común en la app. */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 bg-slate-800/60 rounded-xl px-4 py-3">
      <SkeletonBlock className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-2 py-0.5">
        <SkeletonBlock className="h-3.5 w-2/3" />
        <SkeletonBlock className="h-3 w-1/3" />
      </div>
      <SkeletonBlock className="h-4 w-14 flex-shrink-0" />
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

/** Tarjeta cuadrada tipo categoría (ícono + nombre centrados). */
export function SkeletonGridCard() {
  return (
    <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4 flex flex-col items-center gap-3">
      <SkeletonBlock className="w-14 h-14 rounded-2xl" />
      <SkeletonBlock className="h-3 w-16" />
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonGridCard key={i} />
      ))}
    </div>
  );
}

/** Círculo tipo donut chart, para la pantalla principal. */
export function SkeletonCircle({ size = 220 }: { size?: number }) {
  return (
    <div
      className="rounded-full animate-pulse bg-slate-800"
      style={{ width: size, height: size }}
    />
  );
}
