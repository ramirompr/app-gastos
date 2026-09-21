import { PlusIcon } from '@/components/icons/PlusIcon';

interface DonutSlice {
  color: string;
  value: number;
}

interface DonutChartProps {
  slices: DonutSlice[];
  centerLabel: string;
  onAddClick: () => void;
}

const SIZE = 220;
const STROKE = 30;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const PAD = 24;
const WRAPPER = SIZE + PAD * 2;
// Pequeño solapamiento entre segmentos para tapar la costura de anti-aliasing
// que algunos navegadores mobile dejan ver entre dos <circle> con dasharray
// contiguos (se nota como una línea fina del color de fondo cortando el arco).
const SEAM_OVERLAP = 1.5;

export function DonutChart({ slices, centerLabel, onAddClick }: DonutChartProps) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  let cumulative = 0;
  const arcs = slices.map((slice, i) => {
    const fraction = total > 0 ? slice.value / total : 0;
    const dash = fraction * CIRCUMFERENCE;
    const offset = cumulative * CIRCUMFERENCE;
    cumulative += fraction;
    return { ...slice, dash, offset, key: i };
  });

  return (
    <div className="relative flex items-center justify-center" style={{ width: WRAPPER, height: WRAPPER }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="#1e293b"
          strokeWidth={STROKE}
        />
        {total > 0 &&
          arcs.map((arc) => (
            <circle
              key={arc.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={arc.color}
              strokeWidth={STROKE}
              strokeDasharray={`${arc.dash + SEAM_OVERLAP} ${CIRCUMFERENCE - arc.dash}`}
              strokeDashoffset={-arc.offset}
            />
          ))}
      </svg>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <p className="text-white font-bold text-xl px-4 text-center break-words">{centerLabel}</p>
      </div>

      <button
        onClick={onAddClick}
        aria-label="Añadir movimiento"
        className="absolute bottom-0 right-0 w-12 h-12 bg-amber-400 hover:bg-amber-300 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all"
      >
        <PlusIcon className="text-slate-900" />
      </button>
    </div>
  );
}
