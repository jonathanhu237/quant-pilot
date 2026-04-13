// Text color lives on the <Text> child, not the wrapper.
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Label } from '@/components/ui/typography';
import { cn } from '@/components/ui/utils';
import { useAppTheme } from '@/lib/theme-context';

type ButtonVariant = 'destructive' | 'ghost' | 'primary' | 'secondary';
type ButtonSize = 'lg' | 'md' | 'sm';
type TextTone = 'accent' | 'down' | 'onAccent' | 'primary' | 'secondary' | 'up';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  children?: ReactNode;
  className?: string;
  leftIcon?: ReactNode;
  loading?: boolean;
  rightIcon?: ReactNode;
  size?: ButtonSize;
  square?: boolean;
  style?: StyleProp<ViewStyle>;
  textClassName?: string;
  textTone?: TextTone;
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  destructive: 'bg-down',
  ghost: 'bg-transparent',
  primary: 'bg-accent',
  secondary: 'border border-divider bg-surface',
};

const sizeClasses: Record<ButtonSize, string> = {
  lg: 'min-h-11 px-5 py-3',
  md: 'min-h-11 px-4 py-3',
  sm: 'min-h-9 px-3 py-2',
};

const defaultTextTones: Record<ButtonVariant, TextTone> = {
  destructive: 'primary',
  ghost: 'secondary',
  primary: 'primary',
  secondary: 'secondary',
};

export function Button({
  accessibilityRole = 'button',
  children,
  className,
  disabled,
  hitSlop = 4,
  leftIcon,
  loading = false,
  onPress,
  rightIcon,
  size = 'md',
  square = false,
  style,
  textClassName,
  textTone,
  variant = 'primary',
  ...props
}: ButtonProps) {
  const { palette } = useAppTheme();
  const resolvedTextTone = textTone ?? defaultTextTones[variant];
  const spinnerColor =
    resolvedTextTone === 'accent'
      ? palette.accent
      : resolvedTextTone === 'onAccent'
        ? palette.onAccent
      : resolvedTextTone === 'secondary'
        ? palette.secondary
        : resolvedTextTone === 'up'
          ? palette.accent
          : palette.primary;

  return (
    <Pressable
      {...props}
      accessibilityRole={accessibilityRole}
      className={cn(
        'flex-row items-center justify-center gap-2 rounded-pill',
        square ? 'h-11 w-11 px-0 py-0' : sizeClasses[size],
        variantClasses[variant],
        !disabled && !loading && 'active:opacity-80',
        (disabled || loading) && 'opacity-70',
        className
      )}
      disabled={disabled || loading}
      hitSlop={hitSlop}
      onPress={onPress}
      style={[{ borderCurve: 'continuous' }, style]}>
      {loading ? <ActivityIndicator color={spinnerColor} size="small" /> : leftIcon}
      {typeof children === 'string' || typeof children === 'number' ? (
        <Label className={textClassName} tone={resolvedTextTone}>
          {children}
        </Label>
      ) : children ? (
        <View>{children}</View>
      ) : null}
      {!loading ? rightIcon : null}
    </Pressable>
  );
}
