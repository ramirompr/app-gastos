interface MiniProportionBarProps {
  segments: { color: string; value: number }[];
}

/** Barra horizontal fina, puramente visual, sin números ni etiquetas. */
export function MiniProportionBar({ segments }: MiniProportionBarProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) return null;

  return (
    <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-800">
      {segments
        .filter((s) => s.value > 0)
        .map((s, i) => (
          <div key={i} style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }} />
        ))}
    </div>
  );
}
