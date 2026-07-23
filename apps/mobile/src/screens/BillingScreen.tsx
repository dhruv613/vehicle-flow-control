import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  Card,
  Divider,
  EmptyState,
  FilterChips,
  FormField,
  Icon,
  IconButton,
  Label,
  PickerField,
  PrimaryButton,
  SearchInput,
  Sheet,
  StatusBadge,
} from "../components/garageUi";
import { formatMoney, useGarage, type NewInvoice } from "../hooks/useGarage";
import type { Customer, Invoice, InvoiceStatus, Vehicle, WorkOrder } from "../data/types";
import { colors, font, radius } from "../theme/tokens";
import { DetailRow, FormError, OwnerPicker, PageIntro, PageScroll, VehiclePicker, type ScreenProps } from "./GarageScreens";

const statusLabel: Record<InvoiceStatus, string> = { draft: "Draft", issued: "Issued", partial: "Partial", paid: "Paid" };
const filterOptions = ["All", "Draft", "Issued", "Partial", "Paid"] as const;
const paymentMethods = ["cash", "card", "upi", "transfer"] as const;

interface DraftLine {
  description: string;
  quantity: string;
  unitPrice: string;
}

function makeInvoiceDraft(customerId: string, vehicleId: string) {
  return {
    customerId,
    vehicleId,
    workOrderId: "",
    status: "issued" as "draft" | "issued",
    discount: "",
    taxRate: "18",
    lines: [{ description: "", quantity: "1", unitPrice: "" }] as DraftLine[],
  };
}

