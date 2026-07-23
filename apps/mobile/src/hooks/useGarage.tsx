import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { checkApiConnection, loadRemoteWorkspace, type ConnectionState } from "../data/garageRepository";
import { seedGarage } from "../data/seed";
import type { CalendarEvent, Customer, GarageSettings, GarageState, InventoryItem, Vehicle, VehicleStatus, WorkOrder } from "../data/types";

type NewVehicle = Omit<Vehicle, "id" | "lastService" | "nextService" | "imageTone"> & Partial<Pick<Vehicle, "lastService" | "nextService" | "imageTone">>;
type NewCustomer = Omit<Customer, "id" | "initials" | "joinedAt" | "totalVisits" | "lifetimeValue"> & Partial<Pick<Customer, "initials" | "joinedAt" | "totalVisits" | "lifetimeValue">>;
type NewWorkOrder = Omit<WorkOrder, "id" | "number" | "startedAt" | "checklist"> & Partial<Pick<WorkOrder, "startedAt" | "checklist">>;
type NewEvent = Omit<CalendarEvent, "id">;

interface GarageContextValue extends GarageState {
  connection: ConnectionState;
  toast: string | null;
  dismissToast: () => void;
  addVehicle: (vehicle: NewVehicle) => string;
  addCustomer: (customer: NewCustomer) => string;
  addWorkOrder: (order: NewWorkOrder) => string;
  updateVehicleStatus: (vehicleId: string, status: VehicleStatus) => void;
  advanceWorkOrder: (workOrderId: string) => void;
  toggleChecklistItem: (workOrderId: string, index: number) => void;
  adjustInventory: (inventoryId: string, amount: number) => void;
  addInventoryItem: (item: Omit<InventoryItem, "id">) => void;
  addEvent: (event: NewEvent) => void;
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

export function GarageProvider({ children }: PropsWithChildren) {
  const [garage, setGarage] = useState<GarageState>(seedGarage);
  const [toast, setToast] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("local");

  useEffect(() => {
    void (async () => {
      const nextConnection = await checkApiConnection();
      setConnection(nextConnection);
      if (nextConnection === "connected") {
        const remoteWorkspace = await loadRemoteWorkspace();
        if (remoteWorkspace) setGarage(remoteWorkspace);
      }
    })();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const announce = useCallback((message: string) => setToast(message), []);

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
    return id;
  }, [announce]);

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
    return id;
  }, [announce]);

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
      return { ...current, workOrders: [order, ...current.workOrders] };
    });
    announce(`${number} has been opened`);
    return id;
  }, [announce]);

  const updateVehicleStatus = useCallback((vehicleId: string, status: VehicleStatus) => {
    setGarage((current) => ({ ...current, vehicles: current.vehicles.map((vehicle) => vehicle.id === vehicleId ? { ...vehicle, status } : vehicle) }));
    announce(`Vehicle moved to ${status.toLowerCase()}`);
  }, [announce]);

  const advanceWorkOrder = useCallback((workOrderId: string) => {
    setGarage((current) => {
      const active = current.workOrders.find((order) => order.id === workOrderId);
      if (!active || active.status === "Collected") return current;
      const status = statusAfter(active.status);
      return {
        ...current,
        workOrders: current.workOrders.map((order) => order.id === workOrderId ? { ...order, status } : order),
        vehicles: current.vehicles.map((vehicle) => vehicle.id === active.vehicleId ? { ...vehicle, status } : vehicle),
      };
    });
    announce("Job moved to its next stage");
  }, [announce]);

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
  }, [announce]);

  const addInventoryItem = useCallback((input: Omit<InventoryItem, "id">) => {
    setGarage((current) => ({ ...current, inventory: [{ ...input, id: makeId("i") }, ...current.inventory] }));
    announce(`${input.name} added to inventory`);
  }, [announce]);

  const addEvent = useCallback((input: NewEvent) => {
    setGarage((current) => ({ ...current, events: [{ ...input, id: makeId("e") }, ...current.events] }));
    announce("Appointment scheduled");
  }, [announce]);

  const updateSettings = useCallback((changes: Partial<GarageSettings>) => {
    setGarage((current) => ({ ...current, settings: { ...current.settings, ...changes } }));
    announce("Settings saved locally");
  }, [announce]);

  const resetDemo = useCallback(() => {
    setGarage(seedGarage);
    announce("Demo workspace restored");
  }, [announce]);

  const value = useMemo<GarageContextValue>(() => ({
    ...garage,
    connection,
    toast,
    dismissToast: () => setToast(null),
    addVehicle,
    addCustomer,
    addWorkOrder,
    updateVehicleStatus,
    advanceWorkOrder,
    toggleChecklistItem,
    adjustInventory,
    addInventoryItem,
    addEvent,
    updateSettings,
    resetDemo,
  }), [garage, connection, toast, addVehicle, addCustomer, addWorkOrder, updateVehicleStatus, advanceWorkOrder, toggleChecklistItem, adjustInventory, addInventoryItem, addEvent, updateSettings, resetDemo]);

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
