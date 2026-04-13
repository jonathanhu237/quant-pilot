// Text color lives on the <Text> child, not the wrapper.
import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { Caption, Label } from '@/components/ui/typography';
import { cn } from '@/components/ui/utils';

type BadgeVariant = 'accent' | 'negative' | 'neutral' | 'positive';
type BadgeSize = 'md' | 'sm';

type BadgeProps = Omit<PressableProps, 'style'> & {
  children: ReactNode;
  className?: string;
  size?: BadgeSize;
  style?: StyleProp<ViewStyle>;
  textClassName?: string;
  variant?: BadgeVariant;
};

const containerClasses: Record<BadgeVariant, string> = {
  accent: 'border-accent/30 bg-accent/10',
  negative: 'border-down/30 bg-down/10',
  neutral: 'border-surface-raised/30 bg-surface-raised/12',
  positive: 'border-up/30 bg-up/10',
};

const textTones = {
  accent: 'accent',
  negative: 'down',
  neutral: 'primary',
  positive: 'up',
} as const;

const sizeClasses: Record<BadgeSize, string> = {
  md: 'px-3 py-1.5',
  sm: 'px-2 py-1',
};

export function Badge({
  accessibilityRole,
  children,
  className,
  disabled,
  hitSlop = 4,
  onPress,
  size = 'sm',
  style,
  textClassName,
  variant = 'neutral',
  ...props
}: BadgeProps) {
  const textTone = textTones[variant];
  const interactive = Boolean(onPress) && !disabled;

  return (
    <Pressable
      {...props}
      accessibilityRole={interactive ? accessibilityRole ?? 'button' : accessibilityRole}
      className={cn(
        'rounded-pill border border-hairline',
        sizeClasses[size],
        containerClasses[variant],
        interactive && 'active:opacity-80',
        className
      )}
      disabled={!interactive}
      hitSlop={hitSlop}
      onPress={onPress}
      style={[{ borderCurve: 'continuous' }, style]}>
      {typeof children === 'string' || typeof children === 'number' ? (
        size === 'sm' ? (
          <Caption className={cn('leading-4', textClassName)} tone={textTone} weight="semibold">
            {children}
          </Caption>
        ) : (
          <Label className={textClassName} tone={textTone} weight="semibold">
            {children}
          </Label>
        )
      ) : (
        children
      )}
    </Pressable>
  );
}
