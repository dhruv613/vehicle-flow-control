import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import {
  Avatar,
  Card,
  Divider,
  EmptyState,
  FilterChips,
  FormField,
  Icon,
  IconButton,
  Label,
  MetricCard,
  PickerField,
  PrimaryButton,
  SearchInput,
  SectionHeader,
  Sheet,
  StatusBadge,
  ToggleRow,
  VehicleArt,
} from "../components/garageUi";
import { useAuth } from "../hooks/useAuth";
import { formatMoney, useGarage } from "../hooks/useGarage";
import type { CalendarEvent, Customer, InventoryItem, ScreenName, Vehicle, VehicleStatus, WorkOrder } from "../data/types";
import { colors, font, radius, spacing } from "../theme/tokens";

export interface ScreenProps {
  navigate: (screen: ScreenName) => void;
  isWide: boolean;
}

const vehicleStatuses = ["Waiting", "In service", "Quality check", "Ready", "Collected"] as const;
const priorityOptions = ["Standard", "Priority", "Urgent"] as const;
const eventKinds = ["Drop-off", "Service", "Collection", "Inspection"] as const;

const humanDate = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" });
const shortDate = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });

function customerFor(customers: Customer[], id: string) {
  return customers.find((customer) => customer.id === id);
}

function vehicleFor(vehicles: Vehicle[], id: string) {
  return vehicles.find((vehicle) => vehicle.id === id);
}

function vehicleName(vehicle: Vehicle | undefined) {
  return vehicle ? `${vehicle.make} ${vehicle.model}` : "Vehicle not found";
}

function stageIcon(status: VehicleStatus) {
  return {
    Waiting: "time-outline",
    "In service": "build-outline",
    "Quality check": "shield-checkmark-outline",
    Ready: "checkmark-circle-outline",
    Collected: "archive-outline",
  }[status] as "time-outline";
}

export function PageIntro({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return (
    <View style={styles.pageIntro}>
      <View style={styles.pageIntroCopy}>
        <Text style={styles.pageTitle}>{title}</Text>
        {detail ? <Text style={styles.pageDetail}>{detail}</Text> : null}
      </View>
      {action ? <View style={styles.pageAction}>{action}</View> : null}
    </View>
  );
}

export function PageScroll({ children }: { children: ReactNode }) {
  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pageScroll}>{children}</ScrollView>;
}

function ConnectionHint() {
  const { connection } = useGarage();
  const connected = connection === "connected";
  const local = connection === "local";
  return (
    <View style={[styles.connectionHint, connected && styles.connectionConnected]}>
      <View style={[styles.connectionDot, connected ? styles.connectionDotConnected : local ? styles.connectionDotLocal : styles.connectionDotOffline]} />
      <Text style={[styles.connectionText, connected && styles.connectionTextConnected]}>{connected ? "Live API" : local ? "Demo workspace" : "Offline workspace"}</Text>
    </View>
  );
}

export function DashboardScreen({ navigate, isWide }: ScreenProps) {
  const { settings, workOrders, vehicles, inventory, events, customers } = useGarage();
  const activeOrders = workOrders.filter((order) => order.status !== "Collected");
  const waiting = workOrders.filter((order) => order.status === "Waiting").length;
  const lowStock = inventory.filter((item) => item.quantity <= item.reorderAt);
  const grossValue = activeOrders.reduce((total, order) => total + order.estimate, 0);
  const today = new Date().toISOString().slice(0, 10);
  const todayEvents = events.filter((event) => event.date === today).sort((a, b) => a.time.localeCompare(b.time));
  const displayEvents = todayEvents.length ? todayEvents : events.slice(0, 4);
  const greetingName = settings.ownerName.split(" ")[0] || "there";

  return (
    <PageScroll>
      <View style={styles.dashboardWelcome}>
        <View>
          <Text style={styles.dashboardGreeting}>Hello, {greetingName}</Text>
          <Text style={styles.dashboardDate}>{humanDate.format(new Date())}</Text>
        </View>
        <ConnectionHint />
      </View>

      <View style={[styles.metricGrid, isWide && styles.metricGridWide]}>
        <MetricCard label="Active jobs" value={String(activeOrders.length)} detail={`${waiting} waiting`} icon="construct-outline" onPress={() => navigate("workorders")} />
        <MetricCard label="Today" value={String(todayEvents.length || displayEvents.length)} detail="Appointments" icon="calendar-outline" onPress={() => navigate("calendar")} />
        <MetricCard label="Open value" value={formatMoney(grossValue, settings.currency)} detail="Active work" icon="wallet-outline" inverse onPress={() => navigate("billing")} />
        <MetricCard label="Low stock" value={String(lowStock.length)} detail={lowStock.length ? "Needs reordering" : "All healthy"} icon="cube-outline" onPress={() => navigate("inventory")} />
      </View>

      <View style={[styles.dashboardTwoColumn, isWide && styles.dashboardTwoColumnWide]}>
        <Card style={styles.flexCard}>
          <SectionHeader title="Today's schedule" action="Calendar" onAction={() => navigate("calendar")} />
          {displayEvents.length ? displayEvents.map((event, index) => {
            const vehicle = vehicleFor(vehicles, event.vehicleId);
            const customer = customerFor(customers, event.customerId);
            return (
              <View key={event.id}>
                {index ? <Divider /> : null}
                <Pressable onPress={() => navigate("calendar")} style={({ pressed }) => [styles.timelineRow, pressed && styles.pressed]}>
                  <View style={styles.timelineTime}><Text style={styles.timelineTimeText}>{event.time}</Text><View style={styles.timelineLine} /></View>
                  <View style={styles.timelineCopy}>
                    <Text style={styles.timelineTitle}>{event.title}</Text>
                    <Text style={styles.timelineDetail}>{vehicleName(vehicle)} · {customer?.name ?? "Customer"}</Text>
                  </View>
                  <StatusBadge status={event.kind} small />
                </Pressable>
              </View>
            );
          }) : <EmptyState icon="calendar-outline" title="Nothing booked" detail="Your next appointment will appear here." action="Schedule" onAction={() => navigate("calendar")} />}
        </Card>

        <Card style={styles.flexCard}>
          <SectionHeader title="Work orders" action="See all" onAction={() => navigate("workorders")} />
          {activeOrders.slice(0, 4).map((order, index) => {
            const vehicle = vehicleFor(vehicles, order.vehicleId);
            const customer = customerFor(customers, order.customerId);
            return (
              <View key={order.id}>
                {index ? <Divider /> : null}
                <Pressable onPress={() => navigate("workorders")} style={({ pressed }) => [styles.orderMiniRow, pressed && styles.pressed]}>
                  <VehicleArt tone={vehicle?.imageTone} size="small" />
                  <View style={styles.orderMiniCopy}>
                    <Text style={styles.orderMiniTitle}>{order.title}</Text>
                    <Text style={styles.orderMiniDetail}>{order.number} · {vehicleName(vehicle)} · {customer?.name ?? "Customer"}</Text>
                    <View style={styles.orderMiniMeta}><StatusBadge status={order.status} small /><Text style={styles.orderMiniMetaText}>{order.technician}</Text></View>
                  </View>
                  <Icon name="chevron-forward" size={19} color={colors.inkFaint} />
                </Pressable>
              </View>
            );
          })}
        </Card>
      </View>

      <Card>
        <SectionHeader title="Workshop stages" action="Open board" onAction={() => navigate("workorders")} />
        <View style={styles.stageGrid}>
          {vehicleStatuses.slice(0, 4).map((status) => {
            const count = workOrders.filter((order) => order.status === status).length;
            return (
              <Pressable key={status} onPress={() => navigate("workorders")} style={({ pressed }) => [styles.stageTile, pressed && styles.pressed]}>
                <View style={styles.stageIcon}><Icon name={stageIcon(status)} size={18} color={colors.ink} /></View>
                <Text style={styles.stageCount}>{count}</Text>
                <Text style={styles.stageLabel}>{status}</Text>
              </Pressable>
            );
          })}
        </View>
        {lowStock.length ? (
          <>
            <Divider />
            <View style={styles.urgentCallout}>
              <View style={styles.urgentIcon}><Icon name="alert-circle-outline" size={18} color={colors.error} /></View>
              <View style={styles.flexCopy}>
                <Text style={styles.urgentTitle}>{lowStock.length} part{lowStock.length > 1 ? "s" : ""} to reorder</Text>
                <Text style={styles.urgentDetail}>{lowStock[0].name}{lowStock.length > 1 ? ` and ${lowStock.length - 1} more` : ""}</Text>
              </View>
              <IconButton icon="arrow-forward" label="Open inventory" onPress={() => navigate("inventory")} />
            </View>
          </>
        ) : null}
      </Card>
    </PageScroll>
  );
}

