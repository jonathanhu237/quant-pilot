// Text color lives on the <Text> child, not the wrapper.
import { View, type ViewProps } from 'react-native';

import { cn } from '@/components/ui/utils';

type CardTone = 'default' | 'raised' | 'subtle';

type CardProps = ViewProps & {
  className?: string;
  padded?: boolean;
  tone?: CardTone;
};

const toneClasses: Record<CardTone, string> = {
  default: 'bg-surface',
  raised: 'bg-surface-raised/10',
  subtle: 'bg-background',
};

export function Card({
  children,
  className,
  padded = false,
  style,
  tone = 'default',
  ...props
}: CardProps) {
  return (
    <View
      {...props}
      className={cn(
        'rounded-card',
        padded && 'px-card-x py-card-y',
        toneClasses[tone],
        className
      )}
      style={[{ borderCurve: 'continuous' }, style]}>
      {children}
    </View>
  );
}
