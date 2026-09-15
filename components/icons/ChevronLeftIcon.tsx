interface ChevronLeftIconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ChevronLeftIcon({ size = 18, strokeWidth = 2, className }: ChevronLeftIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M12.5 4L7 10l5.5 6"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
