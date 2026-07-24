import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";

import {
  checkApiConnection,
  loadRemoteWorkspace,
  pushAppointment,
  pushCustomer,
  pushCustomerDelete,
  pushCustomerUpdate,
  pushDemoReset,
  pushInventoryItem,
  pushInvoice,
  pushPayment,
  pushSettings,
  pushStockAdjustment,
  pushVehicle,
  pushVehicleDelete,
  pushVehicleStatus,
  pushVehicleUpdate,
  pushWorkOrder,
  pushWorkOrderStatus,
  type ConnectionState,
} from "../data/garageRepository";
import { seedGarage } from "../data/seed";
import { readJson, STORAGE_KEYS, writeJson } from "../data/storage";
import { useAuth } from "./useAuth";
import type {
  CalendarEvent,
  Customer,
  GarageSettings,
  GarageState,
  InventoryItem,
  Invoice,
  InvoiceLineItem,
  Vehicle,
  VehicleStatus,
  WorkOrder,
} from "../data/types";

type NewVehicle = Omit<Vehicle, "id" | "lastService" | "nextService" | "imageTone"> & Partial<Pick<Vehicle, "lastService" | "nextService" | "imageTone">>;
type NewCustomer = Omit<Customer, "id" | "initials" | "joinedAt" | "totalVisits" | "lifetimeValue"> & Partial<Pick<Customer, "initials" | "joinedAt" | "totalVisits" | "lifetimeValue">>;
export type CustomerChanges = Partial<Pick<Customer, "name" | "phone" | "email" | "note">>;
export type VehicleChanges = Partial<Pick<Vehicle, "make" | "model" | "year" | "plate" | "colour" | "odometer" | "customerId">>;
type NewWorkOrder = Omit<WorkOrder, "id" | "number" | "startedAt" | "checklist"> & Partial<Pick<WorkOrder, "startedAt" | "checklist">>;
type NewEvent = Omit<CalendarEvent, "id">;
export interface NewInvoice {
  customerId: string;
  vehicleId?: string | null;
  workOrderId?: string | null;
  status: "draft" | "issued";
  discount: number;
  taxRate: number;
  lineItems: { description: string; quantity: number; unitPrice: number }[];
}

interface GarageContextValue extends GarageState {
  connection: ConnectionState;
  toast: string | null;
  dismissToast: () => void;
  addVehicle: (vehicle: NewVehicle) => string;
  addCustomer: (customer: NewCustomer) => string;
  addWorkOrder: (order: NewWorkOrder) => string;
  updateCustomer: (customerId: string, changes: CustomerChanges) => void;
  deleteCustomer: (customerId: string) => string | null;
  updateVehicle: (vehicleId: string, changes: VehicleChanges) => void;
  deleteVehicle: (vehicleId: string) => string | null;
  updateVehicleStatus: (vehicleId: string, status: VehicleStatus) => void;
  advanceWorkOrder: (workOrderId: string) => void;
  toggleChecklistItem: (workOrderId: string, index: number) => void;
  adjustInventory: (inventoryId: string, amount: number) => void;
  addInventoryItem: (item: Omit<InventoryItem, "id">) => void;
  addEvent: (event: NewEvent) => void;
  addInvoice: (invoice: NewInvoice) => string | null;
  recordPayment: (invoiceId: string, amount: number, method: string) => void;
  updateSettings: (changes: Partial<GarageSettings>) => void;
  resetDemo: () => void;
}

const GarageContext = createContext<GarageContextValue | null>(null);

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const dateLabel = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function statusAfter(status: VehicleStatus): VehicleStatus {
  const route: VehicleStatus[] = ["Waiting", "In service", "Quality check", "Ready", "Collected"];
  return route[Math.min(route.indexOf(status) + 1, route.length - 1)];
}

/** Recompute invoice money fields the same way the FastAPI service does. */
function settleInvoice(lineItems: InvoiceLineItem[], discount: number, taxRate: number, amountPaid: number) {
  const subtotal = Math.round(lineItems.reduce((total, item) => total + item.total, 0) * 100) / 100;
  const cappedDiscount = Math.min(discount, subtotal);
  const taxAmount = Math.round((subtotal - cappedDiscount) * taxRate) / 100;
  const total = Math.round((subtotal - cappedDiscount + taxAmount) * 100) / 100;
  return { subtotal, discount: cappedDiscount, taxAmount, total, balanceDue: Math.max(Math.round((total - amountPaid) * 100) / 100, 0) };
}

