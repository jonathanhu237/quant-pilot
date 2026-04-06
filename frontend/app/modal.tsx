import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function ModalScreen() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center bg-background px-5">
      <Text className="text-3xl font-bold text-primary">{t('modal.title')}</Text>
      <Link href="/" dismissTo className="mt-4 py-4">
        <Text className="text-base text-accent">{t('modal.link')}</Text>
      </Link>
    </View>
  );
}
