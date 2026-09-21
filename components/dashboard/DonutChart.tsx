import { PlusIcon } from '@/components/icons/PlusIcon';

interface DonutSlice {
  id: string;
  color: string;
  value: number;
}

interface DonutChartProps {
  slices: DonutSlice[];
  centerLabel: string;
  onAddClick: () => void;
  /** Se dispara al tocar un segmento del anillo (no el centro ni el botón +). */
  onSliceClick?: (id: string) => void;
}

const SIZE = 220;
const STROKE = 30;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;
const PAD = 24;
const WRAPPER = SIZE + PAD * 2;
// Solapamiento angular entre segmentos contiguos: sin esto, algunos
// navegadores mobile dejan ver una costura de anti-aliasing (una línea fina
// del color de fondo) en el borde entre dos arcos, más notoria cuanto más
// chico es el segmento. Cada arco se dibuja un poco más largo de lo que le
// corresponde para taparla.
const OVERLAP_DEG = 2;

/** Punto sobre el círculo para un ángulo en grados, medido en sentido horario desde las 12. */
function pointAt(angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER + RADIUS * Math.cos(rad), y: CENTER + RADIUS * Math.sin(rad) };
}

function arcPath(startDeg: number, endDeg: number) {
  const start = pointAt(startDeg);
  const end = pointAt(endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export function DonutChart({ slices, centerLabel, onAddClick, onSliceClick }: DonutChartProps) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const visibleSlices = slices.filter((s) => s.value > 0);

  let cumulativeDeg = 0;
  const arcs =
    total > 0
      ? visibleSlices.map((slice, i) => {
          const sweep = (slice.value / total) * 360;
          const startDeg = cumulativeDeg;
          const endDeg = cumulativeDeg + sweep;
          cumulativeDeg = endDeg;
          const overlap = visibleSlices.length > 1 ? OVERLAP_DEG : 0;
          return {
            id: slice.id,
            color: slice.color,
            startDeg: startDeg - overlap / 2,
            endDeg: endDeg + overlap / 2,
            key: i,
          };
        })
      : [];

  return (
    <div className="relative flex items-center justify-center" style={{ width: WRAPPER, height: WRAPPER }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="#1e293b"
          strokeWidth={STROKE}
        />
        {arcs.length === 1 ? (
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={arcs[0].color}
            strokeWidth={STROKE}
            className={onSliceClick ? 'cursor-pointer' : undefined}
            onClick={() => onSliceClick?.(arcs[0].id)}
          />
        ) : (
          arcs.map((arc) => (
            <path
              key={arc.key}
              d={arcPath(arc.startDeg, arc.endDeg)}
              fill="none"
              stroke={arc.color}
              strokeWidth={STROKE}
              className={onSliceClick ? 'cursor-pointer' : undefined}
              onClick={() => onSliceClick?.(arc.id)}
            />
          ))
        )}
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
