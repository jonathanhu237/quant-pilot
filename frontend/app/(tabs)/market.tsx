import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addToWatchlist, getQuotes, getWatchlist, removeFromWatchlist } from '@/lib/api';

type MarketRow = {
  symbol: string;
  name: string;
  price: number | null;
  changePct: number | null;
};

function buildRows(symbols: string[], quotes: Awaited<ReturnType<typeof getQuotes>>, fallbackName: string) {
  const quoteMap = new Map(quotes.map((quote) => [quote.symbol, quote]));

  return symbols.map((symbol) => {
    const quote = quoteMap.get(symbol);
    return {
      symbol,
      name: quote?.name ?? fallbackName,
      price: quote?.price ?? null,
      changePct: quote?.change_pct ?? null,
    };
  });
}

export default function MarketScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const [rows, setRows] = useState<MarketRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accentColor = '#5E6AD2';
  const placeholderColor = colorScheme === 'light' ? '#6B6B7E' : '#8B8B9E';

  const loadMarket = useCallback(async () => {
    setError(null);
    const symbols = await getWatchlist();
    if (symbols.length === 0) {
      setRows([]);
      return;
    }

    try {
      const quotes = await getQuotes(symbols);
      setRows(buildRows(symbols, quotes, t('market.quoteUnavailable')));
    } catch {
      setRows(buildRows(symbols, [], t('market.quoteUnavailable')));
      setError(t('market.errors.quotesUnavailable'));
    }
  }, [t]);

  useEffect(() => {
    async function initialize() {
      try {
        await loadMarket();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : t('market.errors.load'));
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadMarket, t]);

  async function refresh() {
    setRefreshing(true);
    try {
      await loadMarket();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('market.errors.refresh'));
    } finally {
      setRefreshing(false);
    }
  }

  function closeModal() {
    setModalVisible(false);
    setNewSymbol('');
    setModalError(null);
  }

  async function handleAddSymbol() {
    const symbol = newSymbol.trim();

    if (!/^\d{6}$/.test(symbol)) {
      setModalError(t('market.invalidSymbol'));
      return;
    }

    setModalError(null);
    setSubmitting(true);

    try {
      await addToWatchlist(symbol);
      closeModal();
      await loadMarket();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('market.errors.add'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteSymbol(symbol: string) {
    try {
      await removeFromWatchlist(symbol);
      await loadMarket();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t('market.errors.delete'));
    }
  }

  function getChangeClass(changePct: number | null) {
    if (changePct === null || changePct === 0) {
      return 'text-secondary';
    }

    return changePct > 0 ? 'text-up' : 'text-down';
  }

  function getChangeText(changePct: number | null) {
    if (changePct === null) {
      return '--';
    }

    return `${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}%`;
  }

  function renderItem({ item }: { item: MarketRow }) {
    return (
      <Pressable
        className="flex-row items-center gap-3 border-b border-divider px-1 py-4 active:bg-white/5"
        onPress={() => undefined}>
        <View className="flex-1">
          <Text className="text-base font-semibold text-primary">{item.name}</Text>
          <Text className="mt-1 text-sm text-secondary">{item.symbol}</Text>
        </View>
        <View className="items-end">
          <Text
            className="text-lg font-semibold text-primary"
            style={{ fontVariant: ['tabular-nums'] }}>
            {item.price === null ? '--' : item.price.toFixed(2)}
          </Text>
          <Text
            className={`mt-1 text-sm font-medium ${getChangeClass(item.changePct)}`}
            style={{ fontVariant: ['tabular-nums'] }}>
            {getChangeText(item.changePct)}
          </Text>
        </View>
        <Pressable
          className="ml-3 rounded-xl px-3 py-2 active:bg-white/5"
          onPress={() => {
            void handleDeleteSymbol(item.symbol);
          }}>
          <Text className="text-sm font-medium text-secondary">{t('market.delete')}</Text>
        </Pressable>
      </Pressable>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={accentColor} />
        <Text className="mt-3 text-base text-secondary">{t('market.loading')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background px-5" style={{ paddingTop: insets.top + 12 }}>
      <View className="flex-row items-center justify-between pb-6">
        <View className="flex-1 pr-4">
          <Text className="text-3xl font-bold text-primary">{t('market.title')}</Text>
          <Text className="mt-2 text-sm leading-5 text-secondary">
            {t('market.subtitle')}
          </Text>
        </View>
        <Pressable
          className="h-11 w-11 items-center justify-center rounded-full bg-accent active:opacity-80"
          onPress={() => setModalVisible(true)}>
          <Text className="text-2xl font-semibold text-primary">+</Text>
        </Pressable>
      </View>

      {error ? <Text className="pb-4 text-sm text-error">{error}</Text> : null}

      <FlatList
        className="flex-1"
        contentContainerStyle={rows.length === 0 ? { flexGrow: 1, justifyContent: 'center' } : undefined}
        data={rows}
        keyExtractor={(item) => item.symbol}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={accentColor} />}
        renderItem={renderItem}
        ListEmptyComponent={
          <View className="items-center px-6">
            <Text className="text-xl font-semibold text-primary">{t('market.emptyTitle')}</Text>
            <Text className="mt-2 text-center text-sm leading-6 text-secondary">
              {t('market.emptySubtitle')}
            </Text>
          </View>
        }
      />

      <Modal animationType="slide" onRequestClose={closeModal} transparent visible={modalVisible}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-3xl bg-surface px-5 pb-8 pt-6">
            <Text className="text-xl font-semibold text-primary">{t('market.modalTitle')}</Text>
            {modalError ? <Text className="mt-3 text-sm text-error">{modalError}</Text> : null}
            <TextInput
              className="mt-4 rounded-2xl border border-divider bg-background px-4 py-3 text-base text-primary"
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={(value) => {
                setNewSymbol(value);
                if (modalError) {
                  setModalError(null);
                }
              }}
              placeholder={t('market.symbolPlaceholder')}
              placeholderTextColor={placeholderColor}
              value={newSymbol}
            />
            <View className="mt-5 flex-row justify-end gap-3">
              <Pressable
                className="rounded-xl border border-divider px-4 py-3 active:bg-white/5"
                onPress={closeModal}>
                <Text className="font-medium text-secondary">{t('market.cancel')}</Text>
              </Pressable>
              <Pressable
                className={`rounded-xl px-4 py-3 ${submitting ? 'bg-accent/70' : 'bg-accent active:opacity-80'}`}
                disabled={submitting}
                onPress={() => {
                  void handleAddSymbol();
                }}>
                <Text className="font-medium text-primary">
                  {submitting ? t('market.adding') : t('market.add')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
