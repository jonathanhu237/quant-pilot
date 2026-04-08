import { Text, type TextProps } from 'react-native';

type NumericTextProps = TextProps & {
  className?: string;
  toneValue?: number | null;
};

function getToneClassName(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return '';
  }

  if (value > 0) {
    return 'text-up';
  }

  if (value < 0) {
    return 'text-down';
  }

  return 'text-secondary';
}

export function NumericText({
  className,
  selectable = true,
  style,
  toneValue,
  ...props
}: NumericTextProps) {
  const classes = [className, getToneClassName(toneValue)].filter(Boolean).join(' ');

  return (
    <Text
      {...props}
      className={classes}
      selectable={selectable}
      style={[{ fontVariant: ['tabular-nums'] as const }, style]}
    />
  );
}
