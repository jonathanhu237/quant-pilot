// Text color lives on the <Text> child, not the wrapper.
import { View, type ViewProps } from 'react-native';

import { cn } from '@/components/ui/utils';

type DividerProps = ViewProps & {
  className?: string;
};

export function Divider({ className, ...props }: DividerProps) {
  return <View {...props} className={cn('h-px bg-divider', className)} />;
}