export function BillingScreen({ isWide }: ScreenProps) {
  const { invoices, customers, vehicles, workOrders, settings, addInvoice, recordPayment } = useGarage();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof filterOptions)[number]>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(() => makeInvoiceDraft(customers[0]?.id ?? "", vehicles[0]?.id ?? ""));
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<(typeof paymentMethods)[number]>("upi");

  const selected = invoices.find((invoice) => invoice.id === selectedId) ?? null;

  const displayed = useMemo(() => invoices.filter((invoice) => {
    const matchesFilter = filter === "All" || statusLabel[invoice.status] === filter;
    const needle = search.trim().toLowerCase();
    const customer = customers.find((row) => row.id === invoice.customerId);
    const matchesSearch = !needle || `${invoice.number} ${customer?.name ?? ""}`.toLowerCase().includes(needle);
    return matchesFilter && matchesSearch;
  }), [invoices, filter, search, customers]);

  const outstanding = invoices.reduce((total, invoice) => total + invoice.balanceDue, 0);
  const collected = invoices.reduce((total, invoice) => total + invoice.amountPaid, 0);

  const openAdd = () => {
    setDraft(makeInvoiceDraft(customers[0]?.id ?? "", vehicles.find((vehicle) => vehicle.customerId === customers[0]?.id)?.id ?? ""));
    setError("");
    setAdding(true);
  };

  const openDetail = (invoice: Invoice) => {
    setSelectedId(invoice.id);
    setPayAmount("");
    setPayMethod("upi");
  };

  const save = () => {
    const lineItems = draft.lines
      .map((line) => ({ description: line.description.trim(), quantity: Number(line.quantity) || 0, unitPrice: Number(line.unitPrice) || 0 }))
      .filter((line) => line.description.length >= 2 && line.quantity > 0);
    if (!draft.customerId || !lineItems.length) {
      setError("Choose a customer and add at least one line item with a description and quantity.");
      return;
    }
    const invoice: NewInvoice = {
      customerId: draft.customerId,
      vehicleId: draft.vehicleId || null,
      workOrderId: draft.workOrderId || null,
      status: draft.status,
      discount: Number(draft.discount) || 0,
      taxRate: Number(draft.taxRate) || 0,
      lineItems,
    };
    addInvoice(invoice);
    setAdding(false);
  };

  const submitPayment = () => {
    if (!selected) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) return;
    recordPayment(selected.id, Math.min(amount, selected.balanceDue), payMethod);
    setPayAmount("");
  };

  const draftLinesTotal = draft.lines.reduce((total, line) => total + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0), 0);

  return (
    <PageScroll>
      <PageIntro title="Billing" detail="Invoices and payments." action={<PrimaryButton label="New invoice" icon="add" onPress={openAdd} compact />} />

      <View style={[styles.metricStrip, isWide && styles.metricStripWide]}>
        <View style={styles.metric}><Text style={styles.metricValue}>{invoices.length}</Text><Text style={styles.metricLabel}>invoices</Text></View>
        <View style={styles.metric}><Text numberOfLines={1} style={[styles.metricValue, outstanding > 0 && styles.metricValueDue]}>{formatMoney(outstanding, settings.currency)}</Text><Text style={styles.metricLabel}>outstanding</Text></View>
        <View style={[styles.metric, styles.metricLast]}><Text numberOfLines={1} style={styles.metricValue}>{formatMoney(collected, settings.currency)}</Text><Text style={styles.metricLabel}>collected</Text></View>
      </View>

      <SearchInput value={search} onChangeText={setSearch} placeholder="Search invoice number or customer" />
      <View style={styles.filterSpacer}><FilterChips options={filterOptions} selected={filter} onChange={setFilter} /></View>

      <View style={styles.cardList}>
        {displayed.map((invoice) => {
          const customer = customers.find((row) => row.id === invoice.customerId);
          const vehicle = vehicles.find((row) => row.id === invoice.vehicleId);
          return (
            <Pressable key={invoice.id} onPress={() => openDetail(invoice)} style={({ pressed }) => [styles.invoiceCard, pressed && styles.pressed]}>
              <View style={styles.invoiceHead}>
                <View style={styles.invoiceNumber}><Text style={styles.invoiceNumberText}>{invoice.number}</Text></View>
                <StatusBadge status={statusLabel[invoice.status]} small />
                <Text style={styles.invoiceDate}>{invoice.issuedAt}</Text>
              </View>
              <View style={styles.invoiceMain}>
                <View style={styles.invoiceCopy}>
                  <Text style={styles.invoiceCustomer}>{customer?.name ?? "Customer"}</Text>
                  <Text style={styles.invoiceMeta}>{vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.plate}` : "No vehicle linked"}</Text>
                </View>
                <View style={styles.invoiceAmounts}>
                  <Text style={styles.invoiceTotal}>{formatMoney(invoice.total, settings.currency)}</Text>
                  <Text style={[styles.invoiceBalance, invoice.balanceDue > 0 && styles.invoiceBalanceDue]}>
                    {invoice.balanceDue > 0 ? `${formatMoney(invoice.balanceDue, settings.currency)} due` : "Settled"}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
      {!displayed.length ? <EmptyState icon="receipt-outline" title="No invoices here" detail="Change the filter or raise a new invoice for completed work." action="New invoice" onAction={openAdd} /> : null}

      <Sheet
        visible={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected?.number ?? "Invoice"}
        subtitle={selected ? `${customers.find((row) => row.id === selected.customerId)?.name ?? "Customer"} · issued ${selected.issuedAt}` : undefined}
      >
        {selected ? (
          <InvoiceDetail
            invoice={selected}
            currency={settings.currency}
            customers={customers}
            vehicles={vehicles}
            workOrders={workOrders}
            payAmount={payAmount}
            onPayAmount={setPayAmount}
            payMethod={payMethod}
            onPayMethod={setPayMethod}
            onSubmitPayment={submitPayment}
          />
        ) : null}
      </Sheet>

      <Sheet visible={adding} onClose={() => setAdding(false)} title="New invoice" subtitle="Line items, discount and tax are calculated for you." footer={<PrimaryButton label={`Create invoice · ${formatMoney(draftLinesTotal, settings.currency)}`} icon="checkmark" onPress={save} />}>
        {error ? <FormError text={error} /> : null}
        <OwnerPicker customers={customers} value={draft.customerId} onChange={(customerId) => {
          const firstVehicle = vehicles.find((vehicle) => vehicle.customerId === customerId);
          setDraft((current) => ({ ...current, customerId, vehicleId: firstVehicle?.id ?? "", workOrderId: "" }));
        }} />
        <VehiclePicker vehicles={vehicles.filter((vehicle) => vehicle.customerId === draft.customerId)} value={draft.vehicleId} onChange={(vehicleId) => setDraft((current) => ({ ...current, vehicleId }))} />
        <WorkOrderPicker orders={workOrders.filter((order) => order.customerId === draft.customerId)} value={draft.workOrderId} onChange={(workOrderId) => setDraft((current) => ({ ...current, workOrderId }))} />

        <Text style={styles.fieldLabel}>Line items</Text>
        {draft.lines.map((line, index) => (
          <View key={index} style={styles.lineRow}>
            <View style={styles.lineDescription}>
              <FormField label={index === 0 ? "Description" : `Item ${index + 1}`} value={line.description} onChangeText={(description) => setDraft((current) => ({ ...current, lines: current.lines.map((row, rowIndex) => rowIndex === index ? { ...row, description } : row) }))} placeholder="e.g. Front brake pads" />
            </View>
            <View style={styles.lineQty}>
              <FormField label="Qty" value={line.quantity} onChangeText={(quantity) => setDraft((current) => ({ ...current, lines: current.lines.map((row, rowIndex) => rowIndex === index ? { ...row, quantity } : row) }))} keyboardType="decimal-pad" placeholder="1" />
            </View>
            <View style={styles.linePrice}>
              <FormField label="Price" value={line.unitPrice} onChangeText={(unitPrice) => setDraft((current) => ({ ...current, lines: current.lines.map((row, rowIndex) => rowIndex === index ? { ...row, unitPrice } : row) }))} keyboardType="decimal-pad" placeholder="0" />
            </View>
            {draft.lines.length > 1 ? (
              <IconButton icon="trash-outline" label={`Remove item ${index + 1}`} onPress={() => setDraft((current) => ({ ...current, lines: current.lines.filter((_, rowIndex) => rowIndex !== index) }))} style={styles.lineRemove} />
            ) : null}
          </View>
        ))}
        <PrimaryButton label="Add line item" icon="add" variant="light" compact onPress={() => setDraft((current) => ({ ...current, lines: [...current.lines, { description: "", quantity: "1", unitPrice: "" }] }))} style={styles.addLineButton} />

        <View style={styles.formTwoCol}>
          <View style={styles.formHalf}><FormField label="Discount" value={draft.discount} onChangeText={(discount) => setDraft((current) => ({ ...current, discount }))} keyboardType="decimal-pad" placeholder="0" /></View>
          <View style={styles.formHalf}><FormField label="Tax rate %" value={draft.taxRate} onChangeText={(taxRate) => setDraft((current) => ({ ...current, taxRate }))} keyboardType="decimal-pad" placeholder="18" /></View>
        </View>
        <PickerField label="Status" options={["issued", "draft"] as const} value={draft.status} onChange={(status) => setDraft((current) => ({ ...current, status }))} />
      </Sheet>
    </PageScroll>
  );
}

function WorkOrderPicker({ orders, value, onChange }: { orders: WorkOrder[]; value: string; onChange: (value: string) => void }) {
  if (!orders.length) return null;
  return (
    <View style={styles.workOrderPicker}>
      <Text style={styles.fieldLabel}>Link a work order (optional)</Text>
      <View style={styles.workOrderChips}>
        {orders.slice(0, 6).map((order) => {
          const active = value === order.id;
          return (
            <Pressable key={order.id} onPress={() => onChange(active ? "" : order.id)} style={({ pressed }) => [styles.workOrderChip, active && styles.workOrderChipActive, pressed && styles.pressed]}>
              <Text style={[styles.workOrderChipText, active && styles.workOrderChipTextActive]}>{order.number}</Text>
              <Text numberOfLines={1} style={[styles.workOrderChipDetail, active && styles.workOrderChipTextActive]}>{order.title}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function InvoiceDetail({
  invoice,
  currency,
  customers,
  vehicles,
  workOrders,
  payAmount,
  onPayAmount,
  payMethod,
  onPayMethod,
  onSubmitPayment,
}: {
  invoice: Invoice;
  currency: "INR" | "USD" | "GBP";
  customers: Customer[];
  vehicles: Vehicle[];
  workOrders: WorkOrder[];
  payAmount: string;
  onPayAmount: (value: string) => void;
  payMethod: (typeof paymentMethods)[number];
  onPayMethod: (value: (typeof paymentMethods)[number]) => void;
  onSubmitPayment: () => void;
}) {
  const customer = customers.find((row) => row.id === invoice.customerId);
  const vehicle = vehicles.find((row) => row.id === invoice.vehicleId);
  const order = workOrders.find((row) => row.id === invoice.workOrderId);
  return (
    <View style={styles.sheetStack}>
      <View style={styles.detailTop}>
        <StatusBadge status={statusLabel[invoice.status]} />
        <View style={styles.detailTopAmounts}>
          <Text style={styles.detailTotal}>{formatMoney(invoice.total, currency)}</Text>
          <Text style={[styles.detailBalance, invoice.balanceDue > 0 && styles.invoiceBalanceDue]}>
            {invoice.balanceDue > 0 ? `${formatMoney(invoice.balanceDue, currency)} outstanding` : "Fully settled"}
          </Text>
        </View>
      </View>

      <Card>
        <Label>Billed to</Label>
        <View style={styles.detailRows}>
          <DetailRow label="Customer" value={customer?.name ?? "Not recorded"} />
          <DetailRow label="Vehicle" value={vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.plate}` : "Not linked"} />
          <DetailRow label="Work order" value={order ? `${order.number} · ${order.title}` : "Not linked"} />
        </View>
      </Card>

      <Card>
        <Label>Line items</Label>
        <View style={styles.lineItems}>
          {invoice.lineItems.map((item, index) => (
            <View key={index} style={styles.lineItemRow}>
              <View style={styles.lineItemCopy}>
                <Text style={styles.lineItemTitle}>{item.description}</Text>
                <Text style={styles.lineItemMeta}>{item.quantity} × {formatMoney(item.unitPrice, currency)}</Text>
              </View>
              <Text style={styles.lineItemTotal}>{formatMoney(item.total, currency)}</Text>
            </View>
          ))}
        </View>
        <Divider />
        <View style={styles.detailRows}>
          <DetailRow label="Subtotal" value={formatMoney(invoice.subtotal, currency)} />
          {invoice.discount ? <DetailRow label="Discount" value={`− ${formatMoney(invoice.discount, currency)}`} /> : null}
          <DetailRow label={`Tax (${invoice.taxRate}%)`} value={formatMoney(invoice.taxAmount, currency)} />
          <DetailRow label="Total" value={formatMoney(invoice.total, currency)} />
          <DetailRow label="Paid" value={formatMoney(invoice.amountPaid, currency)} />
        </View>
      </Card>

      {invoice.payments.length ? (
        <Card>
          <Label>Payments</Label>
          <View style={styles.detailRows}>
            {invoice.payments.map((payment) => (
              <DetailRow key={payment.id} label={`${payment.method.toUpperCase()} · ${payment.paidAt}`} value={formatMoney(payment.amount, currency)} />
            ))}
          </View>
        </Card>
      ) : null}

      {invoice.balanceDue > 0 ? (
        <Card>
          <Label>Record a payment</Label>
          <View style={styles.paymentForm}>
            <FormField label={`Amount (up to ${formatMoney(invoice.balanceDue, currency)})`} value={payAmount} onChangeText={onPayAmount} keyboardType="decimal-pad" placeholder="0" />
            <PickerField label="Method" options={paymentMethods} value={payMethod} onChange={onPayMethod} />
            <PrimaryButton label="Record payment" icon="wallet-outline" onPress={onSubmitPayment} disabled={!Number(payAmount)} />
          </View>
        </Card>
      ) : (
        <View style={styles.settledNote}>
          <Icon name="checkmark-circle-outline" size={19} color={colors.success} />
          <Text style={styles.settledText}>This invoice is settled in full. Nothing left to collect.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  metricStrip: { borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.ink, flexDirection: "row" },
  metricStripWide: { maxWidth: 680 },
  metric: { flex: 1, padding: 15, gap: 4, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: "#393939" },
  metricLast: { borderRightWidth: 0 },
  metricValue: { color: colors.surface, fontFamily: font.display, fontSize: 18, fontWeight: "800" },
  metricValueDue: { color: "#FF8FA3" },
  metricLabel: { color: "#ADADAD", fontSize: 10.5, fontWeight: "700" },
  filterSpacer: { marginTop: -8 },
  cardList: { gap: 10 },
  invoiceCard: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, padding: 14, gap: 12 },
  invoiceHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  invoiceNumber: { backgroundColor: colors.ink, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5 },
  invoiceNumberText: { color: colors.surface, fontSize: 10, fontWeight: "800" },
  invoiceDate: { flex: 1, textAlign: "right", color: colors.inkFaint, fontSize: 10.5, fontWeight: "700" },
  invoiceMain: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  invoiceCopy: { flex: 1, minWidth: 0, gap: 4 },
  invoiceCustomer: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  invoiceMeta: { color: colors.inkMuted, fontSize: 11 },
  invoiceAmounts: { alignItems: "flex-end", gap: 3 },
  invoiceTotal: { color: colors.ink, fontFamily: font.display, fontSize: 17, fontWeight: "800" },
  invoiceBalance: { color: colors.success, fontSize: 10.5, fontWeight: "800" },
  invoiceBalanceDue: { color: colors.error },
  sheetStack: { gap: 16 },
  detailTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  detailTopAmounts: { alignItems: "flex-end", gap: 2 },
  detailTotal: { color: colors.ink, fontFamily: font.display, fontSize: 20, fontWeight: "800" },
  detailBalance: { color: colors.success, fontSize: 11, fontWeight: "800" },
  detailRows: { marginTop: 9 },
  lineItems: { marginTop: 10, marginBottom: 13, gap: 11 },
  lineItemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  lineItemCopy: { flex: 1, minWidth: 0 },
  lineItemTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  lineItemMeta: { color: colors.inkMuted, fontSize: 11, marginTop: 3 },
  lineItemTotal: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  paymentForm: { marginTop: 12 },
  settledNote: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#EAF8EF", borderRadius: 13, padding: 13 },
  settledText: { flex: 1, color: colors.success, fontSize: 12, fontWeight: "700", lineHeight: 17 },
  fieldLabel: { color: colors.ink, fontSize: 12, fontWeight: "800", marginBottom: 8 },
  lineRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  lineDescription: { flex: 1.9, minWidth: 0 },
  lineQty: { flex: 0.7, minWidth: 0 },
  linePrice: { flex: 1, minWidth: 0 },
  lineRemove: { marginTop: 27, width: 36, height: 36 },
  addLineButton: { alignSelf: "flex-start", marginBottom: 16, marginTop: -4 },
  formTwoCol: { flexDirection: "row", gap: 10 },
  formHalf: { flex: 1, minWidth: 0 },
  workOrderPicker: { marginBottom: 16 },
  workOrderChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  workOrderChip: { flexGrow: 1, flexBasis: 150, borderRadius: 12, backgroundColor: colors.soft, padding: 10 },
  workOrderChipActive: { backgroundColor: colors.ink },
  workOrderChipText: { color: colors.ink, fontSize: 11, fontWeight: "800" },
  workOrderChipDetail: { color: colors.inkMuted, fontSize: 10, marginTop: 3 },
  workOrderChipTextActive: { color: colors.surface },
});
