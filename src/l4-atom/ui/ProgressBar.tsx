import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number;
  label?: string;
  size?: 'sm' | 'md';
  variant?: 'default' | 'indeterminate';
}

export function ProgressBar({
  progress,
  label,
  size = 'md',
  variant = 'default',
}: ProgressBarProps) {
  const height = size === 'sm' ? 4 : 6;
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div style={{ width: '100%' }}>
      {(label || variant === 'indeterminate') && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          {label && (
            <span
              style={{
                fontSize: 12,
                color: 'var(--color-text-secondary)',
              }}
            >
              {label}
            </span>
          )}
          {variant === 'default' && (
            <span
              style={{
                fontSize: 12,
                color: 'var(--color-text-tertiary)',
              }}
            >
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      <div
        style={{
          width: '100%',
          height,
          borderRadius: height / 2,
          background: 'var(--color-border)',
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={
            variant === 'indeterminate'
              ? { x: ['-100%', '400%'] }
              : { width: `${clampedProgress}%` }
          }
          transition={
            variant === 'indeterminate'
              ? { repeat: Infinity, duration: 1.5, ease: 'linear' }
              : { type: 'spring', stiffness: 200, damping: 25 }
          }
          style={{
            height: '100%',
            borderRadius: height / 2,
            background: 'linear-gradient(90deg, #007AFF, #5856D6)',
            ...(variant === 'indeterminate' && { width: '25%' }),
          }}
        />
      </div>
    </div>
  );
}
