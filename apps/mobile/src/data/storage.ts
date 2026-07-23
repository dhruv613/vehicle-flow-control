/**
 * Tiny JSON persistence wrapper over AsyncStorage. On web this is backed by
 * localStorage, on Android/iOS by the native store — so a session and locally
 * entered data survive a refresh or an app restart on every platform.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export const STORAGE_KEYS = {
  session: "motorwise.session.v1",
  workspace: "motorwise.workspace.v1",
} as const;

export async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Persistence is a convenience; the in-memory workspace remains authoritative.
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Ignore: worst case a stale value is read and rejected later.
  }
}
