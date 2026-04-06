import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { addToWatchlist, getQuotes, getWatchlist, removeFromWatchlist } from '@/lib/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type MarketRow = {
  symbol: string;
  name: string;
  price: number | null;
  change_pct: number | null;
};

export default function MarketScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<MarketRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMarket() {
    setError(null);
    const symbols = await getWatchlist();
    const nextQuotes = await getQuotes(symbols);
    const quoteMap = new Map(nextQuotes.map((quote) => [quote.symbol, quote]));
    setRows(
      symbols.map((symbol) => {
        const quote = quoteMap.get(symbol);
        return {
          symbol,
          name: quote?.name ?? 'Quote unavailable',
          price: quote?.price ?? null,
          change_pct: quote?.change_pct ?? null,
        };
      })
    );
  }

  useEffect(() => {
    async function initialize() {
      try {
        await loadMarket();
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Failed to load market data.';
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, []);

  async function refresh() {
    setRefreshing(true);
    try {
      await loadMarket();
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to refresh market data.';
      setError(message);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleAddSymbol() {
    const symbol = newSymbol.trim();
    if (!/^\d{6}$/.test(symbol)) {
      setModalError('Please enter a valid 6-digit A-share symbol.');
      return;
    }

    setModalError(null);
    setSubmitting(true);
    try {
      await addToWatchlist(symbol);
      setModalVisible(false);
      setNewSymbol('');
      await loadMarket();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Failed to add symbol.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function closeModal() {
    setModalVisible(false);
    setNewSymbol('');
    setModalError(null);
  }

  async function handleDeleteSymbol(symbol: string) {
    try {
      await removeFromWatchlist(symbol);
      await loadMarket();
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : 'Failed to delete symbol.';
      setError(message);
    }
  }

  function getChangeColor(changePct: number | null) {
    if (changePct === null) {
      return palette.icon;
    }
    if (changePct > 0) {
      return '#D63A3A';
    }
    if (changePct < 0) {
      return '#169B62';
    }
    return palette.icon;
  }

  function renderItem({ item }: { item: MarketRow }) {
    const changeColor = getChangeColor(item.change_pct);

    return (
      <View
        style={[
          styles.row,
          {
            backgroundColor: palette.background,
            borderColor: palette.icon,
          },
        ]}>
        <View style={styles.rowMain}>
          <ThemedText type="defaultSemiBold">{item.symbol}</ThemedText>
          <ThemedText>{item.name}</ThemedText>
        </View>
        <View style={styles.rowSide}>
          <ThemedText type="defaultSemiBold">
            {item.price === null ? '--' : item.price.toFixed(2)}
          </ThemedText>
          <ThemedText style={{ color: changeColor }}>
            {item.change_pct === null
              ? '--'
              : `${item.change_pct > 0 ? '+' : ''}${item.change_pct.toFixed(2)}%`}
          </ThemedText>
        </View>
        <Pressable
          onPress={() => handleDeleteSymbol(item.symbol)}
          style={({ pressed }) => [styles.deleteButton, pressed && styles.buttonPressed]}>
          <ThemedText style={styles.deleteText}>Delete</ThemedText>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={palette.tint} />
        <ThemedText>Loading market data...</ThemedText>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: palette.background,
          paddingTop: insets.top + 12,
        },
      ]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="title">Market</ThemedText>
          <ThemedText>Track your A-share watchlist in real time.</ThemedText>
        </View>
        <Pressable
          onPress={() => setModalVisible(true)}
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: palette.tint },
            pressed && styles.buttonPressed,
          ]}>
          <ThemedText style={styles.addButtonText}>+</ThemedText>
        </Pressable>
      </View>

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      <FlatList
        data={rows}
        keyExtractor={(item) => item.symbol}
        renderItem={renderItem}
        contentContainerStyle={rows.length === 0 ? styles.emptyList : styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.tint} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <ThemedText type="subtitle">No symbols yet</ThemedText>
            <ThemedText>Add a 6-digit A-share code to start tracking quotes.</ThemedText>
          </View>
        }
      />

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: palette.background }]}>
            <ThemedText type="subtitle">Add A-share Symbol</ThemedText>
            {modalError ? <ThemedText style={styles.errorText}>{modalError}</ThemedText> : null}
            <TextInput
              value={newSymbol}
              onChangeText={(value) => {
                setNewSymbol(value);
                if (modalError) {
                  setModalError(null);
                }
              }}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="600519"
              placeholderTextColor={palette.icon}
              style={[
                styles.input,
                {
                  borderColor: palette.icon,
                  color: palette.text,
                },
              ]}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={closeModal}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    borderColor: palette.icon,
                  },
                  pressed && styles.buttonPressed,
                ]}>
                <ThemedText>Cancel</ThemedText>
              </Pressable>
              <Pressable
                disabled={submitting}
                onPress={handleAddSymbol}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: palette.tint },
                  pressed && styles.buttonPressed,
                  submitting && styles.buttonDisabled,
                ]}>
                <ThemedText style={styles.primaryButtonText}>
                  {submitting ? 'Adding...' : 'Add'}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 16,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '700',
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyState: {
    alignItems: 'center',
    gap: 8,
  },
  row: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  rowSide: {
    alignItems: 'flex-end',
    gap: 2,
  },
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  deleteText: {
    color: '#B42318',
    fontWeight: '600',
  },
  errorText: {
    color: '#B42318',
    marginBottom: 12,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  modalCard: {
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButton: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
