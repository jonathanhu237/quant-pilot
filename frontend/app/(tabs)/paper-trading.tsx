import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function PaperTradingScreen() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="text-center text-4xl font-bold text-primary">
        {t('paperTrading.title')}
      </Text>
      <Text className="mt-3 text-center text-base leading-6 text-secondary">
        {t('paperTrading.subtitle')}
      </Text>
    </View>
  );
}
