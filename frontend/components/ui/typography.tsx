// Text color lives on the <Text> child, not the wrapper.
import { Text, type TextProps } from 'react-native';

import { cn } from '@/components/ui/utils';

type Tone = 'accent' | 'down' | 'error' | 'onAccent' | 'primary' | 'secondary' | 'up';
type Weight = 'bold' | 'medium' | 'regular' | 'semibold';

type TypographyProps = TextProps & {
  className?: string;
  tone?: Tone;
  weight?: Weight;
};

const toneClasses: Record<Tone, string> = {
  accent: 'text-accent',
  down: 'text-down',
  error: 'text-error',
  onAccent: 'text-on-accent',
  primary: 'text-primary',
  secondary: 'text-secondary',
  up: 'text-up',
};

const weightClasses: Record<Weight, string> = {
  bold: 'font-bold',
  medium: 'font-medium',
  regular: 'font-normal',
  semibold: 'font-semibold',
};

function createTypography(baseClassName: string, defaultWeight: Weight) {
  return function Typography({
    className,
    tone = 'primary',
    weight = defaultWeight,
    ...props
  }: TypographyProps) {
    return (
      <Text
        {...props}
        className={cn(baseClassName, toneClasses[tone], weightClasses[weight], className)}
      />
    );
  };
}

export const Display = createTypography('text-display', 'bold');
export const Title = createTypography('text-title', 'semibold');
export const Heading = createTypography('text-heading', 'semibold');
export const Body = createTypography('text-body', 'regular');
export const Label = createTypography('text-label', 'medium');
export const Caption = createTypography('text-caption', 'medium');