/** Swap a locally minted id for the server's id everywhere it is referenced. */
function adoptServerId(state: GarageState, kind: "customer" | "vehicle" | "workOrder" | "event" | "inventory" | "invoice", localId: string, serverId: string, serverNumber?: string): GarageState {
  const swap = <T extends { id: string }>(rows: T[], extra?: (row: T) => T): T[] =>
    rows.map((row) => {
      let next = row.id === localId ? { ...row, id: serverId } : row;
      return extra ? extra(next) : next;
    });
  switch (kind) {
    case "customer":
      return {
        ...state,
        customers: swap(state.customers),
        vehicles: state.vehicles.map((row) => (row.customerId === localId ? { ...row, customerId: serverId } : row)),
        workOrders: state.workOrders.map((row) => (row.customerId === localId ? { ...row, customerId: serverId } : row)),
        events: state.events.map((row) => (row.customerId === localId ? { ...row, customerId: serverId } : row)),
        invoices: state.invoices.map((row) => (row.customerId === localId ? { ...row, customerId: serverId } : row)),
      };
    case "vehicle":
      return {
        ...state,
        vehicles: swap(state.vehicles),
        workOrders: state.workOrders.map((row) => (row.vehicleId === localId ? { ...row, vehicleId: serverId } : row)),
        events: state.events.map((row) => (row.vehicleId === localId ? { ...row, vehicleId: serverId } : row)),
        invoices: state.invoices.map((row) => (row.vehicleId === localId ? { ...row, vehicleId: serverId } : row)),
      };
    case "workOrder":
      return {
        ...state,
        workOrders: state.workOrders.map((row) => (row.id === localId ? { ...row, id: serverId, number: serverNumber ?? row.number } : row)),
        invoices: state.invoices.map((row) => (row.workOrderId === localId ? { ...row, workOrderId: serverId } : row)),
      };
    case "event":
      return { ...state, events: swap(state.events) };
    case "inventory":
      return { ...state, inventory: swap(state.inventory) };
    case "invoice":
      return { ...state, invoices: state.invoices.map((row) => (row.id === localId ? { ...row, id: serverId, number: serverNumber ?? row.number } : row)) };
    default:
      return state;
  }
}

