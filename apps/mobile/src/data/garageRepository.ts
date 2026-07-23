/**
 * A narrow data boundary: screens never need to know whether data came from
 * FastAPI or the local demonstrator. Every call degrades gracefully — if the
 * LAN API is unreachable the app keeps working on its local workspace.
 */
import type {
  AuthUser,
  CalendarEvent,
  Customer,
  GarageSettings,
  GarageState,
  InventoryItem,
  Invoice,
  Vehicle,
  VehicleStatus,
  WorkOrder,
} from "./types";

// Explicit EXPO_PUBLIC_API_URL wins. A production web build (served by the
// FastAPI process itself) falls back to its own origin automatically.
const explicitApiUrl = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const sameOriginApiUrl =
  typeof window !== "undefined" && process.env.NODE_ENV === "production" ? window.location.origin : "";
export const API_BASE_URL = explicitApiUrl || sameOriginApiUrl;

export type ConnectionState = "local" | "connected" | "offline";

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T | null> {
  if (!API_BASE_URL) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init?.timeoutMs ?? 6000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...init?.headers,
      },
    });
    if (!response.ok) return null;
    if (response.status === 204) return {} as T;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkApiConnection(): Promise<ConnectionState> {
  if (!API_BASE_URL) return "local";
  const health = await request<{ status: string }>("/health", { timeoutMs: 2500 });
  return health?.status === "ok" ? "connected" : "offline";
}

// ---------------------------------------------------------------------------
// Authentication

export interface LoginResult {
  token: string;
  expiresAt: string;
  user: AuthUser;
}

