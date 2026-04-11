import { Pressable, Text, View } from 'react-native';

type PillSelectorOption<T extends string> = {
  label: string;
  value: T;
};

type PillSelectorProps<T extends string> = {
  className?: string;
  onChange: (value: T) => void;
  options: readonly PillSelectorOption<T>[];
  selectedLabelClassName?: string;
  selectedValue: T;
  unselectedLabelClassName?: string;
};

export function PillSelector<T extends string>({
  className,
  onChange,
  options,
  selectedLabelClassName = 'text-primary',
  selectedValue,
  unselectedLabelClassName = 'text-secondary',
}: PillSelectorProps<T>) {
  return (
    <View className={`flex-row flex-wrap gap-2 ${className ?? ''}`}>
      {options.map((option) => {
        const selected = option.value === selectedValue;

        return (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option.value}
            className={`min-h-11 rounded-full px-4 py-2 active:opacity-80 ${
              selected ? 'bg-accent' : 'bg-background'
            }`}
            hitSlop={4}
            onPress={() => onChange(option.value)}
            style={{ borderCurve: 'continuous' }}>
            <Text
              className={`text-sm font-medium ${
                selected ? selectedLabelClassName : unselectedLabelClassName
              }`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
