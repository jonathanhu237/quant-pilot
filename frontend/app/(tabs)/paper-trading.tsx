import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export default function PaperTradingScreen() {
  return (
    <View style={styles.container}>
      <ThemedText type="title">Paper Trading</ThemedText>
      <ThemedText>Simulate trades and track portfolio performance.</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