export function VehiclesScreen({ navigate }: ScreenProps) {
  const { vehicles, customers, workOrders, updateVehicleStatus, addVehicle } = useGarage();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | VehicleStatus>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState("");
  const [draft, setDraft] = useState(() => makeVehicleDraft(customers[0]?.id ?? ""));
  // Derive from live state so status taps inside the sheet update instantly.
  const selected = vehicles.find((vehicle) => vehicle.id === selectedId) ?? null;

  const visibleVehicles = useMemo(() => vehicles.filter((vehicle) => {
    const matchesFilter = filter === "All" || vehicle.status === filter;
    const needle = search.trim().toLowerCase();
    const matchesSearch = !needle || `${vehicle.make} ${vehicle.model} ${vehicle.plate} ${vehicle.colour}`.toLowerCase().includes(needle);
    return matchesFilter && matchesSearch;
  }), [vehicles, filter, search]);

  const openAdd = () => {
    setFormError("");
    setDraft(makeVehicleDraft(customers[0]?.id ?? ""));
    setAdding(true);
  };
  const saveVehicle = () => {
    if (!draft.customerId || !draft.make.trim() || !draft.model.trim() || !draft.plate.trim()) {
      setFormError("Choose an owner and complete the make, model and registration.");
      return;
    }
    addVehicle({
      customerId: draft.customerId,
      make: draft.make.trim(),
      model: draft.model.trim(),
      year: Number(draft.year) || new Date().getFullYear(),
      plate: draft.plate.trim().toUpperCase(),
      colour: draft.colour.trim() || "Not recorded",
      odometer: Number(draft.odometer) || 0,
      status: "Waiting",
    });
    setAdding(false);
  };

  return (
    <PageScroll>
      <PageIntro title="Vehicles" detail="Every car in the workshop." action={<PrimaryButton label="Add vehicle" icon="add" onPress={openAdd} compact />} />
      <SearchInput value={search} onChangeText={setSearch} placeholder="Search registration, model or colour" />
      <View style={styles.filterSpacer}><FilterChips options={["All", ...vehicleStatuses] as const} selected={filter} onChange={setFilter} /></View>
      <View style={styles.listCaption}><Text style={styles.listCaptionText}>{visibleVehicles.length} vehicle{visibleVehicles.length === 1 ? "" : "s"} shown</Text><Text style={styles.listCaptionHint}>Tap a card to update status</Text></View>
      <View style={styles.cardList}>
        {visibleVehicles.map((vehicle) => {
          const owner = customerFor(customers, vehicle.customerId);
          const openOrders = workOrders.filter((order) => order.vehicleId === vehicle.id && order.status !== "Collected");
          return (
            <Pressable key={vehicle.id} onPress={() => setSelectedId(vehicle.id)} style={({ pressed }) => [styles.vehicleCard, pressed && styles.pressed]}>
              <VehicleArt tone={vehicle.imageTone} />
              <View style={styles.vehicleCardCopy}>
                <View style={styles.rowBetween}><Text style={styles.vehicleCardTitle}>{vehicle.make} {vehicle.model}</Text><StatusBadge status={vehicle.status} small /></View>
                <Text style={styles.vehiclePlate}>{vehicle.plate}</Text>
                <Text style={styles.vehicleCardDetail}>{vehicle.year} · {vehicle.colour} · {vehicle.odometer.toLocaleString("en-IN")} km</Text>
                <View style={styles.ownerInline}><Avatar initials={owner?.initials ?? "?"} size={22} /><Text style={styles.ownerInlineText}>{owner?.name ?? "Unassigned owner"}</Text>{openOrders.length ? <Text style={styles.ownerInlineHint}>{openOrders.length} active job</Text> : null}</View>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.inkFaint} />
            </Pressable>
          );
        })}
      </View>
      {!visibleVehicles.length ? <EmptyState icon="car-outline" title="No vehicles found" detail="Try a different filter or add a vehicle to the register." action="Add vehicle" onAction={openAdd} /> : null}

      <Sheet visible={Boolean(selected)} onClose={() => setSelectedId(null)} title={selected ? `${selected.make} ${selected.model}` : "Vehicle"} subtitle={selected ? `${selected.plate} · ${selected.year} · ${selected.colour}` : undefined} footer={selected ? <PrimaryButton label="Open work orders" icon="construct-outline" onPress={() => { setSelectedId(null); navigate("workorders"); }} /> : undefined}>
        {selected ? <VehicleDetail vehicle={selected} customers={customers} workOrders={workOrders} onStatus={(status) => updateVehicleStatus(selected.id, status)} /> : null}
      </Sheet>
      <Sheet visible={adding} onClose={() => setAdding(false)} title="Add vehicle" subtitle="Create a clean record before the car reaches a bay." footer={<PrimaryButton label="Save vehicle" icon="checkmark" onPress={saveVehicle} />}>
        {formError ? <FormError text={formError} /> : null}
        <OwnerPicker customers={customers} value={draft.customerId} onChange={(customerId) => setDraft((current) => ({ ...current, customerId }))} />
        <FormField label="Make" value={draft.make} onChangeText={(make) => setDraft((current) => ({ ...current, make }))} placeholder="e.g. Toyota" />
        <FormField label="Model" value={draft.model} onChangeText={(model) => setDraft((current) => ({ ...current, model }))} placeholder="e.g. Fortuner" />
        <View style={styles.formTwoCol}><View style={styles.formHalf}><FormField label="Model year" value={draft.year} onChangeText={(year) => setDraft((current) => ({ ...current, year }))} keyboardType="number-pad" placeholder="2024" /></View><View style={styles.formHalf}><FormField label="Registration" value={draft.plate} onChangeText={(plate) => setDraft((current) => ({ ...current, plate }))} autoCapitalize="characters" placeholder="MH 01 AB 1234" /></View></View>
        <View style={styles.formTwoCol}><View style={styles.formHalf}><FormField label="Colour" value={draft.colour} onChangeText={(colour) => setDraft((current) => ({ ...current, colour }))} placeholder="Pearl white" /></View><View style={styles.formHalf}><FormField label="Odometer" value={draft.odometer} onChangeText={(odometer) => setDraft((current) => ({ ...current, odometer }))} keyboardType="number-pad" placeholder="0" /></View></View>
      </Sheet>
    </PageScroll>
  );
}

function VehicleDetail({ vehicle, customers, workOrders, onStatus }: { vehicle: Vehicle; customers: Customer[]; workOrders: WorkOrder[]; onStatus: (status: VehicleStatus) => void }) {
  const owner = customerFor(customers, vehicle.customerId);
  const order = workOrders.find((item) => item.vehicleId === vehicle.id && item.status !== "Collected");
  return <View style={styles.sheetStack}>
    <View style={styles.vehicleDetailHero}><VehicleArt tone={vehicle.imageTone} /><View style={styles.flexCopy}><Text style={styles.detailHeroLabel}>Current location</Text><StatusBadge status={vehicle.status} /><Text style={styles.detailHeroText}>{order ? `${order.bay} · ${order.technician}` : "No active work order"}</Text></View></View>
    <Card><Label>Owner</Label><View style={styles.ownerDetail}><Avatar initials={owner?.initials ?? "?"} /><View><Text style={styles.ownerDetailName}>{owner?.name ?? "Unassigned"}</Text><Text style={styles.ownerDetailMeta}>{owner?.phone ?? "Add a customer contact"}</Text></View></View></Card>
    <Card><Label>Service details</Label><View style={styles.detailRows}><DetailRow label="Odometer" value={`${vehicle.odometer.toLocaleString("en-IN")} km`} /><DetailRow label="Last service" value={vehicle.lastService} /><DetailRow label="Next service" value={vehicle.nextService} /></View></Card>
    <View><Text style={styles.fieldLabel}>Move vehicle to</Text><View style={styles.statusChoiceGrid}>{vehicleStatuses.map((status) => <Pressable key={status} onPress={() => onStatus(status)} style={({ pressed }) => [styles.statusChoice, status === vehicle.status && styles.statusChoiceActive, pressed && styles.pressed]}><Icon name={stageIcon(status)} size={18} color={status === vehicle.status ? colors.surface : colors.ink} /><Text style={[styles.statusChoiceText, status === vehicle.status && styles.statusChoiceTextActive]}>{status}</Text></Pressable>)}</View></View>
  </View>;
}

