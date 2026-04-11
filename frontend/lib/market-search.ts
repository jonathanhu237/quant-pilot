import { useSyncExternalStore } from 'react';

let marketSearchQuery = '';

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function setMarketSearchQuery(nextQuery: string) {
  if (marketSearchQuery === nextQuery) {
    return;
  }

  marketSearchQuery = nextQuery;
  emitChange();
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return marketSearchQuery;
}

export function useMarketSearchQuery() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
