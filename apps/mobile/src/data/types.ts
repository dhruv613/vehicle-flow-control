export type VehicleStatus = "Waiting" | "In service" | "Quality check" | "Ready" | "Collected";
export type JobPriority = "Standard" | "Priority" | "Urgent";
export type ScreenName =
  | "dashboard"
  | "vehicles"
  | "customers"
  | "workorders"
  | "calendar"
  | "inventory"
  | "settings";

export interface Customer {
  id: string;
  name: string;
  initials: string;
  phone: string;
  email: string;
  joinedAt: string;
  totalVisits: number;
  lifetimeValue: number;
  note?: string;
}

export interface Vehicle {
  id: string;
  customerId: string;
  make: string;
  model: string;
  year: number;
  plate: string;
  colour: string;
  odometer: number;
  status: VehicleStatus;
  lastService: string;
  nextService: string;
  imageTone: "dark" | "red" | "sand" | "gray" | "blue";
}

export interface WorkOrder {
  id: string;
  number: string;
  customerId: string;
  vehicleId: string;
  title: string;
  service: string;
  technician: string;
  bay: string;
  status: VehicleStatus;
  priority: JobPriority;
  estimate: number;
  dueAt: string;
  startedAt: string;
  checklist: { label: string; done: boolean }[];
  note?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  reorderAt: number;
  unit: string;
  price: number;
  supplier: string;
}

export interface CalendarEvent {
  id: string;
  date: string;
  time: string;
  title: string;
  customerId: string;
  vehicleId: string;
  technician: string;
  duration: string;
  kind: "Drop-off" | "Service" | "Collection" | "Inspection";
}

export interface GarageSettings {
  garageName: string;
  ownerName: string;
  phone: string;
  address: string;
  currency: "INR" | "USD" | "GBP";
  serviceReminders: boolean;
  dailyDigest: boolean;
  compactNumbers: boolean;
}

export interface GarageState {
  customers: Customer[];
  vehicles: Vehicle[];
  workOrders: WorkOrder[];
  inventory: InventoryItem[];
  events: CalendarEvent[];
  settings: GarageSettings;
}
