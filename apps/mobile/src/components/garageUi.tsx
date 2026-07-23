import type { PropsWithChildren, ReactNode } from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import type { JobPriority, VehicleStatus } from "../data/types";
import { colors, font, radius, spacing } from "../theme/tokens";

export type IconName = keyof typeof Ionicons.glyphMap;

export function Icon({ name, size = 20, color = colors.ink }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export function IconButton({
  icon,
  label,
  onPress,
  inverse = false,
  style,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  inverse?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, inverse && styles.iconButtonInverse, pressed && styles.pressed, style]}
    >
      <Icon name={icon} size={19} color={inverse ? colors.surface : colors.ink} />
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  icon,
  onPress,
  variant = "dark",
  compact = false,
  disabled = false,
  style,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  variant?: "dark" | "light" | "danger" | "ghost";
  compact?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const variantStyle = {
    dark: styles.buttonDark,
    light: styles.buttonLight,
    danger: styles.buttonDanger,
    ghost: styles.buttonGhost,
  }[variant];
  const textStyle = variant === "light" || variant === "ghost" ? styles.buttonTextDark : styles.buttonTextLight;
  const iconColor = variant === "light" || variant === "ghost" ? colors.ink : colors.surface;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, variantStyle, compact && styles.buttonCompact, disabled && styles.buttonDisabled, pressed && !disabled && styles.pressed, style]}
    >
      {icon ? <Icon name={icon} size={17} color={iconColor} /> : null}
      <Text style={[styles.buttonText, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const badgePalette: Record<string, { background: string; text: string; dot: string }> = {
  Waiting: { background: "#F2F2F2", text: "#424242", dot: "#707070" },
  "In service": { background: "#EEF3FF", text: "#2457D6", dot: "#2457D6" },
  "Quality check": { background: "#FFF5E8", text: "#A85B00", dot: "#A85B00" },
  Ready: { background: "#EAF8EF", text: "#157A45", dot: "#157A45" },
  Collected: { background: "#F1EFF8", text: "#6B4CB3", dot: "#6B4CB3" },
  Urgent: { background: "#FBECEE", text: colors.error, dot: colors.error },
  Priority: { background: "#FFF5E8", text: "#A85B00", dot: "#A85B00" },
  Standard: { background: "#F2F2F2", text: "#575757", dot: "#575757" },
  "Low stock": { background: "#FBECEE", text: colors.error, dot: colors.error },
};

export function StatusBadge({ status, small = false }: { status: VehicleStatus | JobPriority | string; small?: boolean }) {
  const palette = badgePalette[status] ?? badgePalette.Standard;
  return (
    <View style={[styles.badge, { backgroundColor: palette.background }, small && styles.badgeSmall]}>
      <View style={[styles.badgeDot, { backgroundColor: palette.dot }]} />
      <Text numberOfLines={1} style={[styles.badgeText, { color: palette.text }, small && styles.badgeTextSmall]}>{status}</Text>
    </View>
  );
}

export function Avatar({ initials, size = 42, inverse = false }: { initials: string; size?: number; inverse?: boolean }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }, inverse && styles.avatarInverse]}>
      <Text style={[styles.avatarText, { fontSize: Math.max(11, size * 0.31) }, inverse && styles.avatarTextInverse]}>{initials}</Text>
    </View>
  );
}

export function VehicleArt({ tone = "dark", size = "regular" }: { tone?: "dark" | "red" | "sand" | "gray" | "blue"; size?: "small" | "regular" }) {
  const background = { dark: "#151515", red: "#B00020", sand: "#D6C5A8", gray: "#6E7278", blue: "#2C526F" }[tone];
  const artSize = size === "small" ? 48 : 72;
  return (
    <View style={[styles.vehicleArt, { backgroundColor: background, width: artSize, height: artSize, borderRadius: size === "small" ? 14 : 19 }]}>
      <View style={styles.vehicleGlow} />
      <MaterialCommunityIcons name="car-sports" size={size === "small" ? 30 : 44} color="#FFFFFF" />
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" style={({ pressed }) => [styles.sectionAction, pressed && styles.pressed]}>
          <Text style={styles.sectionActionText}>{action}</Text>
          <Icon name="arrow-forward" size={14} color={colors.ink} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  icon,
  inverse = false,
  onPress,
}: {
  label: string;
  value: string;
  detail: string;
  icon: IconName;
  inverse?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={[styles.metricIcon, inverse && styles.metricIconInverse]}><Icon name={icon} size={18} color={inverse ? colors.surface : colors.ink} /></View>
      <Text style={[styles.metricLabel, inverse && styles.metricTextInverse]}>{label}</Text>
      <Text style={[styles.metricValue, inverse && styles.metricTextInverse]}>{value}</Text>
      <Text style={[styles.metricDetail, inverse && styles.metricDetailInverse]}>{detail}</Text>
    </>
  );
  if (!onPress) return <View style={[styles.metricCard, inverse && styles.metricCardInverse]}>{content}</View>;
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.metricCard, inverse && styles.metricCardInverse, pressed && styles.pressed]}>{content}</Pressable>;
}

