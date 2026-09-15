interface PlusIconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function PlusIcon({ size = 20, strokeWidth = 2.5, className }: PlusIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}
