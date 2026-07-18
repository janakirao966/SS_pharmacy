interface SpinnerProps {
  size?: number;
  className?: string;
}

export default function Spinner({ size = 18, className = '' }: SpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="loading"
    />
  );
}
