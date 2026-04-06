import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export default function AiScreen() {
  return (
    <View style={styles.container}>
      <ThemedText type="title">AI Assistant</ThemedText>
      <ThemedText>Ask questions about strategies and portfolio performance.</ThemedText>
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
