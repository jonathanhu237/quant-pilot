import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export default function StrategyScreen() {
  return (
    <View style={styles.container}>
      <ThemedText type="title">Strategy</ThemedText>
      <ThemedText>Strategy descriptions, parameters, and backtest results.</ThemedText>
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
