import { formatCompact } from '@/lib/chart-scale';

export interface BarSegment {
  color: string;
  value: number;
}

export interface MonthBar {
  label: string;
  isCurrent: boolean;
  total: number;
  segments: BarSegment[];
}

interface StackedBarChartProps {
  months: MonthBar[];
  axisMax: number;
  ticks: number[];
  isUsd?: boolean;
}

const PLOT_HEIGHT = 200;
const AXIS_WIDTH = 32;

export function StackedBarChart({ months, axisMax, ticks, isUsd = false }: StackedBarChartProps) {
  return (
    <div className="bg-slate-900 rounded-2xl px-3 pt-5 pb-4 flex flex-col overflow-hidden">
      <div className="flex gap-1.5">
        <div
          className="flex flex-col justify-between flex-shrink-0"
          style={{ width: AXIS_WIDTH, height: PLOT_HEIGHT }}
        >
          {[...ticks].reverse().map((t) => (
            <p key={t} className="text-[9px] text-slate-500 text-right leading-none">
              {formatCompact(t, isUsd)}
            </p>
          ))}
        </div>

        <div className="relative flex-1 flex items-end gap-1" style={{ height: PLOT_HEIGHT }}>
          {ticks
            .filter((t) => t > 0)
            .map((t) => (
              <div
                key={t}
                className="absolute left-0 right-0 h-px bg-slate-800"
                style={{ bottom: `${(t / axisMax) * PLOT_HEIGHT}px` }}
              />
            ))}

          {months.map((m, i) => {
            const barHeight = (m.total / axisMax) * PLOT_HEIGHT;
            return (
              <div
                key={i}
                className="relative z-10 flex-1 min-w-0 flex flex-col items-center justify-end"
                style={{ height: PLOT_HEIGHT }}
              >
                {m.total > 0 && (
                  <p className="text-[9px] text-slate-400 font-semibold whitespace-nowrap mb-1">
                    {formatCompact(m.total, isUsd)}
                  </p>
                )}
                <div
                  className="w-full flex flex-col-reverse rounded overflow-hidden"
                  style={{ height: `${barHeight}px` }}
                >
                  {m.segments.map((s, si) => (
                    <div
                      key={si}
                      style={{ height: `${(s.value / m.total) * 100}%`, backgroundColor: s.color }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-1.5 mt-2">
        <div style={{ width: AXIS_WIDTH }} className="flex-shrink-0" />
        <div className="flex-1 flex gap-1">
          {months.map((m, i) => (
            <p
              key={i}
              className={`flex-1 min-w-0 text-[10px] font-medium text-center truncate ${
                m.isCurrent ? 'text-white font-bold' : 'text-slate-500'
              }`}
            >
              {m.label}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