/** null → API unreachable (offline demo sign-in may apply); false → rejected. */
export async function apiLogin(username: string, password: string): Promise<LoginResult | false | null> {
  if (!API_BASE_URL) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (response.status === 401) return false;
    if (!response.ok) return null;
    return (await response.json()) as LoginResult;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function apiLogout(): Promise<void> {
  await request("/api/auth/logout", { method: "POST", timeoutMs: 2500 });
}

// ---------------------------------------------------------------------------
// Workspace hydration

export async function loadRemoteWorkspace(): Promise<GarageState | null> {
  const workspace = await request<GarageState>("/api/workspace", { timeoutMs: 6000 });
  if (!workspace) return null;
  return { ...workspace, invoices: workspace.invoices ?? [] };
}

// ---------------------------------------------------------------------------
// Write-through mutations. Each returns the server-created record mapped to
// the local shape (so local state can adopt authoritative server ids), or
// null when the API is unreachable — callers then keep the local record.

const VEHICLE_STATUS_TO_API: Record<VehicleStatus, string> = {
  Waiting: "checked_in",
  "In service": "in_service",
  "Quality check": "quality_check",
  Ready: "ready",
  Collected: "collected",
};

const JOB_STATUS_TO_API: Record<VehicleStatus, string> = {
  Waiting: "scheduled",
  "In service": "in_progress",
  "Quality check": "quality_check",
  Ready: "ready",
  Collected: "completed",
};

export async function pushCustomer(customer: Customer): Promise<string | null> {
  const row = await request<{ id: string }>("/api/customers", {
    method: "POST",
    body: JSON.stringify({ name: customer.name, phone: customer.phone, email: customer.email || null, notes: customer.note ?? null }),
  });
  return row?.id ?? null;
}

export async function pushVehicle(vehicle: Vehicle): Promise<string | null> {
  const row = await request<{ id: string }>("/api/vehicles", {
    method: "POST",
    body: JSON.stringify({
      customerId: vehicle.customerId,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      registrationNumber: vehicle.plate,
      color: vehicle.colour,
      odometer: vehicle.odometer,
      status: VEHICLE_STATUS_TO_API[vehicle.status],
    }),
  });
  return row?.id ?? null;
}

export async function pushVehicleStatus(vehicleId: string, status: VehicleStatus): Promise<void> {
  await request(`/api/vehicles/${vehicleId}`, { method: "PATCH", body: JSON.stringify({ status: VEHICLE_STATUS_TO_API[status] }) });
}

export async function pushWorkOrder(order: WorkOrder): Promise<{ id: string; number: string } | null> {
  const row = await request<{ id: string; job_number?: string }>("/api/work-orders", {
    method: "POST",
    body: JSON.stringify({
      vehicleId: order.vehicleId,
      customerId: order.customerId,
      serviceType: order.title,
      description: order.service,
      status: JOB_STATUS_TO_API[order.status],
      priority: order.priority === "Urgent" ? "urgent" : order.priority === "Priority" ? "high" : "normal",
      technician: order.technician,
      estimatedCost: order.estimate,
      notes: order.note ?? null,
    }),
  });
  return row ? { id: row.id, number: row.job_number ?? order.number } : null;
}

export async function pushWorkOrderStatus(orderId: string, status: VehicleStatus): Promise<void> {
  await request(`/api/work-orders/${orderId}`, { method: "PATCH", body: JSON.stringify({ status: JOB_STATUS_TO_API[status] }) });
}

export async function pushAppointment(event: CalendarEvent): Promise<string | null> {
  const startsAt = /^\d{4}-\d{2}-\d{2}$/.test(event.date) && /^\d{2}:\d{2}$/.test(event.time)
    ? `${event.date}T${event.time}:00`
    : null;
  if (!startsAt) return null;
  const row = await request<{ id: string }>("/api/appointments", {
    method: "POST",
    body: JSON.stringify({
      customerId: event.customerId,
      vehicleId: event.vehicleId,
      serviceType: event.title,
      startsAt,
      advisor: event.technician,
    }),
  });
  return row?.id ?? null;
}

export async function pushInventoryItem(item: InventoryItem): Promise<string | null> {
  const row = await request<{ id: string }>("/api/inventory", {
    method: "POST",
    body: JSON.stringify({
      sku: item.sku,
      name: item.name,
      category: item.category,
      quantityOnHand: item.quantity,
      reorderLevel: item.reorderAt,
      unitPrice: item.price,
      supplier: item.supplier,
    }),
  });
  return row?.id ?? null;
}

export async function pushStockAdjustment(itemId: string, delta: number): Promise<void> {
  await request(`/api/inventory/${itemId}/adjustments`, {
    method: "POST",
    body: JSON.stringify({ quantityDelta: delta, reason: delta > 0 ? "Stock received at front desk" : "Issued to workshop" }),
  });
}

export async function pushInvoice(invoice: Invoice): Promise<{ id: string; number: string } | null> {
  const row = await request<{ id: string; invoice_number?: string }>("/api/invoices", {
    method: "POST",
    body: JSON.stringify({
      customerId: invoice.customerId,
      vehicleId: invoice.vehicleId ?? null,
      jobId: invoice.workOrderId ?? null,
      status: invoice.status,
      taxRate: invoice.taxRate,
      discount: invoice.discount,
      lineItems: invoice.lineItems.map((item) => ({ description: item.description, quantity: item.quantity, unitPrice: item.unitPrice })),
    }),
  });
  return row ? { id: row.id, number: row.invoice_number ?? invoice.number } : null;
}

export async function pushPayment(invoiceId: string, amount: number, method: string): Promise<void> {
  await request(`/api/invoices/${invoiceId}/payments`, { method: "POST", body: JSON.stringify({ amount, method }) });
}

export async function pushSettings(settings: GarageSettings): Promise<void> {
  await request("/api/settings", {
    method: "PATCH",
    body: JSON.stringify({ garageName: settings.garageName, phone: settings.phone, address: settings.address, currency: settings.currency }),
  });
}

export async function pushDemoReset(): Promise<GarageState | null> {
  const done = await request("/api/demo/reset", { method: "POST" });
  return done ? loadRemoteWorkspace() : null;
}
