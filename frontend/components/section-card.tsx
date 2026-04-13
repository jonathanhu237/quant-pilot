import { View, type ViewProps } from 'react-native';
import { Card } from '@/components/ui/card';
import { Body, Heading } from '@/components/ui/typography';

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
    <Card
      {...props}
      className={className}
      style={style}>
      {title || subtitle ? (
        <View className="gap-2 px-4 pt-5">
          {title ? <Heading>{title}</Heading> : null}
          {subtitle ? <Body tone="secondary">{subtitle}</Body> : null}
        </View>
      ) : null}
      <View className={bodyClassName}>{children}</View>
    </Card>
  );
}
