import { TextInput, type TextInputProps } from 'react-native';

import { cn } from '@/components/ui/utils';
import { useAppTheme } from '@/lib/theme-context';

type InputProps = TextInputProps & {
  className?: string;
};

export function Input({ className, placeholderTextColor, style, ...props }: InputProps) {
  const { palette } = useAppTheme();

  return (
    <TextInput
      {...props}
      className={cn(
        'rounded-field border border-divider bg-background px-field-x py-field-y text-body text-primary',
        className
      )}
      placeholderTextColor={placeholderTextColor ?? palette.placeholder}
      style={[{ borderCurve: 'continuous' }, style]}
    />
  );
}
