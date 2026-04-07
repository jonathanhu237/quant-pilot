import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const THEME_STORAGE_KEY = 'quantpilot.theme';

const memoryStore = new Map<string, string>();
let asyncStorageAvailable = true;

function getWebStorage() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

export async function getPreference(key: string): Promise<string | null> {
  const webStorage = getWebStorage();
  if (webStorage) {
    return webStorage.getItem(key);
  }

  if (asyncStorageAvailable) {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      asyncStorageAvailable = false;
    }
  }

  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

export async function setPreference(key: string, value: string): Promise<void> {
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.setItem(key, value);
    return;
  }

  if (asyncStorageAvailable) {
    try {
      await AsyncStorage.setItem(key, value);
      return;
    } catch {
      asyncStorageAvailable = false;
    }
  }

  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    memoryStore.set(key, value);
  }
}