export function GarageProvider({ children }: PropsWithChildren) {
  const { status: authStatus, mode: authMode } = useAuth();
  const [garage, setGarage] = useState<GarageState>(seedGarage);
  const [toast, setToast] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("local");
  const hydratedRef = useRef(false);
  // Always-current snapshot so delete guards can check dependents without
  // depending on `garage` (which would churn the memoized action identities).
  const garageRef = useRef(garage);
  garageRef.current = garage;

  // Hydrate once signed in: prefer the live API, then the device's stored
  // workspace, then the bundled seed.
  useEffect(() => {
    if (authStatus !== "signedIn") {
      hydratedRef.current = false;
      return;
    }
    let cancelled = false;
    void (async () => {
      let next: GarageState | null = null;
      let nextConnection: ConnectionState = "local";
      if (authMode === "api") {
        nextConnection = await checkApiConnection();
        if (nextConnection === "connected") next = await loadRemoteWorkspace();
        if (!next && nextConnection === "connected") nextConnection = "offline";
      }
      if (!next) {
        const stored = await readJson<GarageState>(STORAGE_KEYS.workspace);
        if (stored?.customers && stored.settings) next = { ...stored, invoices: stored.invoices ?? [] };
      }
      if (cancelled) return;
      if (next) setGarage(next);
      setConnection(nextConnection);
      hydratedRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [authStatus, authMode]);

  // Persist the workspace locally (debounced) so refreshes keep tester data.
  useEffect(() => {
    if (!hydratedRef.current) return undefined;
    const timer = setTimeout(() => void writeJson(STORAGE_KEYS.workspace, garage), 400);
    return () => clearTimeout(timer);
  }, [garage]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const announce = useCallback((message: string) => setToast(message), []);
  const isConnected = connection === "connected";

  const addCustomer = useCallback((input: NewCustomer) => {
    const id = makeId("c");
    const namePieces = input.name.trim().split(/\s+/);
    const customer: Customer = {
      ...input,
      id,
      initials: input.initials ?? namePieces.map((piece) => piece[0]).join("").slice(0, 2).toUpperCase(),
      joinedAt: input.joinedAt ?? new Date().toISOString().slice(0, 10),
      totalVisits: input.totalVisits ?? 0,
      lifetimeValue: input.lifetimeValue ?? 0,
    };
    setGarage((current) => ({ ...current, customers: [customer, ...current.customers] }));
    announce(`${customer.name} added to customers`);
    if (isConnected) {
      void pushCustomer(customer).then((serverId) => {
        if (serverId) setGarage((current) => adoptServerId(current, "customer", id, serverId));
      });
    }
    return id;
  }, [announce, isConnected]);

  const addVehicle = useCallback((input: NewVehicle) => {
    const id = makeId("v");
    const vehicle: Vehicle = {
      ...input,
      id,
      lastService: input.lastService ?? "Not recorded",
      nextService: input.nextService ?? "To be scheduled",
      imageTone: input.imageTone ?? "dark",
    };
    setGarage((current) => ({ ...current, vehicles: [vehicle, ...current.vehicles] }));
    announce(`${vehicle.make} ${vehicle.model} added to the garage`);
    if (isConnected) {
      void pushVehicle(vehicle).then((serverId) => {
        if (serverId) setGarage((current) => adoptServerId(current, "vehicle", id, serverId));
      });
    }
    return id;
  }, [announce, isConnected]);

  const addWorkOrder = useCallback((input: NewWorkOrder) => {
    const id = makeId("wo");
    let number = "";
    setGarage((current) => {
      number = `WO-${2480 + current.workOrders.length + 1}`;
      const order: WorkOrder = {
        ...input,
        id,
        number,
        startedAt: input.startedAt ?? "—",
        checklist: input.checklist ?? [{ label: "Vehicle check-in", done: false }, { label: "Technician inspection", done: false }, { label: "Customer update", done: false }],
      };
      if (isConnected) {
        void pushWorkOrder(order).then((server) => {
          if (server) setGarage((state) => adoptServerId(state, "workOrder", id, server.id, server.number));
        });
      }
      return { ...current, workOrders: [order, ...current.workOrders] };
    });
    announce(`${number} has been opened`);
    return id;
  }, [announce, isConnected]);

  const updateCustomer = useCallback((customerId: string, changes: CustomerChanges) => {
    setGarage((current) => ({
      ...current,
      customers: current.customers.map((customer) => {
        if (customer.id !== customerId) return customer;
        const next = { ...customer, ...changes };
        if (changes.name) {
          next.initials = changes.name.trim().split(/\s+/).map((piece) => piece[0]).join("").slice(0, 2).toUpperCase();
        }
        return next;
      }),
    }));
    announce("Customer updated");
    if (isConnected) void pushCustomerUpdate(customerId, changes);
  }, [announce, isConnected]);

  const deleteCustomer = useCallback((customerId: string): string | null => {
    if (garageRef.current.vehicles.some((vehicle) => vehicle.customerId === customerId)) {
      return "Reassign or remove this customer's vehicles before deleting the profile.";
    }
    setGarage((current) => ({
      ...current,
      customers: current.customers.filter((customer) => customer.id !== customerId),
      workOrders: current.workOrders.filter((order) => order.customerId !== customerId),
      events: current.events.filter((event) => event.customerId !== customerId),
      invoices: current.invoices.filter((invoice) => invoice.customerId !== customerId),
    }));
    announce("Customer deleted");
    if (isConnected) void pushCustomerDelete(customerId);
    return null;
  }, [announce, isConnected]);

  const updateVehicle = useCallback((vehicleId: string, changes: VehicleChanges) => {
    setGarage((current) => ({
      ...current,
      vehicles: current.vehicles.map((vehicle) => vehicle.id === vehicleId ? { ...vehicle, ...changes } : vehicle),
    }));
    announce("Vehicle updated");
    if (isConnected) void pushVehicleUpdate(vehicleId, changes);
  }, [announce, isConnected]);

  const deleteVehicle = useCallback((vehicleId: string): string | null => {
    if (garageRef.current.workOrders.some((order) => order.vehicleId === vehicleId)) {
      return "This vehicle has work orders. Delete or reassign them first.";
    }
    setGarage((current) => ({
      ...current,
      vehicles: current.vehicles.filter((vehicle) => vehicle.id !== vehicleId),
      events: current.events.filter((event) => event.vehicleId !== vehicleId),
    }));
    announce("Vehicle deleted");
    if (isConnected) void pushVehicleDelete(vehicleId);
    return null;
  }, [announce, isConnected]);

  const updateVehicleStatus = useCallback((vehicleId: string, status: VehicleStatus) => {
    setGarage((current) => ({ ...current, vehicles: current.vehicles.map((vehicle) => vehicle.id === vehicleId ? { ...vehicle, status } : vehicle) }));
    announce(`Vehicle moved to ${status.toLowerCase()}`);
    if (isConnected) void pushVehicleStatus(vehicleId, status);
  }, [announce, isConnected]);

  const advanceWorkOrder = useCallback((workOrderId: string) => {
    setGarage((current) => {
      const active = current.workOrders.find((order) => order.id === workOrderId);
      if (!active || active.status === "Collected") return current;
      const status = statusAfter(active.status);
      if (isConnected) {
        void pushWorkOrderStatus(workOrderId, status);
        void pushVehicleStatus(active.vehicleId, status);
      }
      return {
        ...current,
        workOrders: current.workOrders.map((order) => order.id === workOrderId ? { ...order, status } : order),
        vehicles: current.vehicles.map((vehicle) => vehicle.id === active.vehicleId ? { ...vehicle, status } : vehicle),
      };
    });
    announce("Job moved to its next stage");
  }, [announce, isConnected]);

  const toggleChecklistItem = useCallback((workOrderId: string, index: number) => {
    setGarage((current) => ({
      ...current,
      workOrders: current.workOrders.map((order) => order.id !== workOrderId ? order : {
        ...order,
        checklist: order.checklist.map((item, itemIndex) => itemIndex === index ? { ...item, done: !item.done } : item),
      }),
    }));
  }, []);

  const adjustInventory = useCallback((inventoryId: string, amount: number) => {
    setGarage((current) => ({
      ...current,
      inventory: current.inventory.map((item) => item.id === inventoryId ? { ...item, quantity: Math.max(0, item.quantity + amount) } : item),
    }));
    announce(amount > 0 ? "Stock received" : "Stock adjusted");
    if (isConnected) void pushStockAdjustment(inventoryId, amount);
  }, [announce, isConnected]);

  const addInventoryItem = useCallback((input: Omit<InventoryItem, "id">) => {
    const id = makeId("i");
    const item: InventoryItem = { ...input, id };
    setGarage((current) => ({ ...current, inventory: [item, ...current.inventory] }));
    announce(`${input.name} added to inventory`);
    if (isConnected) {
      void pushInventoryItem(item).then((serverId) => {
        if (serverId) setGarage((current) => adoptServerId(current, "inventory", id, serverId));
      });
    }
  }, [announce, isConnected]);

  const addEvent = useCallback((input: NewEvent) => {
    const id = makeId("e");
    const event: CalendarEvent = { ...input, id };
    setGarage((current) => ({ ...current, events: [event, ...current.events] }));
    announce("Appointment scheduled");
    if (isConnected) {
      void pushAppointment(event).then((serverId) => {
        if (serverId) setGarage((current) => adoptServerId(current, "event", id, serverId));
      });
    }
  }, [announce, isConnected]);

  const addInvoice = useCallback((input: NewInvoice) => {
    if (!input.customerId || !input.lineItems.length) return null;
    const id = makeId("inv");
    const lineItems: InvoiceLineItem[] = input.lineItems.map((item) => ({
      ...item,
      total: Math.round(item.quantity * item.unitPrice * 100) / 100,
    }));
    const money = settleInvoice(lineItems, input.discount, input.taxRate, 0);
    let number = "";
    setGarage((current) => {
      number = `INV-${2400 + current.invoices.length + 1}`;
      const invoice: Invoice = {
        id,
        number,
        customerId: input.customerId,
        vehicleId: input.vehicleId ?? null,
        workOrderId: input.workOrderId ?? null,
        status: input.status,
        lineItems,
        subtotal: money.subtotal,
        discount: money.discount,
        taxRate: input.taxRate,
        taxAmount: money.taxAmount,
        total: money.total,
        amountPaid: 0,
        balanceDue: money.balanceDue,
        issuedAt: dateLabel.format(new Date()),
        payments: [],
      };
      if (isConnected) {
        void pushInvoice(invoice).then((server) => {
          if (server) setGarage((state) => adoptServerId(state, "invoice", id, server.id, server.number));
        });
      }
      return { ...current, invoices: [invoice, ...current.invoices] };
    });
    announce(`${number} created`);
    return id;
  }, [announce, isConnected]);

  const recordPayment = useCallback((invoiceId: string, amount: number, method: string) => {
    let applied = 0;
    setGarage((current) => ({
      ...current,
      invoices: current.invoices.map((invoice) => {
        if (invoice.id !== invoiceId) return invoice;
        applied = Math.min(amount, invoice.balanceDue);
        if (applied <= 0) return invoice;
        const amountPaid = Math.round((invoice.amountPaid + applied) * 100) / 100;
        const balanceDue = Math.max(Math.round((invoice.total - amountPaid) * 100) / 100, 0);
        return {
          ...invoice,
          amountPaid,
          balanceDue,
          status: balanceDue === 0 ? "paid" : "partial",
          payments: [...invoice.payments, { id: makeId("pay"), amount: applied, method, paidAt: dateLabel.format(new Date()) }],
        };
      }),
    }));
    if (applied <= 0) return;
    announce("Payment recorded");
    // Send the capped amount the client actually applied; the server rejects
    // any payment above the outstanding balance with a 422.
    if (isConnected) void pushPayment(invoiceId, applied, method);
  }, [announce, isConnected]);

  const updateSettings = useCallback((changes: Partial<GarageSettings>) => {
    setGarage((current) => {
      const settings = { ...current.settings, ...changes };
      if (isConnected) void pushSettings(settings);
      return { ...current, settings };
    });
    announce("Settings saved");
  }, [announce, isConnected]);

  const resetDemo = useCallback(() => {
    if (isConnected) {
      void pushDemoReset().then((workspace) => {
        setGarage(workspace ?? seedGarage);
        announce("Demo workspace restored");
      });
      return;
    }
    setGarage(seedGarage);
    announce("Demo workspace restored");
  }, [announce, isConnected]);

  const value = useMemo<GarageContextValue>(() => ({
    ...garage,
    connection,
    toast,
    dismissToast: () => setToast(null),
    addVehicle,
    addCustomer,
    addWorkOrder,
    updateCustomer,
    deleteCustomer,
    updateVehicle,
    deleteVehicle,
    updateVehicleStatus,
    advanceWorkOrder,
    toggleChecklistItem,
    adjustInventory,
    addInventoryItem,
    addEvent,
    addInvoice,
    recordPayment,
    updateSettings,
    resetDemo,
  }), [garage, connection, toast, addVehicle, addCustomer, addWorkOrder, updateCustomer, deleteCustomer, updateVehicle, deleteVehicle, updateVehicleStatus, advanceWorkOrder, toggleChecklistItem, adjustInventory, addInventoryItem, addEvent, addInvoice, recordPayment, updateSettings, resetDemo]);

  return <GarageContext.Provider value={value}>{children}</GarageContext.Provider>;
}

export function useGarage() {
  const garage = useContext(GarageContext);
  if (!garage) throw new Error("useGarage must be used within GarageProvider");
  return garage;
}

export const formatMoney = (amount: number, currency: GarageSettings["currency"] = "INR") => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency,
  maximumFractionDigits: 0,
}).format(amount);

export const formatDate = (value: string) => dateLabel.format(new Date(value));

/** Local calendar day as YYYY-MM-DD. Avoids the UTC skew of toISOString(). */
export const toLocalISO = (date: Date) => {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 10);
};

/** Today in the device's local timezone, not UTC. */
export const todayISO = () => toLocalISO(new Date());
