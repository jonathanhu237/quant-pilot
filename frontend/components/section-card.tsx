import { Text, View, type ViewProps } from 'react-native';

type SectionCardProps = ViewProps & {
  bodyClassName?: string;
  className?: string;
  subtitle?: string;
  title?: string;
};

export function SectionCard({
  bodyClassName,
  children,
  className,
  style,
  subtitle,
  title,
  ...props
}: SectionCardProps) {
  return (
    <View
      {...props}
      className={`rounded-3xl bg-surface ${className ?? ''}`}
      style={[{ borderCurve: 'continuous' }, style]}>
      {title || subtitle ? (
        <View className="px-4 pt-5">
          {title ? <Text className="text-xl font-semibold text-primary">{title}</Text> : null}
          {subtitle ? (
            <Text className="mt-2 text-sm leading-6 text-secondary">{subtitle}</Text>
          ) : null}
        </View>
      ) : null}
      <View className={bodyClassName}>{children}</View>
    </View>
  );
}