export function CustomersScreen({ navigate }: ScreenProps) {
  const { customers, vehicles, workOrders, addCustomer } = useGarage();
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = customers.find((customer) => customer.id === selectedId) ?? null;
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({ name: "", phone: "", email: "", note: "" });
  const visible = customers.filter((customer) => !search.trim() || `${customer.name} ${customer.phone} ${customer.email}`.toLowerCase().includes(search.trim().toLowerCase()));
  const openAdd = () => { setDraft({ name: "", phone: "", email: "", note: "" }); setError(""); setAdding(true); };
  const save = () => {
    if (draft.name.trim().length < 2 || draft.phone.trim().length < 5) { setError("A customer name and a reachable phone number are required."); return; }
    addCustomer({ name: draft.name.trim(), phone: draft.phone.trim(), email: draft.email.trim(), note: draft.note.trim() || undefined });
    setAdding(false);
  };

  return <PageScroll>
    <PageIntro title="Customers" detail="Contacts, vehicles and history." action={<PrimaryButton label="Add customer" icon="person-add-outline" onPress={openAdd} compact />} />
    <SearchInput value={search} onChangeText={setSearch} placeholder="Search customers or phone numbers" />
    <View style={styles.customerSummary}><Text style={styles.customerSummaryStrong}>{customers.length} customer{customers.length === 1 ? "" : "s"}</Text><Text style={styles.customerSummaryText}>· {customers.reduce((total, customer) => total + customer.totalVisits, 0)} recorded visits</Text></View>
    <View style={styles.cardList}>{visible.map((customer) => {
      const ownedVehicles = vehicles.filter((vehicle) => vehicle.customerId === customer.id);
      const activeJobs = workOrders.filter((order) => order.customerId === customer.id && order.status !== "Collected");
      return <Pressable key={customer.id} onPress={() => setSelectedId(customer.id)} style={({ pressed }) => [styles.customerCard, pressed && styles.pressed]}>
        <Avatar initials={customer.initials} size={52} />
        <View style={styles.customerCardCopy}><View style={styles.rowBetween}><Text style={styles.customerName}>{customer.name}</Text>{activeJobs.length ? <StatusBadge status="In service" small /> : null}</View><Text style={styles.customerContact}>{customer.phone} · {customer.email || "No email"}</Text><Text style={styles.customerMeta}>{ownedVehicles.length} vehicle{ownedVehicles.length === 1 ? "" : "s"} · {customer.totalVisits} visit{customer.totalVisits === 1 ? "" : "s"} · {formatMoney(customer.lifetimeValue)}</Text></View><Icon name="chevron-forward" size={20} color={colors.inkFaint} />
      </Pressable>;
    })}</View>
    {!visible.length ? <EmptyState icon="people-outline" title="No customer found" detail="Search by a different name, email or phone number." action="Add customer" onAction={openAdd} /> : null}
    <Sheet visible={adding} onClose={() => setAdding(false)} title="Add customer" subtitle="Start a relationship with a useful, clean profile." footer={<PrimaryButton label="Save customer" icon="checkmark" onPress={save} />}>
      {error ? <FormError text={error} /> : null}<FormField label="Full name" value={draft.name} onChangeText={(name) => setDraft((current) => ({ ...current, name }))} placeholder="Customer name" /><FormField label="Phone" value={draft.phone} onChangeText={(phone) => setDraft((current) => ({ ...current, phone }))} keyboardType="phone-pad" placeholder="+91 ..." /><FormField label="Email" value={draft.email} onChangeText={(email) => setDraft((current) => ({ ...current, email }))} keyboardType="email-address" autoCapitalize="none" placeholder="customer@example.com" /><FormField label="Notes" value={draft.note} onChangeText={(note) => setDraft((current) => ({ ...current, note }))} placeholder="Preferences, fleet notes, collection instructions" multiline />
    </Sheet>
    <Sheet visible={Boolean(selected)} onClose={() => setSelectedId(null)} title={selected?.name ?? "Customer"} subtitle={selected ? `${selected.totalVisits} visits · member since ${selected.joinedAt}` : undefined} footer={<PrimaryButton label="View vehicles" icon="car-outline" onPress={() => { setSelectedId(null); navigate("vehicles"); }} />}>
      {selected ? <CustomerDetail customer={selected} vehicles={vehicles.filter((vehicle) => vehicle.customerId === selected.id)} orders={workOrders.filter((order) => order.customerId === selected.id)} /> : null}
    </Sheet>
  </PageScroll>;
}

function CustomerDetail({ customer, vehicles, orders }: { customer: Customer; vehicles: Vehicle[]; orders: WorkOrder[] }) {
  return <View style={styles.sheetStack}>
    <Card><Label>Contact</Label><View style={styles.detailRows}><DetailRow label="Phone" value={customer.phone} /><DetailRow label="Email" value={customer.email || "Not recorded"} /><DetailRow label="Lifetime value" value={formatMoney(customer.lifetimeValue)} /></View></Card>
    {customer.note ? <Card><Label>Front desk note</Label><Text style={styles.noteText}>{customer.note}</Text></Card> : null}
    <View><SectionHeader title="Vehicles" />{vehicles.length ? vehicles.map((vehicle) => <View key={vehicle.id} style={styles.compactVehicleRow}><VehicleArt tone={vehicle.imageTone} size="small" /><View style={styles.flexCopy}><Text style={styles.compactVehicleTitle}>{vehicle.make} {vehicle.model}</Text><Text style={styles.compactVehicleDetail}>{vehicle.plate} · {vehicle.odometer.toLocaleString("en-IN")} km</Text></View><StatusBadge status={vehicle.status} small /></View>) : <Text style={styles.mutedLine}>No vehicle has been recorded yet.</Text>}</View>
    <View><SectionHeader title="Recent work" />{orders.length ? orders.slice(0, 3).map((order) => <View key={order.id} style={styles.compactOrderRow}><View style={styles.orderNumberBox}><Text style={styles.orderNumberText}>{order.number.replace("WO-", "#")}</Text></View><View style={styles.flexCopy}><Text style={styles.compactVehicleTitle}>{order.title}</Text><Text style={styles.compactVehicleDetail}>{order.technician} · {formatMoney(order.estimate)}</Text></View><StatusBadge status={order.status} small /></View>) : <Text style={styles.mutedLine}>No work history has been recorded yet.</Text>}</View>
  </View>;
}

