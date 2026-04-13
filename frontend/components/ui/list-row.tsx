// Text color lives on the <Text> child, not the wrapper.
import type { ReactNode } from 'react';
import {
  Pressable,
  View,
  type GestureResponderEvent,
  type Insets,
  type PressableProps,
  type ViewProps,
} from 'react-native';

import { cn } from '@/components/ui/utils';

type ListRowProps = Omit<ViewProps, 'children'> &
  Omit<PressableProps, 'children' | 'style'> & {
    align?: 'center' | 'start';
    children?: ReactNode;
    className?: string;
    hitSlop?: Insets | number;
    isFirst?: boolean;
    leading: ReactNode;
    onPress?: ((event: GestureResponderEvent) => void) | undefined;
    trailing?: ReactNode;
  };

export function ListRow({
  accessibilityLabel,
  accessibilityRole,
  align = 'start',
  children,
  className,
  hitSlop = 4,
  isFirst = false,
  leading,
  onPress,
  style,
  trailing,
  ...props
}: ListRowProps) {
  const rowClassName = cn(
    'flex-row justify-between px-row-x py-row-y',
    align === 'center' ? 'items-center' : 'items-start',
    !isFirst && 'border-t border-divider',
    onPress && 'active:opacity-80',
    className
  );
  const content = (
    <>
      <View className="flex-1 pr-4">{leading}</View>
      {trailing ? <View className="items-end">{trailing}</View> : null}
      {children}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        {...props}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole ?? 'button'}
        className={rowClassName}
        hitSlop={hitSlop}
        onPress={onPress}
        style={style}>
        {content}
      </Pressable>
    );
  }

  return (
    <View
      {...props}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      className={rowClassName}
      style={style}>
      {content}
    </View>
  );
}
