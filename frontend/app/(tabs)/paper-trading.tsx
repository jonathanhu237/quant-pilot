import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  buyStock,
  getTradeHistory,
  getTradingAccount,
  sellStock,
  type TradingAccount,
  type TradingTrade,
} from '@/lib/api';

type TradingTab = 'positions' | 'history';
type TradeSide = 'buy' | 'sell';

function formatCurrency(value: number) {
  return `¥${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPercent(value: number, withSign = true) {
  const prefix = withSign && value > 0 ? '+' : '';
  return `${prefix}${(value * 100).toFixed(2)}%`;
}

function getValueColor(value: number) {
  if (value > 0) {
    return 'text-up';
  }
  if (value < 0) {
    return 'text-down';
  }
  return 'text-secondary';
}

export default function PaperTradingScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const [account, setAccount] = useState<TradingAccount | null>(null);
  const [history, setHistory] = useState<TradingTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TradingTab>('positions');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [tradeSide, setTradeSide] = useState<TradeSide>('buy');
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const accentColor = '#5E6AD2';
  const placeholderColor = colorScheme === 'light' ? '#6B6B7E' : '#8B8B9E';

  async function loadTradingData() {
    setError(null);
    const [nextAccount, nextHistory] = await Promise.all([
      getTradingAccount(),
      getTradeHistory(),
    ]);
    setAccount(nextAccount);
    setHistory(nextHistory);
  }

  useEffect(() => {
    async function initialize() {
      try {
        await loadTradingData();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : t('paperTrading.errors.load'));
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [t]);

  async function refresh() {
    setRefreshing(true);
    try {
      await loadTradingData();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('paperTrading.errors.load'));
    } finally {
      setRefreshing(false);
    }
  }

  function closeModal() {
    setModalVisible(false);
    setTradeSide('buy');
    setSymbol('');
    setShares('');
    setModalError(null);
  }

  async function submitTrade() {
    const normalizedSymbol = symbol.trim();
    const parsedShares = Number.parseInt(shares.trim(), 10);

    if (!/^\d{6}$/.test(normalizedSymbol)) {
      setModalError(t('paperTrading.errors.invalidSymbol'));
      return;
    }

    if (!Number.isFinite(parsedShares) || parsedShares <= 0) {
      setModalError(t('paperTrading.errors.invalidShares'));
      return;
    }

    setSubmitting(true);
    setModalError(null);

    try {
      if (tradeSide === 'buy') {
        await buyStock({ symbol: normalizedSymbol, shares: parsedShares });
      } else {
        await sellStock({ symbol: normalizedSymbol, shares: parsedShares });
      }
      closeModal();
      await loadTradingData();
    } catch (tradeError) {
      setModalError(
        tradeError instanceof Error ? tradeError.message : t('paperTrading.errors.trade')
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || account === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={accentColor} />
        <Text className="mt-3 text-base text-secondary">{t('paperTrading.loading')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={accentColor}
          />
        }>
        <View className="px-5">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-3xl font-bold text-primary">{t('paperTrading.title')}</Text>
              <Text className="mt-2 text-sm leading-5 text-secondary">
                {t('paperTrading.subtitle')}
              </Text>
            </View>
            <Pressable
              className="rounded-full bg-accent px-4 py-3 active:opacity-80"
              onPress={() => setModalVisible(true)}>
              <Text className="font-semibold text-primary">
                {t('paperTrading.tradeButton')}
              </Text>
            </Pressable>
          </View>

          {error ? <Text className="mt-4 text-sm text-error">{error}</Text> : null}

          <View className="mt-6 rounded-3xl bg-surface px-4 py-5">
            <Text className="text-sm text-secondary">{t('paperTrading.summary.totalAssets')}</Text>
            <Text className="mt-2 text-3xl font-bold text-primary">
              {formatCurrency(account.total_assets)}
            </Text>

            <View className="mt-5 flex-row flex-wrap justify-between gap-y-4">
              <View className="w-[48%]">
                <Text className="text-sm text-secondary">
                  {t('paperTrading.summary.cash')}
                </Text>
                <Text className="mt-1 text-lg font-semibold text-primary">
                  {formatCurrency(account.cash_balance)}
                </Text>
              </View>
              <View className="w-[48%]">
                <Text className="text-sm text-secondary">
                  {t('paperTrading.summary.marketValue')}
                </Text>
                <Text className="mt-1 text-lg font-semibold text-primary">
                  {formatCurrency(account.market_value)}
                </Text>
              </View>
              <View className="w-[48%]">
                <Text className="text-sm text-secondary">
                  {t('paperTrading.summary.totalPnl')}
                </Text>
                <Text
                  className={`mt-1 text-lg font-semibold ${getValueColor(account.total_pnl)}`}>
                  {formatCurrency(account.total_pnl)}
                </Text>
              </View>
              <View className="w-[48%]">
                <Text className="text-sm text-secondary">
                  {t('paperTrading.summary.returnRate')}
                </Text>
                <Text
                  className={`mt-1 text-lg font-semibold ${getValueColor(
                    account.total_return_rate
                  )}`}>
                  {formatPercent(account.total_return_rate)}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-6 flex-row gap-2">
            {(['positions', 'history'] as const).map((tab) => {
              const selected = tab === activeTab;
              return (
                <Pressable
                  key={tab}
                  className={`rounded-full px-4 py-2 ${
                    selected ? 'bg-accent' : 'bg-surface'
                  }`}
                  onPress={() => setActiveTab(tab)}>
                  <Text
                    className={selected ? 'font-medium text-primary' : 'font-medium text-secondary'}>
                    {t(`paperTrading.tabs.${tab}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {activeTab === 'positions' ? (
            <View className="mt-4 rounded-3xl bg-surface">
              {account.positions.length === 0 ? (
                <View className="px-4 py-8">
                  <Text className="text-center text-base text-secondary">
                    {t('paperTrading.emptyPositions')}
                  </Text>
                </View>
              ) : (
                account.positions.map((position, index) => (
                  <View
                    key={position.symbol}
                    className={`px-4 py-4 ${
                      index === 0 ? '' : 'border-t border-divider'
                    }`}>
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-4">
                        <Text className="text-base font-semibold text-primary">
                          {position.name}
                        </Text>
                        <Text className="mt-1 text-sm text-secondary">
                          {position.symbol} · {position.shares}
                          {t('paperTrading.sharesUnit')}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text
                          className={`text-base font-semibold ${getValueColor(
                            position.unrealized_pnl
                          )}`}>
                          {formatPercent(position.unrealized_pnl_pct)}
                        </Text>
                        <Text
                          className={`mt-1 text-sm ${getValueColor(position.unrealized_pnl)}`}>
                          {formatCurrency(position.unrealized_pnl)}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-4 flex-row flex-wrap justify-between gap-y-3">
                      <View className="w-[32%]">
                        <Text className="text-xs text-secondary">
                          {t('paperTrading.position.cost')}
                        </Text>
                        <Text className="mt-1 text-sm font-medium text-primary">
                          {formatCurrency(position.average_cost)}
                        </Text>
                      </View>
                      <View className="w-[32%]">
                        <Text className="text-xs text-secondary">
                          {t('paperTrading.position.current')}
                        </Text>
                        <Text className="mt-1 text-sm font-medium text-primary">
                          {formatCurrency(position.current_price)}
                        </Text>
                      </View>
                      <View className="w-[32%]">
                        <Text className="text-xs text-secondary">
                          {t('paperTrading.position.marketValue')}
                        </Text>
                        <Text className="mt-1 text-sm font-medium text-primary">
                          {formatCurrency(position.market_value)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : (
            <View className="mt-4 rounded-3xl bg-surface">
              {history.length === 0 ? (
                <View className="px-4 py-8">
                  <Text className="text-center text-base text-secondary">
                    {t('paperTrading.emptyHistory')}
                  </Text>
                </View>
              ) : (
                history.map((trade, index) => (
                  <View
                    key={trade.id}
                    className={`px-4 py-4 ${
                      index === 0 ? '' : 'border-t border-divider'
                    }`}>
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-4">
                        <Text
                          className="text-base font-semibold text-accent">
                          {t(`paperTrading.tradeSide.${trade.side}`)}
                        </Text>
                        <Text className="mt-1 text-sm text-secondary">
                          {trade.symbol} · {trade.shares}
                          {t('paperTrading.sharesUnit')}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-base font-semibold text-primary">
                          {formatCurrency(trade.price)}
                        </Text>
                        <Text className="mt-1 text-xs text-secondary">
                          {new Date(trade.created_at).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={closeModal}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-3xl bg-surface px-5 pb-8 pt-6">
            <Text className="text-xl font-semibold text-primary">
              {t('paperTrading.tradeModal.title')}
            </Text>

            <View className="mt-4 flex-row gap-2">
              {(['buy', 'sell'] as const).map((side) => {
                const selected = side === tradeSide;
                return (
                  <Pressable
                    key={side}
                    className={`rounded-full px-4 py-2 ${
                      selected ? 'bg-accent' : 'bg-background'
                    }`}
                    onPress={() => setTradeSide(side)}>
                    <Text
                      className={selected ? 'font-medium text-primary' : 'font-medium text-secondary'}>
                      {t(`paperTrading.tradeSide.${side}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-5">
              <Text className="text-sm font-medium text-secondary">
                {t('paperTrading.tradeModal.symbol')}
              </Text>
              <TextInput
                className="mt-2 rounded-2xl border border-divider bg-background px-4 py-3 text-base text-primary"
                keyboardType="number-pad"
                maxLength={6}
                onChangeText={(value) => {
                  setSymbol(value);
                  setModalError(null);
                }}
                placeholder={t('paperTrading.tradeModal.symbolPlaceholder')}
                placeholderTextColor={placeholderColor}
                value={symbol}
              />
            </View>

            <View className="mt-5">
              <Text className="text-sm font-medium text-secondary">
                {t('paperTrading.tradeModal.shares')}
              </Text>
              <TextInput
                className="mt-2 rounded-2xl border border-divider bg-background px-4 py-3 text-base text-primary"
                keyboardType="number-pad"
                onChangeText={(value) => {
                  setShares(value);
                  setModalError(null);
                }}
                placeholder={t('paperTrading.tradeModal.sharesPlaceholder')}
                placeholderTextColor={placeholderColor}
                value={shares}
              />
            </View>

            {modalError ? <Text className="mt-4 text-sm text-error">{modalError}</Text> : null}

            <View className="mt-6 flex-row justify-end gap-3">
              <Pressable
                className="rounded-xl border border-divider px-4 py-3 active:opacity-80"
                onPress={closeModal}>
                <Text className="font-medium text-secondary">
                  {t('paperTrading.tradeModal.cancel')}
                </Text>
              </Pressable>
              <Pressable
                className={`rounded-xl px-4 py-3 ${
                  submitting ? 'bg-accent/70' : 'bg-accent active:opacity-80'
                }`}
                disabled={submitting}
                onPress={() => {
                  void submitTrade();
                }}>
                <Text className="font-medium text-primary">
                  {submitting
                    ? t('paperTrading.tradeModal.submitting')
                    : t(`paperTrading.tradeModal.confirm.${tradeSide}`)}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
