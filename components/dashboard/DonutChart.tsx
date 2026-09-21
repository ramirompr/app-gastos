'use client';

import { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { PlusIcon } from '@/components/icons/PlusIcon';

interface DonutSlice {
  id: string;
  color: string;
  value: number;
  label: string;
  percent: number;
  amountLabel: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  centerLabel: string;
  onAddClick: () => void;
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
const TOOLTIP_MARGIN = 10;
const TOOLTIP_TRANSITION_MS = 150;

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

interface Tooltip {
  slice: DonutSlice;
  x: number;
  y: number;
}

export function DonutChart({ slices, centerLabel, onAddClick }: DonutChartProps) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const visibleSlices = slices.filter((s) => s.value > 0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const wasOpenRef = useRef(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number } | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const closeTooltip = () => {
    setTooltipVisible(false);
    // Espera a que termine el fade-out antes de desmontar el cartel.
    closeTimeoutRef.current = setTimeout(() => setTooltip(null), TOOLTIP_TRANSITION_MS);
  };

  // Cierra el cartel al tocar en cualquier otro lado de la pantalla, sin
  // backdrop ni bloquear el resto de la app (a diferencia de un modal).
  useEffect(() => {
    if (!tooltip) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      closeTooltip();
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [tooltip]);

  useEffect(() => () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  }, []);

  // Una vez montado el cartel (y ya sabemos su tamaño real), lo ubica cerca
  // del punto tocado sin que se salga de la pantalla. Si ya había un cartel
  // abierto (se tocó otro segmento) sólo se reposiciona, con una transición
  // suave; el fade-in "pop" queda reservado para cuando aparece de cero.
  useLayoutEffect(() => {
    if (!tooltip || !tooltipRef.current) {
      setTooltipPos(null);
      wasOpenRef.current = false;
      return;
    }
    const rect = tooltipRef.current.getBoundingClientRect();
    let left = tooltip.x - rect.width / 2;
    let top = tooltip.y - rect.height - TOOLTIP_MARGIN;
    if (top < TOOLTIP_MARGIN) top = tooltip.y + TOOLTIP_MARGIN;
    left = Math.min(Math.max(left, TOOLTIP_MARGIN), window.innerWidth - rect.width - TOOLTIP_MARGIN);
    setTooltipPos({ left, top });

    if (!wasOpenRef.current) {
      setTooltipVisible(false);
      requestAnimationFrame(() => setTooltipVisible(true));
    }
    wasOpenRef.current = true;
  }, [tooltip]);

  let cumulativeDeg = 0;
  const arcs =
    total > 0
      ? visibleSlices.map((slice, i) => {
          const sweep = (slice.value / total) * 360;
          const startDeg = cumulativeDeg;
          const endDeg = cumulativeDeg + sweep;
          cumulativeDeg = endDeg;
          const overlap = visibleSlices.length > 1 ? OVERLAP_DEG : 0;
          return { slice, d: arcPath(startDeg - overlap / 2, endDeg + overlap / 2), key: i };
        })
      : [];

  const handleSliceClick = (slice: DonutSlice, e: React.MouseEvent) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setTooltip({ slice, x: e.clientX, y: e.clientY });
  };

  return (
    <div ref={containerRef} className="relative flex items-center justify-center" style={{ width: WRAPPER, height: WRAPPER }}>
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
            stroke={arcs[0].slice.color}
            strokeWidth={STROKE}
            className="cursor-pointer"
            onClick={(e) => handleSliceClick(arcs[0].slice, e)}
          />
        ) : (
          arcs.map((arc) => (
            <path
              key={arc.key}
              d={arc.d}
              fill="none"
              stroke={arc.slice.color}
              strokeWidth={STROKE}
              className="cursor-pointer"
              onClick={(e) => handleSliceClick(arc.slice, e)}
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

      {tooltip && (
        <div
          ref={tooltipRef}
          className={`fixed z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-xl px-3 py-2 flex items-center gap-2 pointer-events-none transition-all duration-150 ease-out ${
            tooltipVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}
          style={{
            left: tooltipPos?.left ?? tooltip.x,
            top: tooltipPos?.top ?? tooltip.y,
          }}
        >
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tooltip.slice.color }} />
          <div className="flex flex-col">
            <p className="text-white text-sm font-semibold whitespace-nowrap">{tooltip.slice.label}</p>
            <p className="text-slate-400 text-xs whitespace-nowrap">
              {tooltip.slice.percent} % · {tooltip.slice.amountLabel}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