export function WorkOrdersScreen({ isWide }: ScreenProps) {
  const { workOrders, vehicles, customers, addWorkOrder, advanceWorkOrder, toggleChecklistItem, settings } = useGarage();
  const [filter, setFilter] = useState<"All" | VehicleStatus>("All");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = workOrders.find((order) => order.id === selectedId) ?? null;
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(() => makeOrderDraft(customers[0]?.id ?? "", vehicles[0]?.id ?? ""));
  const displayed = workOrders.filter((order) => (filter === "All" || order.status === filter) && (!search.trim() || `${order.number} ${order.title} ${order.technician}`.toLowerCase().includes(search.trim().toLowerCase())));
  const openAdd = () => { setDraft(makeOrderDraft(customers[0]?.id ?? "", vehicles[0]?.id ?? "")); setError(""); setAdding(true); };
  const save = () => {
    if (!draft.customerId || !draft.vehicleId || !draft.title.trim()) { setError("Choose a customer and vehicle, then name the work order."); return; }
    addWorkOrder({ customerId: draft.customerId, vehicleId: draft.vehicleId, title: draft.title.trim(), service: draft.service.trim() || "General service", technician: draft.technician.trim() || "Unassigned", bay: draft.bay, status: "Waiting", priority: draft.priority, estimate: Number(draft.estimate) || 0, dueAt: draft.dueAt || "To be scheduled", note: draft.note.trim() || undefined });
    setAdding(false);
  };

  return <PageScroll>
    <PageIntro title="Work orders" detail="Plan and progress service work." action={<PrimaryButton label="New work order" icon="add" onPress={openAdd} compact />} />
    <View style={[styles.workOrderControls, isWide && styles.workOrderControlsWide]}><View style={styles.workSearch}><SearchInput value={search} onChangeText={setSearch} placeholder="Search number, task or technician" /></View><View style={styles.workFilter}><FilterChips options={["All", ...vehicleStatuses] as const} selected={filter} onChange={setFilter} /></View></View>
    <View style={styles.workBoardHeader}><Text style={styles.listCaptionText}>{displayed.length} active and completed jobs</Text><Text style={styles.workBoardHint}>Tap a job to open its checklist</Text></View>
    <View style={styles.cardList}>{displayed.map((order) => {
      const vehicle = vehicleFor(vehicles, order.vehicleId);
      const customer = customerFor(customers, order.customerId);
      const completed = order.checklist.filter((item) => item.done).length;
      return <Pressable key={order.id} onPress={() => setSelectedId(order.id)} style={({ pressed }) => [styles.workCard, pressed && styles.pressed]}>
        <View style={styles.workCardHead}><View style={styles.workNumber}><Text style={styles.workNumberText}>{order.number}</Text></View><StatusBadge status={order.status} /><StatusBadge status={order.priority} small /></View>
        <View style={styles.workCardMain}><VehicleArt tone={vehicle?.imageTone} size="small" /><View style={styles.flexCopy}><Text style={styles.workTitle}>{order.title}</Text><Text style={styles.workDetail}>{vehicleName(vehicle)} · {customer?.name ?? "Customer"}</Text><Text style={styles.workMeta}>{order.technician} · {order.bay} · Due {order.dueAt}</Text></View></View>
        <View style={styles.workCardBottom}><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(8, (completed / Math.max(order.checklist.length, 1)) * 100)}%` }]} /></View><Text style={styles.progressText}>{completed}/{order.checklist.length} checks</Text><Text style={styles.workEstimate}>{formatMoney(order.estimate, settings.currency)}</Text></View>
      </Pressable>;
    })}</View>
    {!displayed.length ? <EmptyState icon="construct-outline" title="No work orders here" detail="Change the status filter or open a fresh work order." action="New work order" onAction={openAdd} /> : null}
    <Sheet visible={Boolean(selected)} onClose={() => setSelectedId(null)} title={selected ? `${selected.number} · ${selected.title}` : "Work order"} subtitle={selected ? `${vehicleName(vehicleFor(vehicles, selected.vehicleId))} · ${selected.technician}` : undefined} footer={selected ? <PrimaryButton label={selected.status === "Collected" ? "Job complete" : "Move to next stage"} icon="arrow-forward" disabled={selected.status === "Collected"} onPress={() => advanceWorkOrder(selected.id)} /> : undefined}>
      {selected ? <WorkOrderDetail order={selected} vehicles={vehicles} customers={customers} onToggle={(index) => toggleChecklistItem(selected.id, index)} /> : null}
    </Sheet>
    <Sheet visible={adding} onClose={() => setAdding(false)} title="New work order" subtitle="Give the team a precise brief before work begins." footer={<PrimaryButton label="Open work order" icon="checkmark" onPress={save} />}>
      {error ? <FormError text={error} /> : null}<OwnerPicker customers={customers} value={draft.customerId} onChange={(customerId) => { const firstVehicle = vehicles.find((vehicle) => vehicle.customerId === customerId); setDraft((current) => ({ ...current, customerId, vehicleId: firstVehicle?.id ?? "" })); }} /><VehiclePicker vehicles={vehicles.filter((vehicle) => vehicle.customerId === draft.customerId)} value={draft.vehicleId} onChange={(vehicleId) => setDraft((current) => ({ ...current, vehicleId }))} /><FormField label="Work order title" value={draft.title} onChangeText={(title) => setDraft((current) => ({ ...current, title }))} placeholder="e.g. Annual service and diagnostics" /><FormField label="Service type" value={draft.service} onChangeText={(service) => setDraft((current) => ({ ...current, service }))} placeholder="Scheduled maintenance" /><View style={styles.formTwoCol}><View style={styles.formHalf}><FormField label="Technician" value={draft.technician} onChangeText={(technician) => setDraft((current) => ({ ...current, technician }))} placeholder="Assign team member" /></View><View style={styles.formHalf}><FormField label="Bay" value={draft.bay} onChangeText={(bay) => setDraft((current) => ({ ...current, bay }))} placeholder="Bay 01" /></View></View><PickerField label="Priority" options={priorityOptions} value={draft.priority} onChange={(priority) => setDraft((current) => ({ ...current, priority }))} /><View style={styles.formTwoCol}><View style={styles.formHalf}><FormField label="Estimate" value={draft.estimate} onChangeText={(estimate) => setDraft((current) => ({ ...current, estimate }))} keyboardType="number-pad" placeholder="0" /></View><View style={styles.formHalf}><FormField label="Due at" value={draft.dueAt} onChangeText={(dueAt) => setDraft((current) => ({ ...current, dueAt }))} placeholder="Today, 17:00" /></View></View><FormField label="Front desk note" value={draft.note} onChangeText={(note) => setDraft((current) => ({ ...current, note }))} placeholder="Approval, parts, or customer update" multiline />
    </Sheet>
  </PageScroll>;
}

function WorkOrderDetail({ order, vehicles, customers, onToggle }: { order: WorkOrder; vehicles: Vehicle[]; customers: Customer[]; onToggle: (index: number) => void }) {
  const vehicle = vehicleFor(vehicles, order.vehicleId);
  const customer = customerFor(customers, order.customerId);
  const checked = order.checklist.filter((item) => item.done).length;
  return <View style={styles.sheetStack}>
    <View style={styles.orderDetailTop}><StatusBadge status={order.priority} /><View style={styles.flexCopy}><Text style={styles.orderDetailEstimate}>{formatMoney(order.estimate)}</Text><Text style={styles.orderDetailDue}>Due {order.dueAt}</Text></View></View>
    <Card><Label>Service brief</Label><Text style={styles.detailBriefTitle}>{order.service}</Text><Text style={styles.detailBriefCopy}>{order.note || "No additional front desk note has been added."}</Text><Divider /><View style={styles.serviceAssignment}><VehicleArt tone={vehicle?.imageTone} size="small" /><View style={styles.flexCopy}><Text style={styles.compactVehicleTitle}>{vehicleName(vehicle)}</Text><Text style={styles.compactVehicleDetail}>{customer?.name ?? "Customer"} · {order.bay} · {order.technician}</Text></View></View></Card>
    <View><View style={styles.checklistHeader}><Text style={styles.sectionTitle}>Inspection checklist</Text><Text style={styles.checklistProgress}>{checked}/{order.checklist.length} complete</Text></View><View style={styles.checklistBox}>{order.checklist.map((item, index) => <Pressable key={`${item.label}-${index}`} onPress={() => onToggle(index)} style={({ pressed }) => [styles.checklistRow, pressed && styles.pressed]}><View style={[styles.checkCircle, item.done && styles.checkCircleDone]}>{item.done ? <Icon name="checkmark" size={14} color={colors.surface} /> : null}</View><Text style={[styles.checkLabel, item.done && styles.checkLabelDone]}>{item.label}</Text></Pressable>)}</View></View>
  </View>;
}

export function CalendarScreen({ isWide }: ScreenProps) {
  const { events, vehicles, customers, addEvent } = useGarage();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(() => makeEventDraft(customers[0]?.id ?? "", vehicles[0]?.id ?? ""));
  const dateChoices = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() + index); return date;
  }), []);
  const listed = events.filter((event) => event.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));
  const openAdd = () => { setDraft(makeEventDraft(customers[0]?.id ?? "", vehicles[0]?.id ?? "", selectedDate)); setError(""); setAdding(true); };
  const save = () => {
    if (!draft.customerId || !draft.vehicleId || !draft.title.trim() || !draft.time.trim()) { setError("Choose a customer and vehicle, then give the appointment a title and time."); return; }
    addEvent({ date: draft.date, time: draft.time, title: draft.title.trim(), customerId: draft.customerId, vehicleId: draft.vehicleId, technician: draft.technician.trim() || "Unassigned", duration: draft.duration.trim() || "1h", kind: draft.kind });
    setAdding(false);
  };
  return <PageScroll>
    <PageIntro title="Calendar" detail="Drop-offs, services and collections." action={<PrimaryButton label="Schedule" icon="add" onPress={openAdd} compact />} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateStrip}>{dateChoices.map((date) => { const iso = date.toISOString().slice(0, 10); const active = iso === selectedDate; return <Pressable key={iso} onPress={() => setSelectedDate(iso)} style={({ pressed }) => [styles.dateChip, active && styles.dateChipActive, pressed && styles.pressed]}><Text style={[styles.dateChipWeekday, active && styles.dateChipTextActive]}>{date.toLocaleDateString("en-IN", { weekday: "short" })}</Text><Text style={[styles.dateChipNumber, active && styles.dateChipTextActive]}>{date.getDate()}</Text></Pressable>; })}</ScrollView>
    <View style={[styles.calendarHeadline, isWide && styles.calendarHeadlineWide]}><View><Text style={styles.calendarTitle}>{shortDate.format(new Date(`${selectedDate}T12:00:00`))}</Text><Text style={styles.calendarSub}>{listed.length} appointment{listed.length === 1 ? "" : "s"} scheduled</Text></View><PrimaryButton label="Today" icon="today-outline" onPress={() => setSelectedDate(new Date().toISOString().slice(0, 10))} variant="light" compact /></View>
    {listed.length ? <View style={styles.calendarList}>{listed.map((event) => <CalendarItem key={event.id} event={event} vehicles={vehicles} customers={customers} />)}</View> : <EmptyState icon="calendar-outline" title="This day is open" detail="Use the schedule button to reserve a drop-off, service slot or collection." action="Schedule visit" onAction={openAdd} />}
    <Sheet visible={adding} onClose={() => setAdding(false)} title="Schedule appointment" subtitle="Reserve a time slot and give the workshop context." footer={<PrimaryButton label="Schedule appointment" icon="checkmark" onPress={save} />}>
      {error ? <FormError text={error} /> : null}<OwnerPicker customers={customers} value={draft.customerId} onChange={(customerId) => { const firstVehicle = vehicles.find((vehicle) => vehicle.customerId === customerId); setDraft((current) => ({ ...current, customerId, vehicleId: firstVehicle?.id ?? "" })); }} /><VehiclePicker vehicles={vehicles.filter((vehicle) => vehicle.customerId === draft.customerId)} value={draft.vehicleId} onChange={(vehicleId) => setDraft((current) => ({ ...current, vehicleId }))} /><FormField label="Appointment title" value={draft.title} onChangeText={(title) => setDraft((current) => ({ ...current, title }))} placeholder="e.g. Annual service check-in" /><View style={styles.formTwoCol}><View style={styles.formHalf}><FormField label="Date (YYYY-MM-DD)" value={draft.date} onChangeText={(date) => setDraft((current) => ({ ...current, date }))} placeholder="2026-07-23" /></View><View style={styles.formHalf}><FormField label="Time" value={draft.time} onChangeText={(time) => setDraft((current) => ({ ...current, time }))} placeholder="10:30" /></View></View><View style={styles.formTwoCol}><View style={styles.formHalf}><FormField label="Technician" value={draft.technician} onChangeText={(technician) => setDraft((current) => ({ ...current, technician }))} placeholder="Assign team member" /></View><View style={styles.formHalf}><FormField label="Duration" value={draft.duration} onChangeText={(duration) => setDraft((current) => ({ ...current, duration }))} placeholder="1h 30m" /></View></View><PickerField label="Visit type" options={eventKinds} value={draft.kind} onChange={(kind) => setDraft((current) => ({ ...current, kind }))} />
    </Sheet>
  </PageScroll>;
}

function CalendarItem({ event, vehicles, customers }: { event: CalendarEvent; vehicles: Vehicle[]; customers: Customer[] }) {
  const vehicle = vehicleFor(vehicles, event.vehicleId); const customer = customerFor(customers, event.customerId);
  const kindIcon = { "Drop-off": "key-outline", Service: "construct-outline", Collection: "car-outline", Inspection: "search-outline" }[event.kind] as "key-outline";
  return <View style={styles.calendarItem}><View style={styles.calendarTime}><Text style={styles.calendarTimeValue}>{event.time}</Text><Text style={styles.calendarDuration}>{event.duration}</Text></View><View style={styles.calendarRail}><View style={styles.calendarRailDot} /><View style={styles.calendarRailLine} /></View><Card style={styles.calendarEventCard}><View style={styles.rowBetween}><View style={styles.calendarKind}><Icon name={kindIcon} size={15} color={colors.ink} /><Text style={styles.calendarKindText}>{event.kind}</Text></View><Text style={styles.calendarTech}>{event.technician}</Text></View><Text style={styles.calendarEventTitle}>{event.title}</Text><Text style={styles.calendarEventDetail}>{vehicleName(vehicle)} · {customer?.name ?? "Customer"}</Text></Card></View>;
}

export function InventoryScreen({ isWide }: ScreenProps) {
  const { inventory, settings, adjustInventory, addInventoryItem } = useGarage();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Low stock">("All");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(makeInventoryDraft());
  const displayed = inventory.filter((item) => (filter === "All" || item.quantity <= item.reorderAt) && (!search.trim() || `${item.name} ${item.sku} ${item.category}`.toLowerCase().includes(search.trim().toLowerCase())));
  const lowCount = inventory.filter((item) => item.quantity <= item.reorderAt).length;
  const stockValue = inventory.reduce((total, item) => total + item.quantity * item.price, 0);
  const openAdd = () => { setDraft(makeInventoryDraft()); setError(""); setAdding(true); };
  const save = () => { if (!draft.name.trim() || !draft.sku.trim()) { setError("Part name and SKU are required."); return; } addInventoryItem({ name: draft.name.trim(), sku: draft.sku.trim().toUpperCase(), category: draft.category.trim() || "General", quantity: Number(draft.quantity) || 0, reorderAt: Number(draft.reorderAt) || 0, unit: draft.unit.trim() || "pcs", price: Number(draft.price) || 0, supplier: draft.supplier.trim() || "Not recorded" }); setAdding(false); };
  return <PageScroll>
    <PageIntro title="Inventory" detail="Stock levels and reordering." action={<PrimaryButton label="Add part" icon="add" onPress={openAdd} compact />} />
    <View style={[styles.inventoryMetrics, isWide && styles.inventoryMetricsWide]}><View style={styles.inventoryMetric}><Text style={styles.inventoryMetricValue}>{inventory.length}</Text><Text style={styles.inventoryMetricLabel}>part lines</Text></View><View style={styles.inventoryMetric}><Text style={[styles.inventoryMetricValue, lowCount > 0 && { color: colors.error }]}>{lowCount}</Text><Text style={styles.inventoryMetricLabel}>need reorder</Text></View><View style={[styles.inventoryMetric, styles.inventoryMetricLast]}><Text numberOfLines={1} style={styles.inventoryMetricValue}>{formatMoney(stockValue, settings.currency)}</Text><Text style={styles.inventoryMetricLabel}>on-hand value</Text></View></View>
    <SearchInput value={search} onChangeText={setSearch} placeholder="Search part name or SKU" /><View style={styles.filterSpacer}><FilterChips options={["All", "Low stock"] as const} selected={filter} onChange={setFilter} /></View>
    <View style={styles.cardList}>{displayed.map((item) => <InventoryCard key={item.id} item={item} currency={settings.currency} onAdjust={(amount) => adjustInventory(item.id, amount)} />)}</View>
    {!displayed.length ? <EmptyState icon="cube-outline" title="No parts found" detail="Change the filter or add a new inventory item." action="Add part" onAction={openAdd} /> : null}
    <Sheet visible={adding} onClose={() => setAdding(false)} title="Add inventory part" subtitle="Create a stock line your team can count and reorder." footer={<PrimaryButton label="Save part" icon="checkmark" onPress={save} />}>
      {error ? <FormError text={error} /> : null}<FormField label="Part name" value={draft.name} onChangeText={(name) => setDraft((current) => ({ ...current, name }))} placeholder="e.g. Front brake pad set" /><FormField label="SKU" value={draft.sku} onChangeText={(sku) => setDraft((current) => ({ ...current, sku }))} autoCapitalize="characters" placeholder="BRK-FRT-001" /><View style={styles.formTwoCol}><View style={styles.formHalf}><FormField label="Category" value={draft.category} onChangeText={(category) => setDraft((current) => ({ ...current, category }))} placeholder="Brakes" /></View><View style={styles.formHalf}><FormField label="Supplier" value={draft.supplier} onChangeText={(supplier) => setDraft((current) => ({ ...current, supplier }))} placeholder="Supplier name" /></View></View><View style={styles.formThreeCol}><View style={styles.formThird}><FormField label="In stock" value={draft.quantity} onChangeText={(quantity) => setDraft((current) => ({ ...current, quantity }))} keyboardType="number-pad" placeholder="0" /></View><View style={styles.formThird}><FormField label="Reorder at" value={draft.reorderAt} onChangeText={(reorderAt) => setDraft((current) => ({ ...current, reorderAt }))} keyboardType="number-pad" placeholder="0" /></View><View style={styles.formThird}><FormField label="Unit" value={draft.unit} onChangeText={(unit) => setDraft((current) => ({ ...current, unit }))} placeholder="pcs" /></View></View><FormField label="Unit price" value={draft.price} onChangeText={(price) => setDraft((current) => ({ ...current, price }))} keyboardType="decimal-pad" placeholder="0" />
    </Sheet>
  </PageScroll>;
}

function InventoryCard({ item, currency, onAdjust }: { item: InventoryItem; currency: "INR" | "USD" | "GBP"; onAdjust: (amount: number) => void }) {
  const low = item.quantity <= item.reorderAt;
  return <Card style={styles.inventoryCard}><View style={styles.inventoryCardTop}><View style={styles.partIcon}><Icon name="cube-outline" size={21} color={colors.ink} /></View><View style={styles.flexCopy}><View style={styles.rowBetween}><Text style={styles.inventoryName}>{item.name}</Text>{low ? <StatusBadge status="Low stock" small /> : <Text style={styles.stockOkay}>In stock</Text>}</View><Text style={styles.inventorySku}>{item.sku} · {item.category} · {item.supplier}</Text></View></View><View style={styles.inventoryCardBottom}><View><Text style={styles.stockNumber}>{item.quantity} <Text style={styles.stockUnit}>{item.unit}</Text></Text><Text style={styles.reorderText}>Reorder at {item.reorderAt} {item.unit}</Text></View><View style={styles.stockActionGroup}><IconButton icon="remove" label={`Remove one ${item.name}`} onPress={() => onAdjust(-1)} /><View style={styles.stockPill}><Text style={styles.stockPillText}>{formatMoney(item.price, currency)}</Text></View><IconButton icon="add" label={`Add one ${item.name}`} onPress={() => onAdjust(1)} inverse /></View></View></Card>;
}

export function SettingsScreen() {
  const { settings, updateSettings, resetDemo, connection } = useGarage();
  const { user, signOut } = useAuth();
  const [draft, setDraft] = useState(settings);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => setDraft(settings), [settings]);
  const save = () => updateSettings(draft);
  return <PageScroll>
    <PageIntro title="Settings" detail="Business details and preferences." />
    <Card style={styles.settingsHero}><View style={styles.settingsHeroIcon}><Icon name="business-outline" size={25} color={colors.surface} /></View><View style={styles.flexCopy}><Text style={styles.settingsHeroTitle}>{settings.garageName}</Text><Text style={styles.settingsHeroDetail}>{settings.address}</Text></View><ConnectionHint /></Card>
    <View style={styles.settingsSection}><SectionHeader title="Account" /><Card><View style={styles.accountRow}><Avatar initials={(user?.name ?? "?").split(" ").map((piece) => piece[0]).join("").slice(0, 2).toUpperCase()} size={46} inverse /><View style={styles.flexCopy}><Text style={styles.settingsHeroTitle}>{user?.name ?? "Guest"}</Text><Text style={styles.settingsHeroDetail}>@{user?.username ?? "guest"} · {user?.role ?? "Team member"}</Text></View><PrimaryButton label="Sign out" icon="log-out-outline" variant="light" compact onPress={() => void signOut()} /></View></Card></View>
    <View style={styles.settingsSection}><SectionHeader title="Business details" /><Card><FormField label="Garage name" value={draft.garageName} onChangeText={(garageName) => setDraft((current) => ({ ...current, garageName }))} /><FormField label="Owner or manager" value={draft.ownerName} onChangeText={(ownerName) => setDraft((current) => ({ ...current, ownerName }))} /><FormField label="Phone" value={draft.phone} onChangeText={(phone) => setDraft((current) => ({ ...current, phone }))} keyboardType="phone-pad" /><FormField label="Workshop address" value={draft.address} onChangeText={(address) => setDraft((current) => ({ ...current, address }))} multiline /><PickerField label="Default currency" options={["INR", "USD", "GBP"] as const} value={draft.currency} onChange={(currency) => setDraft((current) => ({ ...current, currency }))} /></Card><PrimaryButton label="Save business details" icon="checkmark" onPress={save} style={styles.settingsSave} /></View>
    <View style={styles.settingsSection}><SectionHeader title="Notifications & display" /><Card><ToggleRow label="Service reminders" detail="Remind the desk about upcoming services." value={settings.serviceReminders} onValueChange={(serviceReminders) => updateSettings({ serviceReminders })} /><Divider /><ToggleRow label="Daily digest" detail="Show today's summary on the dashboard." value={settings.dailyDigest} onValueChange={(dailyDigest) => updateSettings({ dailyDigest })} /><Divider /><ToggleRow label="Compact numbers" detail="Abbreviate totals on small screens." value={settings.compactNumbers} onValueChange={(compactNumbers) => updateSettings({ compactNumbers })} /></Card></View>
    <View style={styles.settingsSection}><SectionHeader title="Demo workspace" /><Card><Text style={styles.demoTitle}>Restore the supplied garage data</Text><Text style={styles.demoDetail}>This resets locally created customers, jobs, appointments and inventory changes in this browser or Expo session.</Text><PrimaryButton label="Restore demo data" icon="refresh-outline" variant="danger" onPress={() => setConfirming(true)} compact style={styles.restoreButton} /></Card></View>
    <Sheet visible={confirming} onClose={() => setConfirming(false)} title="Restore demo workspace" subtitle="This action replaces the data in the current app session." footer={<PrimaryButton label="Yes, restore demo" icon="refresh-outline" variant="danger" onPress={() => { resetDemo(); setConfirming(false); }} />}><View style={styles.confirmCopy}><View style={styles.confirmIcon}><Icon name="alert-circle-outline" size={28} color={colors.error} /></View><Text style={styles.confirmTitle}>Start again with the supplied sample garage?</Text><Text style={styles.confirmDetail}>This is useful before a client demo. It cannot restore any changes made only in this local session.</Text></View></Sheet>
  </PageScroll>;
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.detailRowLabel}>{label}</Text><Text style={styles.detailRowValue}>{value}</Text></View>;
}

export function FormError({ text }: { text: string }) {
  return <View style={styles.formError}><Icon name="alert-circle-outline" size={18} color={colors.error} /><Text style={styles.formErrorText}>{text}</Text></View>;
}

export function OwnerPicker({ customers, value, onChange }: { customers: Customer[]; value: string; onChange: (value: string) => void }) {
  return <View style={styles.fieldGroup}><Text style={styles.fieldLabel}>Customer</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ownerPicker}>{customers.map((customer) => { const active = value === customer.id; return <Pressable key={customer.id} onPress={() => onChange(customer.id)} style={({ pressed }) => [styles.ownerPick, active && styles.ownerPickActive, pressed && styles.pressed]}><Avatar initials={customer.initials} size={25} inverse={active} /><Text numberOfLines={1} style={[styles.ownerPickText, active && styles.ownerPickTextActive]}>{customer.name}</Text></Pressable>; })}</ScrollView></View>;
}

export function VehiclePicker({ vehicles, value, onChange }: { vehicles: Vehicle[]; value: string; onChange: (value: string) => void }) {
  return <View style={styles.fieldGroup}><Text style={styles.fieldLabel}>Vehicle</Text>{vehicles.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ownerPicker}>{vehicles.map((vehicle) => { const active = value === vehicle.id; return <Pressable key={vehicle.id} onPress={() => onChange(vehicle.id)} style={({ pressed }) => [styles.vehiclePick, active && styles.vehiclePickActive, pressed && styles.pressed]}><VehicleArt tone={vehicle.imageTone} size="small" /><View style={styles.vehiclePickCopy}><Text numberOfLines={1} style={[styles.vehiclePickTitle, active && styles.ownerPickTextActive]}>{vehicle.make} {vehicle.model}</Text><Text style={[styles.vehiclePickPlate, active && styles.vehiclePickPlateActive]}>{vehicle.plate}</Text></View></Pressable>; })}</ScrollView> : <Text style={styles.noVehicleForCustomer}>This customer needs a vehicle before a work order or appointment can be opened.</Text>}</View>;
}

function makeVehicleDraft(customerId: string) { return { customerId, make: "", model: "", year: String(new Date().getFullYear()), plate: "", colour: "", odometer: "" }; }
function makeOrderDraft(customerId: string, vehicleId: string) { return { customerId, vehicleId, title: "", service: "", technician: "", bay: "Bay 01", priority: "Standard" as (typeof priorityOptions)[number], estimate: "", dueAt: "", note: "" }; }
function makeEventDraft(customerId: string, vehicleId: string, date = new Date().toISOString().slice(0, 10)) { return { customerId, vehicleId, title: "", date, time: "", technician: "", duration: "1h", kind: "Service" as (typeof eventKinds)[number] }; }
function makeInventoryDraft() { return { name: "", sku: "", category: "", quantity: "", reorderAt: "", unit: "pcs", price: "", supplier: "" }; }
function nextStatus(current: VehicleStatus): VehicleStatus { return vehicleStatuses[Math.min(vehicleStatuses.indexOf(current) + 1, vehicleStatuses.length - 1)]; }

const styles = StyleSheet.create({
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  pageScroll: { paddingBottom: 116, gap: 20 },
  pageIntro: { gap: 16 },
  pageIntroCopy: { gap: 6 },
  pageAction: { alignSelf: "flex-start" },
  pageTitle: { color: colors.ink, fontFamily: font.display, fontSize: 24, fontWeight: "800", letterSpacing: -0.3 },
  sectionTitle: { color: colors.ink, fontFamily: font.display, fontSize: 17, fontWeight: "800", letterSpacing: -0.2 },
  pageDetail: { color: colors.inkMuted, fontSize: 14, lineHeight: 20, maxWidth: 560 },
  dashboardWelcome: { gap: 12, paddingTop: 4 },
  dashboardGreeting: { color: colors.ink, fontFamily: font.display, fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  dashboardDate: { color: colors.inkMuted, fontSize: 13, marginTop: 5 },
  connectionHint: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.soft },
  connectionConnected: { backgroundColor: "#EAF8EF" }, connectionDot: { width: 7, height: 7, borderRadius: 4 }, connectionDotConnected: { backgroundColor: colors.success }, connectionDotLocal: { backgroundColor: colors.inkMuted }, connectionDotOffline: { backgroundColor: colors.error }, connectionText: { color: colors.inkMuted, fontSize: 11, fontWeight: "800" }, connectionTextConnected: { color: colors.success },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, metricGridWide: { gap: 14 },
  dashboardTwoColumn: { gap: 16 }, dashboardTwoColumnWide: { flexDirection: "row", alignItems: "stretch" }, flexCard: { flex: 1 },
  stageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginBottom: 18 }, stageTile: { flexGrow: 1, flexBasis: 124, minHeight: 119, borderRadius: 13, backgroundColor: colors.soft, padding: 12 }, stageIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, marginBottom: 11 }, stageCount: { color: colors.ink, fontFamily: font.display, fontSize: 20, fontWeight: "800" }, stageLabel: { color: colors.inkMuted, fontSize: 11, fontWeight: "700", marginTop: 4 },
  urgentCallout: { flexDirection: "row", gap: 11, alignItems: "center", paddingTop: 16 }, urgentIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#FBECEE", alignItems: "center", justifyContent: "center" }, urgentTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" }, urgentDetail: { color: colors.inkMuted, fontSize: 11, lineHeight: 16, marginTop: 3 }, flexCopy: { flex: 1, minWidth: 0 },
  timelineRow: { minHeight: 73, flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 11 }, timelineTime: { width: 45, alignSelf: "stretch", paddingTop: 2 }, timelineTimeText: { color: colors.ink, fontSize: 12, fontWeight: "800" }, timelineLine: { width: 1, flex: 1, backgroundColor: colors.line, alignSelf: "center", marginTop: 6 }, timelineCopy: { flex: 1, gap: 4 }, timelineTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" }, timelineDetail: { color: colors.inkMuted, fontSize: 11, lineHeight: 16 },
  orderMiniRow: { minHeight: 79, flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 11 }, orderMiniCopy: { flex: 1, minWidth: 0, gap: 4 }, orderMiniTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" }, orderMiniDetail: { color: colors.inkMuted, fontSize: 10.5, lineHeight: 15 }, orderMiniMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }, orderMiniMetaText: { color: colors.inkFaint, fontSize: 10.5, fontWeight: "700" },
  filterSpacer: { marginTop: -8 }, listCaption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: -3 }, listCaptionText: { color: colors.ink, fontSize: 12, fontWeight: "800" }, listCaptionHint: { color: colors.inkFaint, fontSize: 11 }, cardList: { gap: 10 },
  vehicleCard: { minHeight: 110, padding: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: radius.md, flexDirection: "row", alignItems: "center", gap: 12 }, vehicleCardCopy: { flex: 1, minWidth: 0, gap: 4 }, rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, vehicleCardTitle: { color: colors.ink, fontSize: 15, fontWeight: "800", flex: 1 }, vehiclePlate: { color: colors.inkMuted, fontSize: 11, fontWeight: "800", letterSpacing: 0.35 }, vehicleCardDetail: { color: colors.inkFaint, fontSize: 10.5 }, ownerInline: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }, ownerInlineText: { color: colors.inkMuted, fontSize: 10.5, fontWeight: "700" }, ownerInlineHint: { color: colors.info, fontSize: 10, fontWeight: "800" },
  sheetStack: { gap: 16 }, vehicleDetailHero: { flexDirection: "row", alignItems: "center", gap: 13 }, detailHeroLabel: { color: colors.inkFaint, fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 }, detailHeroText: { color: colors.inkMuted, fontSize: 12, marginTop: 7 }, ownerDetail: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 11 }, ownerDetailName: { color: colors.ink, fontSize: 14, fontWeight: "800" }, ownerDetailMeta: { color: colors.inkMuted, fontSize: 12, marginTop: 3 }, detailRows: { gap: 0, marginTop: 9 }, detailRow: { flexDirection: "row", justifyContent: "space-between", gap: 15, paddingTop: 11 }, detailRowLabel: { color: colors.inkMuted, fontSize: 12 }, detailRowValue: { color: colors.ink, fontSize: 12, fontWeight: "800", textAlign: "right", flexShrink: 1 }, statusChoiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 9 }, statusChoice: { flexGrow: 1, flexBasis: 130, minHeight: 45, borderRadius: 11, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 8 }, statusChoiceActive: { backgroundColor: colors.ink, borderColor: colors.ink }, statusChoiceText: { color: colors.ink, fontSize: 11, fontWeight: "800" }, statusChoiceTextActive: { color: colors.surface },
  formError: { flexDirection: "row", gap: 8, alignItems: "center", borderRadius: 12, backgroundColor: "#FBECEE", padding: 12, marginBottom: 15 }, formErrorText: { color: colors.error, flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "700" }, formTwoCol: { flexDirection: "row", gap: 10 }, formHalf: { flex: 1, minWidth: 0 }, formThreeCol: { flexDirection: "row", gap: 8 }, formThird: { flex: 1, minWidth: 0 }, fieldGroup: { gap: 7, marginBottom: 16 }, fieldLabel: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  customerSummary: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: -5 }, customerSummaryStrong: { color: colors.ink, fontSize: 12, fontWeight: "800" }, customerSummaryText: { color: colors.inkMuted, fontSize: 12 }, customerCard: { minHeight: 90, padding: 13, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", gap: 12 }, customerCardCopy: { flex: 1, minWidth: 0, gap: 4 }, customerName: { color: colors.ink, fontSize: 15, fontWeight: "800", flex: 1 }, customerContact: { color: colors.inkMuted, fontSize: 11 }, customerMeta: { color: colors.inkFaint, fontSize: 10.5, marginTop: 1 }, noteText: { color: colors.inkMuted, fontSize: 13, lineHeight: 19, marginTop: 10 }, compactVehicleRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9 }, compactVehicleTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" }, compactVehicleDetail: { color: colors.inkMuted, fontSize: 11, marginTop: 3 }, compactOrderRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9 }, orderNumberBox: { paddingVertical: 6, paddingHorizontal: 7, borderRadius: 8, backgroundColor: colors.soft }, orderNumberText: { color: colors.ink, fontSize: 10, fontWeight: "800" }, mutedLine: { color: colors.inkMuted, fontSize: 12, marginTop: 3 },
  workOrderControls: { gap: 11 }, workOrderControlsWide: { flexDirection: "row", alignItems: "center" }, workSearch: { flex: 1 }, workFilter: { maxWidth: "100%" }, workBoardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center", marginTop: -2 }, workBoardHint: { color: colors.inkFaint, fontSize: 11 }, workCard: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 12 }, workCardHead: { flexDirection: "row", alignItems: "center", gap: 7 }, workNumber: { backgroundColor: colors.ink, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5 }, workNumberText: { color: colors.surface, fontSize: 10, fontWeight: "800" }, workCardMain: { flexDirection: "row", alignItems: "center", gap: 11 }, workTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" }, workDetail: { color: colors.inkMuted, fontSize: 11, marginTop: 4 }, workMeta: { color: colors.inkFaint, fontSize: 10.5, marginTop: 4 }, workCardBottom: { flexDirection: "row", alignItems: "center", gap: 8 }, progressTrack: { flex: 1, height: 5, backgroundColor: colors.soft, borderRadius: 3, overflow: "hidden" }, progressFill: { height: "100%", backgroundColor: colors.ink, borderRadius: 3 }, progressText: { color: colors.inkFaint, fontSize: 10, fontWeight: "700" }, workEstimate: { color: colors.ink, fontSize: 11, fontWeight: "800" }, orderDetailTop: { flexDirection: "row", alignItems: "center", gap: 10 }, orderDetailEstimate: { color: colors.ink, fontFamily: font.display, fontSize: 20, fontWeight: "800", textAlign: "right" }, orderDetailDue: { color: colors.inkMuted, fontSize: 11, textAlign: "right", marginTop: 2 }, detailBriefTitle: { color: colors.ink, fontSize: 15, fontWeight: "800", marginTop: 10 }, detailBriefCopy: { color: colors.inkMuted, fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 14 }, serviceAssignment: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 14 }, checklistHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 10 }, checklistProgress: { color: colors.inkMuted, fontSize: 11, fontWeight: "800" }, checklistBox: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }, checklistRow: { minHeight: 54, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, checkCircle: { width: 23, height: 23, borderRadius: 12, borderWidth: 1.5, borderColor: "#B9B9B9", alignItems: "center", justifyContent: "center" }, checkCircleDone: { backgroundColor: colors.ink, borderColor: colors.ink }, checkLabel: { color: colors.ink, fontSize: 13, fontWeight: "700", flex: 1 }, checkLabelDone: { color: colors.inkMuted, textDecorationLine: "line-through" },
  dateStrip: { gap: 8, paddingRight: 16 }, dateChip: { width: 54, height: 62, borderRadius: 14, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center", gap: 3 }, dateChipActive: { backgroundColor: colors.ink }, dateChipWeekday: { color: colors.inkMuted, fontSize: 10, fontWeight: "800", textTransform: "uppercase" }, dateChipNumber: { color: colors.ink, fontSize: 18, fontWeight: "800" }, dateChipTextActive: { color: colors.surface }, calendarHeadline: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 15, marginTop: 2 }, calendarHeadlineWide: { marginTop: 6 }, calendarTitle: { color: colors.ink, fontFamily: font.display, fontSize: 18, fontWeight: "800" }, calendarSub: { color: colors.inkMuted, fontSize: 12, marginTop: 4 }, calendarList: { gap: 0 }, calendarItem: { minHeight: 116, flexDirection: "row", gap: 10 }, calendarTime: { width: 43, paddingTop: 17, alignItems: "flex-end" }, calendarTimeValue: { color: colors.ink, fontSize: 12, fontWeight: "800" }, calendarDuration: { color: colors.inkFaint, fontSize: 9.5, marginTop: 3 }, calendarRail: { width: 14, alignItems: "center" }, calendarRailDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ink, marginTop: 20 }, calendarRailLine: { width: 1, backgroundColor: colors.line, flex: 1 }, calendarEventCard: { flex: 1, padding: 13, marginBottom: 10 }, calendarKind: { flexDirection: "row", gap: 5, alignItems: "center" }, calendarKindText: { color: colors.ink, fontSize: 10.5, fontWeight: "800" }, calendarTech: { color: colors.inkFaint, fontSize: 10.5, fontWeight: "700" }, calendarEventTitle: { color: colors.ink, fontSize: 14, fontWeight: "800", marginTop: 10 }, calendarEventDetail: { color: colors.inkMuted, fontSize: 11, marginTop: 4 }, calendarFooterCard: { backgroundColor: colors.soft, borderRadius: radius.md, padding: 16, flexDirection: "row", gap: 11, alignItems: "flex-start" }, calendarFooterIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }, calendarFooterTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" }, calendarFooterDetail: { color: colors.inkMuted, fontSize: 11.5, lineHeight: 17, marginTop: 4 },
  inventoryMetrics: { borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.ink, flexDirection: "row" }, inventoryMetricsWide: { maxWidth: 680 }, inventoryMetric: { flex: 1, padding: 15, gap: 4, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: "#393939" }, inventoryMetricLast: { borderRightWidth: 0 }, inventoryMetricValue: { color: colors.surface, fontFamily: font.display, fontSize: 18, fontWeight: "800" }, inventoryMetricLabel: { color: "#ADADAD", fontSize: 10.5, fontWeight: "700" }, inventoryCard: { padding: 14, gap: 13 }, inventoryCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 }, partIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" }, inventoryName: { color: colors.ink, fontSize: 13.5, fontWeight: "800", flex: 1, marginRight: 8 }, inventorySku: { color: colors.inkMuted, fontSize: 10.5, marginTop: 4 }, stockOkay: { color: colors.success, fontSize: 10.5, fontWeight: "800" }, inventoryCardBottom: { paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }, stockNumber: { color: colors.ink, fontFamily: font.display, fontSize: 18, fontWeight: "800" }, stockUnit: { color: colors.inkMuted, fontSize: 12, fontFamily: font.body, fontWeight: "700" }, reorderText: { color: colors.inkFaint, fontSize: 10.5, marginTop: 2 }, stockActionGroup: { flexDirection: "row", alignItems: "center", gap: 6 }, stockPill: { paddingHorizontal: 8, paddingVertical: 7, backgroundColor: colors.soft, borderRadius: 9 }, stockPillText: { color: colors.ink, fontSize: 10.5, fontWeight: "800" },
  settingsHero: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.soft }, accountRow: { flexDirection: "row", alignItems: "center", gap: 12 }, settingsHeroIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }, settingsHeroTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" }, settingsHeroDetail: { color: colors.inkMuted, fontSize: 11, marginTop: 4 }, settingsSection: { gap: 10 }, settingsSave: { alignSelf: "flex-start" }, demoTitle: { color: colors.ink, fontSize: 14, fontWeight: "800", marginTop: 8 }, demoDetail: { color: colors.inkMuted, fontSize: 12, lineHeight: 18, marginTop: 5 }, restoreButton: { alignSelf: "flex-start", marginTop: 15 }, confirmCopy: { alignItems: "center", paddingHorizontal: 18, paddingVertical: 15 }, confirmIcon: { width: 57, height: 57, borderRadius: 18, backgroundColor: "#FBECEE", alignItems: "center", justifyContent: "center" }, confirmTitle: { color: colors.ink, fontFamily: font.display, fontSize: 18, fontWeight: "800", textAlign: "center", marginTop: 16 }, confirmDetail: { color: colors.inkMuted, fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 8 },
  ownerPicker: { gap: 8, paddingRight: 12 }, ownerPick: { minWidth: 116, height: 42, borderRadius: 12, paddingHorizontal: 8, flexDirection: "row", gap: 7, alignItems: "center", backgroundColor: colors.soft }, ownerPickActive: { backgroundColor: colors.ink }, ownerPickText: { color: colors.ink, fontSize: 11, fontWeight: "800", flex: 1 }, ownerPickTextActive: { color: colors.surface }, vehiclePick: { minWidth: 145, padding: 7, borderRadius: 13, flexDirection: "row", gap: 7, alignItems: "center", backgroundColor: colors.soft }, vehiclePickActive: { backgroundColor: colors.ink }, vehiclePickCopy: { flex: 1, minWidth: 0 }, vehiclePickTitle: { color: colors.ink, fontSize: 11, fontWeight: "800" }, vehiclePickPlate: { color: colors.inkMuted, fontSize: 9.5, marginTop: 2 }, vehiclePickPlateActive: { color: "#BEBEBE" }, noVehicleForCustomer: { color: colors.error, fontSize: 12, lineHeight: 18, padding: 12, backgroundColor: "#FBECEE", borderRadius: 12 },
});
