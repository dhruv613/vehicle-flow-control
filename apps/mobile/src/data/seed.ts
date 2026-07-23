import type { GarageState } from "./types";

export const seedGarage: GarageState = {
  customers: [
    { id: "c-1", name: "Aarav Mehta", initials: "AM", phone: "+91 98765 10244", email: "aarav@studioarc.in", joinedAt: "2025-01-14", totalVisits: 8, lifetimeValue: 48600, note: "Prefers collection updates on WhatsApp." },
    { id: "c-2", name: "Maya Kapoor", initials: "MK", phone: "+91 98200 88371", email: "maya.k@example.com", joinedAt: "2025-03-21", totalVisits: 4, lifetimeValue: 18900 },
    { id: "c-3", name: "Rohan Shah", initials: "RS", phone: "+91 99870 44721", email: "rohan@meridian.co", joinedAt: "2024-11-09", totalVisits: 12, lifetimeValue: 73400, note: "Fleet contact for Meridian Design." },
    { id: "c-4", name: "Nisha Iyer", initials: "NI", phone: "+91 98198 73912", email: "nisha.iyer@example.com", joinedAt: "2025-05-02", totalVisits: 2, lifetimeValue: 9400 },
    { id: "c-5", name: "Dev Malhotra", initials: "DM", phone: "+91 98922 67301", email: "dev.m@example.com", joinedAt: "2025-02-18", totalVisits: 6, lifetimeValue: 31800 },
  ],
  vehicles: [
    { id: "v-1", customerId: "c-1", make: "Porsche", model: "Macan GTS", year: 2022, plate: "MH 01 EK 4412", colour: "Volcano Grey", odometer: 28560, status: "In service", lastService: "12 Jan 2026", nextService: "12 Jul 2026", imageTone: "dark" },
    { id: "v-2", customerId: "c-2", make: "Mercedes-Benz", model: "C 300", year: 2023, plate: "MH 02 BX 0821", colour: "Polar White", odometer: 14930, status: "Waiting", lastService: "30 Nov 2025", nextService: "30 May 2026", imageTone: "sand" },
    { id: "v-3", customerId: "c-3", make: "BMW", model: "X5 xDrive40i", year: 2021, plate: "MH 01 DT 1118", colour: "Carbon Black", odometer: 42120, status: "Quality check", lastService: "19 Dec 2025", nextService: "19 Jun 2026", imageTone: "blue" },
    { id: "v-4", customerId: "c-4", make: "MINI", model: "Cooper S", year: 2022, plate: "MH 03 JC 8674", colour: "Chili Red", odometer: 21890, status: "Ready", lastService: "02 Jan 2026", nextService: "02 Jul 2026", imageTone: "red" },
    { id: "v-5", customerId: "c-5", make: "Audi", model: "Q5 Technology", year: 2020, plate: "MH 01 RH 5530", colour: "Mythos Black", odometer: 55200, status: "Waiting", lastService: "14 Dec 2025", nextService: "14 Jun 2026", imageTone: "gray" },
    { id: "v-6", customerId: "c-3", make: "Volvo", model: "XC60 B5", year: 2024, plate: "MH 02 NU 9012", colour: "Crystal White", odometer: 8270, status: "Collected", lastService: "11 Jan 2026", nextService: "11 Jul 2026", imageTone: "sand" },
  ],
  workOrders: [
    { id: "wo-1", number: "WO-2481", customerId: "c-1", vehicleId: "v-1", title: "Annual service & diagnostics", service: "Scheduled maintenance", technician: "Arjun Rao", bay: "Bay 02", status: "In service", priority: "Priority", estimate: 18400, dueAt: "Today, 16:30", startedAt: "09:10", checklist: [{ label: "Digital inspection", done: true }, { label: "Engine oil & filter", done: true }, { label: "Brake fluid inspection", done: false }, { label: "Road test", done: false }], note: "Customer asked to inspect a faint vibration above 80 km/h." },
    { id: "wo-2", number: "WO-2482", customerId: "c-3", vehicleId: "v-3", title: "Brake package", service: "Brakes & tyres", technician: "Kabir Singh", bay: "Bay 04", status: "Quality check", priority: "Standard", estimate: 26800, dueAt: "Today, 17:15", startedAt: "10:00", checklist: [{ label: "Front pads replaced", done: true }, { label: "Rotor measurement", done: true }, { label: "Brake bedding road test", done: false }], note: "Awaiting final road-test sign-off." },
    { id: "wo-3", number: "WO-2483", customerId: "c-4", vehicleId: "v-4", title: "AC performance check", service: "Air conditioning", technician: "Mira Patel", bay: "Bay 01", status: "Ready", priority: "Standard", estimate: 6400, dueAt: "Today, 14:00", startedAt: "08:50", checklist: [{ label: "Cabin filter replaced", done: true }, { label: "Pressure test", done: true }, { label: "Sanitisation", done: true }], note: "Ready for collection." },
    { id: "wo-4", number: "WO-2484", customerId: "c-2", vehicleId: "v-2", title: "Pre-trip inspection", service: "Inspection", technician: "Arjun Rao", bay: "Bay 03", status: "Waiting", priority: "Urgent", estimate: 3200, dueAt: "Today, 18:00", startedAt: "—", checklist: [{ label: "Vehicle check-in", done: false }, { label: "Tyre condition", done: false }, { label: "Fluid levels", done: false }], note: "Drop-off expected at 13:30." },
    { id: "wo-5", number: "WO-2485", customerId: "c-5", vehicleId: "v-5", title: "Front suspension noise", service: "Diagnostics", technician: "Kabir Singh", bay: "Bay 05", status: "Waiting", priority: "Priority", estimate: 12500, dueAt: "Tomorrow, 12:00", startedAt: "—", checklist: [{ label: "Noise replication", done: false }, { label: "Suspension inspection", done: false }], note: "Call customer before any replacement parts are ordered." },
  ],
  inventory: [
    { id: "i-1", name: "5W-30 Fully Synthetic Oil", sku: "OIL-5W30-05", category: "Fluids", quantity: 18, reorderAt: 12, unit: "L", price: 980, supplier: "Mobil Trade" },
    { id: "i-2", name: "Cabin Air Filter — Premium", sku: "FLT-CAB-410", category: "Filters", quantity: 5, reorderAt: 8, unit: "pcs", price: 1220, supplier: "Mann + Hummel" },
    { id: "i-3", name: "Ceramic Brake Pad Set", sku: "BRK-CER-392", category: "Brakes", quantity: 2, reorderAt: 4, unit: "sets", price: 8450, supplier: "Brembo India" },
    { id: "i-4", name: "DOT 4 Brake Fluid", sku: "FLD-DOT4-01", category: "Fluids", quantity: 14, reorderAt: 10, unit: "L", price: 760, supplier: "Bosch Automotive" },
    { id: "i-5", name: "Wheel Alignment Weight", sku: "WAL-STR-100", category: "Workshop", quantity: 76, reorderAt: 30, unit: "pcs", price: 18, supplier: "Torque Tools" },
    { id: "i-6", name: "Engine Air Filter — SUV", sku: "FLT-ENG-880", category: "Filters", quantity: 3, reorderAt: 6, unit: "pcs", price: 2480, supplier: "Mann + Hummel" },
  ],
  events: [
    { id: "e-1", date: "2026-07-23", time: "09:00", title: "Macan GTS — annual service", customerId: "c-1", vehicleId: "v-1", technician: "Arjun Rao", duration: "5h 30m", kind: "Service" },
    { id: "e-2", date: "2026-07-23", time: "11:30", title: "BMW X5 — brake road test", customerId: "c-3", vehicleId: "v-3", technician: "Kabir Singh", duration: "45m", kind: "Inspection" },
    { id: "e-3", date: "2026-07-23", time: "13:30", title: "Mercedes C 300 — drop-off", customerId: "c-2", vehicleId: "v-2", technician: "Mira Patel", duration: "30m", kind: "Drop-off" },
    { id: "e-4", date: "2026-07-23", time: "16:00", title: "MINI Cooper S — collection", customerId: "c-4", vehicleId: "v-4", technician: "Mira Patel", duration: "20m", kind: "Collection" },
    { id: "e-5", date: "2026-07-24", time: "10:00", title: "Audi Q5 — diagnostics", customerId: "c-5", vehicleId: "v-5", technician: "Kabir Singh", duration: "2h", kind: "Service" },
    { id: "e-6", date: "2026-07-25", time: "09:30", title: "Volvo XC60 — inspection", customerId: "c-3", vehicleId: "v-6", technician: "Arjun Rao", duration: "1h", kind: "Inspection" },
  ],
  invoices: [
    {
      id: "inv-1", number: "INV-2401", customerId: "c-4", vehicleId: "v-4", workOrderId: "wo-3", status: "paid",
      lineItems: [
        { description: "AC performance check", quantity: 1, unitPrice: 4200, total: 4200 },
        { description: "Cabin filter — premium", quantity: 1, unitPrice: 1220, total: 1220 },
      ],
      subtotal: 5420, discount: 0, taxRate: 18, taxAmount: 975.6, total: 6395.6, amountPaid: 6395.6, balanceDue: 0,
      issuedAt: "22 Jul 2026", payments: [{ id: "pay-1", amount: 6395.6, method: "upi", paidAt: "22 Jul 2026" }],
    },
    {
      id: "inv-2", number: "INV-2402", customerId: "c-3", vehicleId: "v-3", workOrderId: "wo-2", status: "issued",
      lineItems: [
        { description: "Ceramic brake pad set", quantity: 1, unitPrice: 8450, total: 8450 },
        { description: "Brake labour & road test", quantity: 2.5, unitPrice: 1200, total: 3000 },
      ],
      subtotal: 11450, discount: 450, taxRate: 18, taxAmount: 1980, total: 12980, amountPaid: 0, balanceDue: 12980,
      issuedAt: "23 Jul 2026", payments: [],
    },
    {
      id: "inv-3", number: "INV-2403", customerId: "c-1", vehicleId: "v-1", workOrderId: "wo-1", status: "partial",
      lineItems: [
        { description: "Annual service package", quantity: 1, unitPrice: 14200, total: 14200 },
        { description: "5W-30 fully synthetic oil", quantity: 5, unitPrice: 980, total: 4900 },
      ],
      subtotal: 19100, discount: 700, taxRate: 18, taxAmount: 3312, total: 21712, amountPaid: 10000, balanceDue: 11712,
      issuedAt: "23 Jul 2026", payments: [{ id: "pay-2", amount: 10000, method: "card", paidAt: "23 Jul 2026" }],
    },
  ],
  settings: { garageName: "Motorwise Garage", ownerName: "Alex Mercer", phone: "+91 22 4000 2020", address: "16 Khar West, Mumbai 400052", currency: "INR", serviceReminders: true, dailyDigest: true, compactNumbers: false },
};