export function SearchInput({ value, onChangeText, placeholder = "Search" }: { value: string; onChangeText: (value: string) => void; placeholder?: string }) {
  return (
    <View style={styles.searchBox}>
      <Icon name="search-outline" size={19} color={colors.inkFaint} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        style={styles.searchInput}
        accessibilityLabel={placeholder}
      />
      {value ? <IconButton icon="close" label="Clear search" onPress={() => onChangeText("")} style={styles.clearSearch} /> : null}
    </View>
  );
}

export function FilterChips<T extends string>({ options, selected, onChange }: { options: readonly T[]; selected: T; onChange: (value: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
      {options.map((option) => {
        const active = option === selected;
        return (
          <Pressable key={option} onPress={() => onChange(option)} style={({ pressed }) => [styles.filterChip, active && styles.filterChipActive, pressed && styles.pressed]}>
            <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{option}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType,
  autoCapitalize = "sentences",
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: TextInputProps["keyboardType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
      />
    </View>
  );
}

export function PickerField<T extends string>({ label, options, value, onChange }: { label: string; options: readonly T[]; value: T; onChange: (value: T) => void }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerOptions}>
        {options.map((option) => {
          const selected = value === option;
          return (
            <Pressable key={option} onPress={() => onChange(option)} style={({ pressed }) => [styles.pickerOption, selected && styles.pickerOptionSelected, pressed && styles.pressed]}>
              <Text style={[styles.pickerOptionText, selected && styles.pickerOptionTextSelected]}>{option}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function ToggleRow({ label, detail, value, onValueChange }: { label: string; detail: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDetail}>{detail}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#D8D8D8", true: "#242424" }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function EmptyState({ icon, title, detail, action, onAction }: { icon: IconName; title: string; detail: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}><Icon name={icon} size={25} color={colors.ink} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDetail}>{detail}</Text>
      {action && onAction ? <PrimaryButton label={action} icon="add" onPress={onAction} compact style={styles.emptyAction} /> : null}
    </View>
  );
}

export function Sheet({ visible, onClose, title, subtitle, children, footer }: PropsWithChildren<{ visible: boolean; onClose: () => void; title: string; subtitle?: string; footer?: ReactNode }>) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} accessibilityLabel="Close dialog" />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleWrap}>
              <Text style={styles.sheetTitle}>{title}</Text>
              {subtitle ? <Text style={styles.sheetSubtitle}>{subtitle}</Text> : null}
            </View>
            <IconButton icon="close" label="Close dialog" onPress={onClose} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.sheetFooter}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

export function Toast({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  if (!message) return null;
  return (
    <Pressable onPress={onDismiss} style={({ pressed }) => [styles.toast, pressed && styles.pressed]} accessibilityRole="alert">
      <Icon name="checkmark-circle" size={18} color={colors.surface} />
      <Text style={styles.toastText}>{message}</Text>
      <Icon name="close" size={16} color="#D6D6D6" />
    </Pressable>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Label({ children, style }: PropsWithChildren<{ style?: StyleProp<TextStyle> }>) {
  return <Text style={[styles.overline, style]}>{children}</Text>;
}

export function NotificationDot() {
  return <View style={styles.notificationDot} />;
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" },
  iconButtonInverse: { backgroundColor: "#242424" },
  button: { minHeight: 46, borderRadius: radius.sm, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  buttonCompact: { minHeight: 38, paddingHorizontal: 12, borderRadius: 10 },
  buttonDark: { backgroundColor: colors.ink },
  buttonLight: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  buttonDanger: { backgroundColor: colors.error },
  buttonGhost: { backgroundColor: "transparent" },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { fontFamily: font.body, fontSize: 14, fontWeight: "700" },
  buttonTextLight: { color: colors.surface },
  buttonTextDark: { color: colors.ink },
  badge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  badgeSmall: { paddingHorizontal: 8, paddingVertical: 4, gap: 5 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.1 },
  badgeTextSmall: { fontSize: 10.5 },
  avatar: { backgroundColor: colors.soft, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line },
  avatarInverse: { backgroundColor: colors.ink, borderColor: colors.ink },
  avatarText: { color: colors.ink, fontWeight: "800", letterSpacing: 0.4 },
  avatarTextInverse: { color: colors.surface },
  vehicleArt: { overflow: "hidden", justifyContent: "center", alignItems: "center" },
  vehicleGlow: { position: "absolute", width: "110%", height: "45%", borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.18)", top: -8, transform: [{ rotate: "-12deg" }] },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { color: colors.ink, fontFamily: font.display, fontSize: 23, fontWeight: "700", letterSpacing: -0.3 },
  sectionAction: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 5 },
  sectionActionText: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  metricCard: { minHeight: 158, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 16, flexGrow: 1, flexBasis: 155 },
  metricCardInverse: { backgroundColor: colors.ink, borderColor: colors.ink },
  metricIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.soft, justifyContent: "center", alignItems: "center", marginBottom: 18 },
  metricIconInverse: { backgroundColor: "#2B2B2B" },
  metricLabel: { color: colors.inkMuted, fontSize: 12, fontWeight: "700", marginBottom: 5 },
  metricValue: { color: colors.ink, fontFamily: font.display, fontSize: 29, fontWeight: "700", letterSpacing: -0.6 },
  metricDetail: { color: colors.inkFaint, fontSize: 11, fontWeight: "600", marginTop: 6 },
  metricTextInverse: { color: colors.surface },
  metricDetailInverse: { color: "#AEAEAE" },
  searchBox: { height: 48, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", paddingLeft: 14, gap: 8 },
  searchInput: { flex: 1, color: colors.ink, fontFamily: font.body, fontSize: 14, paddingVertical: Platform.select({ web: 9, default: 0 }) },
  clearSearch: { width: 32, height: 32, backgroundColor: "transparent", marginRight: 3 },
  chipScroll: { gap: 8, paddingRight: 14 },
  filterChip: { borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.soft },
  filterChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterChipText: { color: colors.inkMuted, fontSize: 12, fontWeight: "700" },
  filterChipTextActive: { color: colors.surface },
  fieldGroup: { gap: 7, marginBottom: 16 },
  fieldLabel: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  fieldInput: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 13, color: colors.ink, fontSize: 14, backgroundColor: colors.surface },
  fieldInputMultiline: { minHeight: 100, paddingTop: 12, textAlignVertical: "top" },
  pickerOptions: { gap: 8, paddingRight: 12 },
  pickerOption: { borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.soft },
  pickerOptionSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  pickerOptionText: { color: colors.inkMuted, fontSize: 12, fontWeight: "700" },
  pickerOptionTextSelected: { color: colors.surface },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, paddingVertical: 16 },
  toggleCopy: { flex: 1, gap: 4 },
  toggleLabel: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  toggleDetail: { color: colors.inkMuted, fontSize: 12, lineHeight: 17 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  emptyState: { alignItems: "center", paddingHorizontal: 32, paddingVertical: 48 },
  emptyIcon: { width: 54, height: 54, alignItems: "center", justifyContent: "center", backgroundColor: colors.soft, borderRadius: 17, marginBottom: 15 },
  emptyTitle: { color: colors.ink, fontFamily: font.display, fontSize: 21, fontWeight: "700", marginBottom: 7, textAlign: "center" },
  emptyDetail: { color: colors.inkMuted, fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 290 },
  emptyAction: { marginTop: 18 },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.42)" },
  sheet: { maxHeight: "89%", borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden", backgroundColor: colors.surface },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#D3D3D3", alignSelf: "center", marginTop: 10 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 17, paddingBottom: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, gap: 16 },
  sheetTitleWrap: { flex: 1, gap: 4 },
  sheetTitle: { color: colors.ink, fontFamily: font.display, fontSize: 24, fontWeight: "700" },
  sheetSubtitle: { color: colors.inkMuted, fontSize: 12, lineHeight: 17 },
  sheetContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  sheetFooter: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingHorizontal: 20, paddingVertical: 14, backgroundColor: colors.surface },
  toast: { position: "absolute", left: 18, right: 18, bottom: 24, borderRadius: 14, minHeight: 52, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.ink, zIndex: 40, ...Platform.select({ web: { boxShadow: "0 12px 30px rgba(0,0,0,0.22)" }, default: { elevation: 9 } }) },
  toastText: { flex: 1, color: colors.surface, fontSize: 13, fontWeight: "700" },
  card: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, padding: 16 },
  overline: { color: colors.inkFaint, fontSize: 10, fontWeight: "800", letterSpacing: 1.1, textTransform: "uppercase" },
  notificationDot: { position: "absolute", right: 1, top: 1, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.error, borderWidth: 2, borderColor: colors.surface },
});
