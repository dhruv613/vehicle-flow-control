/**
 * A narrow data boundary: screens never need to know whether data came from
 * FastAPI or the local demonstrator. It intentionally falls back without
 * failing if a LAN API is not reachable from Expo Go.
 */
import type { GarageState } from "./types";

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export type ConnectionState = "local" | "connected" | "offline";

export async function checkApiConnection(): Promise<ConnectionState> {
  if (!API_BASE_URL) return "local";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return response.ok ? "connected" : "offline";
  } catch {
    return "offline";
  }
}

export async function loadRemoteWorkspace(): Promise<GarageState | null> {
  if (!API_BASE_URL) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(`${API_BASE_URL}/api/workspace`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return null;
    return (await response.json()) as GarageState;
  } catch {
    return null;
  }
}

/**
 * Replace these local mutations with FastAPI calls incrementally. The app
 * remains fully operable in local/demo mode while endpoints are being built.
 */
export const garageEndpoints = {
  vehicles: `${API_BASE_URL}/api/vehicles`,
  customers: `${API_BASE_URL}/api/customers`,
  workOrders: `${API_BASE_URL}/api/work-orders`,
  inventory: `${API_BASE_URL}/api/inventory`,
  appointments: `${API_BASE_URL}/api/appointments`,
};
