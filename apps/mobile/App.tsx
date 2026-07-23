import { useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  Animated,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { Icon, IconButton, NotificationDot, PrimaryButton, Sheet, StatusBadge, Toast } from "./src/components/garageUi";
import { AuthProvider, useAuth } from "./src/hooks/useAuth";
import { GarageProvider, useGarage } from "./src/hooks/useGarage";
import { BillingScreen } from "./src/screens/BillingScreen";
import {
  CalendarScreen,
  CustomersScreen,
  DashboardScreen,
  InventoryScreen,
  SettingsScreen,
  VehiclesScreen,
  WorkOrdersScreen,
} from "./src/screens/GarageScreens";
import { LoginScreen } from "./src/screens/LoginScreen";
import type { ScreenName } from "./src/data/types";
import { colors, font, radius } from "./src/theme/tokens";

const navigation: { key: ScreenName; label: string; icon: Parameters<typeof Icon>[0]["name"] }[] = [
  { key: "dashboard", label: "Overview", icon: "grid-outline" },
  { key: "vehicles", label: "Vehicles", icon: "car-outline" },
  { key: "customers", label: "Customers", icon: "people-outline" },
  { key: "workorders", label: "Work orders", icon: "construct-outline" },
  { key: "calendar", label: "Calendar", icon: "calendar-outline" },
  { key: "inventory", label: "Inventory", icon: "cube-outline" },
  { key: "billing", label: "Billing", icon: "receipt-outline" },
  { key: "settings", label: "Settings", icon: "settings-outline" },
];

const mobileTabs: ScreenName[] = ["dashboard", "vehicles", "workorders", "billing", "settings"];

export default function App() {
  return (
    <AuthProvider>
      <GarageProvider>
        <AuthGate />
      </GarageProvider>
    </AuthProvider>
  );
}

function AuthGate() {
  const { status } = useAuth();
  if (status === "restoring") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.splash}>
          <View style={styles.splashMark}><Icon name="speedometer-outline" size={26} color={colors.surface} /></View>
          <Text style={styles.splashText}>MOTORWISE</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (status === "signedOut") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <LoginScreen />
      </SafeAreaView>
    );
  }
  return <GarageApp />;
}

function GarageApp() {
  const { width } = useWindowDimensions();
  const isWide = width >= 920;
  const [screen, setScreen] = useState<ScreenName>("dashboard");
  const [quickMenu, setQuickMenu] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  const { settings, inventory, workOrders, toast, dismissToast } = useGarage();
  const activeItem = navigation.find((item) => item.key === screen) ?? navigation[0];
  const lowStock = inventory.filter((item) => item.quantity <= item.reorderAt).length;
  const urgentJobs = workOrders.filter((order) => order.priority === "Urgent" && order.status !== "Collected").length;
  const alertCount = lowStock + urgentJobs;

  const navigate = (target: ScreenName) => {
    if (target === screen) return;
    fade.setValue(0.15);
    setScreen(target);
  };

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [screen, fade]);

  const content = (() => {
    const props = { navigate, isWide };
    switch (screen) {
      case "vehicles": return <VehiclesScreen {...props} />;
      case "customers": return <CustomersScreen {...props} />;
      case "workorders": return <WorkOrdersScreen {...props} />;
      case "calendar": return <CalendarScreen {...props} />;
      case "inventory": return <InventoryScreen {...props} />;
      case "billing": return <BillingScreen {...props} />;
      case "settings": return <SettingsScreen />;
      default: return <DashboardScreen {...props} />;
    }
  })();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appFrame}>
        {isWide ? <DesktopNav active={screen} onNavigate={navigate} lowStock={lowStock} garageName={settings.garageName} /> : null}
        <View style={styles.mainArea}>
          <Header title={activeItem.label} isWide={isWide} alertCount={alertCount} onOpenNotifications={() => setNotifications(true)} onOpenProfile={() => setProfileMenu(true)} onOpenQuick={() => setQuickMenu(true)} />
          <Animated.View style={[styles.contentViewport, { opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
            <View style={[styles.contentInner, isWide && styles.contentInnerWide]}>{content}</View>
          </Animated.View>
          {!isWide ? <MobileNav active={screen} onNavigate={navigate} lowStock={lowStock} /> : null}
        </View>
      </View>
      <QuickMenu visible={quickMenu} onClose={() => setQuickMenu(false)} onNavigate={(target) => { setQuickMenu(false); navigate(target); }} />
      <ProfileMenu visible={profileMenu} onClose={() => setProfileMenu(false)} onNavigate={(target) => { setProfileMenu(false); navigate(target); }} />
      <NotificationsSheet visible={notifications} onClose={() => setNotifications(false)} onNavigate={(target) => { setNotifications(false); navigate(target); }} />
      <Toast message={toast} onDismiss={dismissToast} />
    </SafeAreaView>
  );
}

function DesktopNav({ active, onNavigate, lowStock, garageName }: { active: ScreenName; onNavigate: (screen: ScreenName) => void; lowStock: number; garageName: string }) {
  return <View style={styles.desktopNav}>
    <Pressable onPress={() => onNavigate("dashboard")} style={({ pressed }) => [styles.brandBlock, pressed && styles.pressed]}>
      <View style={styles.brandMark}><Icon name="speedometer-outline" size={22} color={colors.surface} /></View>
      <View style={styles.brandCopy}><Text style={styles.brandName}>MOTORWISE</Text><Text numberOfLines={1} style={styles.brandSub}>{garageName}</Text></View>
    </Pressable>
    <View style={styles.navSection}><Text style={styles.navOverline}>Workspace</Text>{navigation.slice(0, 4).map((item) => <NavItem key={item.key} item={item} active={active === item.key} onPress={() => onNavigate(item.key)} badge={0} />)}</View>
    <View style={styles.navSection}><Text style={styles.navOverline}>Planning</Text>{navigation.slice(4, 7).map((item) => <NavItem key={item.key} item={item} active={active === item.key} onPress={() => onNavigate(item.key)} badge={item.key === "inventory" ? lowStock : 0} />)}</View>
    <View style={styles.navBottom}><NavItem item={navigation[7]} active={active === "settings"} onPress={() => onNavigate("settings")} badge={0} /></View>
  </View>;
}

function NavItem({ item, active, onPress, badge }: { item: typeof navigation[number]; active: boolean; onPress: () => void; badge: number }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.navItem, active && styles.navItemActive, pressed && styles.pressed]}><Icon name={item.icon} size={19} color={active ? colors.surface : "#9C9C9C"} /><Text style={[styles.navItemText, active && styles.navItemTextActive]}>{item.label}</Text>{badge ? <View style={styles.navBadge}><Text style={styles.navBadgeText}>{badge}</Text></View> : null}</Pressable>;
}

function Header({ title, isWide, alertCount, onOpenNotifications, onOpenProfile, onOpenQuick }: { title: string; isWide: boolean; alertCount: number; onOpenNotifications: () => void; onOpenProfile: () => void; onOpenQuick: () => void }) {
  const { user } = useAuth();
  const initials = (user?.name ?? "?").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <View style={styles.header}>
    <View style={styles.headerTitleGroup}>{!isWide ? <View style={styles.mobileMark}><Icon name="speedometer-outline" size={19} color={colors.surface} /></View> : null}<View><Text style={styles.headerEyebrow}>Motorwise garage</Text><Text style={styles.headerTitle}>{title}</Text></View></View>
    <View style={styles.headerActions}>
      <View style={styles.notificationWrap}><IconButton icon="notifications-outline" label="Notifications" onPress={onOpenNotifications} />{alertCount ? <NotificationDot /> : null}</View>
      {isWide ? <PrimaryButton label="Create" icon="add" onPress={onOpenQuick} compact /> : <IconButton icon="add" label="Create new" onPress={onOpenQuick} inverse />}
      <Pressable onPress={onOpenProfile} accessibilityRole="button" accessibilityLabel="Open profile menu" style={({ pressed }) => [styles.profileButton, pressed && styles.pressed]}><Text style={styles.profileButtonText}>{initials}</Text></Pressable>
    </View>
  </View>;
}

function MobileNav({ active, onNavigate, lowStock }: { active: ScreenName; onNavigate: (screen: ScreenName) => void; lowStock: number }) {
  return <View style={styles.mobileNav}>{mobileTabs.map((key) => { const item = navigation.find((entry) => entry.key === key)!; const selected = active === key; const badge = key === "workorders" ? lowStock : 0; return <Pressable key={key} onPress={() => onNavigate(key)} style={({ pressed }) => [styles.mobileTab, pressed && styles.pressed]}><View style={styles.mobileTabIcon}><Icon name={item.icon} size={20} color={selected ? colors.ink : colors.inkFaint} />{badge ? <View style={styles.mobileBadge}><Text style={styles.mobileBadgeText}>{badge}</Text></View> : null}</View><Text style={[styles.mobileTabText, selected && styles.mobileTabTextActive]}>{item.label === "Work orders" ? "Jobs" : item.label}</Text>{selected ? <View style={styles.mobileTabIndicator} /> : null}</Pressable>; })}</View>;
}

function QuickMenu({ visible, onClose, onNavigate }: { visible: boolean; onClose: () => void; onNavigate: (screen: ScreenName) => void }) {
  return <Sheet visible={visible} onClose={onClose} title="Create" subtitle="Common front-desk actions."><View style={styles.quickMenuList}><QuickMenuItem icon="car-outline" title="Add vehicle" detail="Register a car" onPress={() => onNavigate("vehicles")} /><QuickMenuItem icon="person-add-outline" title="Add customer" detail="New profile" onPress={() => onNavigate("customers")} /><QuickMenuItem icon="construct-outline" title="New work order" detail="Start a job" onPress={() => onNavigate("workorders")} /><QuickMenuItem icon="calendar-outline" title="New appointment" detail="Book a slot" onPress={() => onNavigate("calendar")} /><QuickMenuItem icon="receipt-outline" title="New invoice" detail="Bill work" onPress={() => onNavigate("billing")} /><QuickMenuItem icon="cube-outline" title="Add part" detail="Track stock" onPress={() => onNavigate("inventory")} /></View></Sheet>;
}

function QuickMenuItem({ icon, title, detail, onPress }: { icon: Parameters<typeof Icon>[0]["name"]; title: string; detail: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.quickMenuItem, pressed && styles.pressed]}><View style={styles.quickMenuIcon}><Icon name={icon} size={20} color={colors.ink} /></View><View style={styles.quickMenuCopy}><Text style={styles.quickMenuTitle}>{title}</Text><Text style={styles.quickMenuDetail}>{detail}</Text></View><Icon name="chevron-forward" size={19} color={colors.inkFaint} /></Pressable>;
}

function ProfileMenu({ visible, onClose, onNavigate }: { visible: boolean; onClose: () => void; onNavigate: (screen: ScreenName) => void }) {
  const { settings, connection } = useGarage();
  const { user, signOut } = useAuth();
  const label = connection === "connected" ? "Connected to the garage server" : connection === "local" ? "Using the local demo workspace" : "Working offline with local data";
  const initials = (user?.name ?? "?").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <Sheet visible={visible} onClose={onClose} title="Garage workspace" subtitle={label}>
    <View style={styles.profileMenuTop}><View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{initials}</Text></View><View style={styles.profileMenuCopy}><Text style={styles.profileName}>{user?.name ?? settings.ownerName}</Text><Text style={styles.profileRole}>{user?.role ?? "Team member"} · {settings.garageName}</Text></View></View>
    <View style={styles.profileCallout}><Icon name="information-circle-outline" size={20} color={colors.ink} /><Text style={styles.profileCalloutText}>Signed in as @{user?.username ?? "guest"}. Changes save on this device and sync when the server is reachable.</Text></View>
    <PrimaryButton label="Open settings" icon="settings-outline" onPress={() => onNavigate("settings")} />
    <PrimaryButton label="Billing & payments" icon="receipt-outline" onPress={() => onNavigate("billing")} variant="light" style={styles.profileSecondary} />
    <PrimaryButton label="Sign out" icon="log-out-outline" onPress={() => { onClose(); void signOut(); }} variant="danger" style={styles.profileSecondary} />
  </Sheet>;
}

function NotificationsSheet({ visible, onClose, onNavigate }: { visible: boolean; onClose: () => void; onNavigate: (screen: ScreenName) => void }) {
  const { inventory, workOrders, events, vehicles } = useGarage();
  const today = new Date().toISOString().slice(0, 10);
  const lowStock = inventory.filter((item) => item.quantity <= item.reorderAt);
  const urgent = workOrders.filter((order) => order.priority === "Urgent" && order.status !== "Collected");
  const readyVehicles = vehicles.filter((vehicle) => vehicle.status === "Ready");
  const todayEvents = events.filter((event) => event.date === today);
  const isEmpty = !lowStock.length && !urgent.length && !readyVehicles.length && !todayEvents.length;
  return <Sheet visible={visible} onClose={onClose} title="Notifications" subtitle="What needs the front desk's attention right now.">
    <View style={styles.notificationList}>
      {urgent.map((order) => <NotificationRow key={order.id} icon="alert-circle-outline" tone="error" title={`${order.number} is marked urgent`} detail={`${order.title} · due ${order.dueAt}`} badge="Urgent" onPress={() => onNavigate("workorders")} />)}
      {lowStock.map((item) => <NotificationRow key={item.id} icon="cube-outline" tone="error" title={`${item.name} is low`} detail={`${item.quantity} ${item.unit} left · reorder at ${item.reorderAt}`} badge="Low stock" onPress={() => onNavigate("inventory")} />)}
      {readyVehicles.map((vehicle) => <NotificationRow key={vehicle.id} icon="checkmark-circle-outline" tone="ink" title={`${vehicle.make} ${vehicle.model} is ready`} detail={`${vehicle.plate} · awaiting collection`} badge="Ready" onPress={() => onNavigate("vehicles")} />)}
      {todayEvents.map((event) => <NotificationRow key={event.id} icon="calendar-outline" tone="ink" title={event.title} detail={`Today at ${event.time} · ${event.technician}`} onPress={() => onNavigate("calendar")} />)}
      {isEmpty ? <View style={styles.notificationEmpty}><Icon name="notifications-off-outline" size={24} color={colors.inkFaint} /><Text style={styles.notificationEmptyText}>All clear. Nothing needs attention right now.</Text></View> : null}
    </View>
  </Sheet>;
}

function NotificationRow({ icon, tone, title, detail, badge, onPress }: { icon: Parameters<typeof Icon>[0]["name"]; tone: "error" | "ink"; title: string; detail: string; badge?: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.notificationRow, pressed && styles.pressed]}>
    <View style={[styles.notificationIcon, tone === "error" && styles.notificationIconError]}><Icon name={icon} size={19} color={tone === "error" ? colors.error : colors.ink} /></View>
    <View style={styles.notificationCopy}><Text style={styles.notificationTitle}>{title}</Text><Text style={styles.notificationDetail}>{detail}</Text></View>
    {badge ? <StatusBadge status={badge} small /> : <Icon name="chevron-forward" size={18} color={colors.inkFaint} />}
  </Pressable>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, appFrame: { flex: 1, flexDirection: "row", backgroundColor: colors.background }, mainArea: { flex: 1, minWidth: 0 },
  splash: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 }, splashMark: { width: 62, height: 62, borderRadius: 20, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }, splashText: { color: colors.ink, letterSpacing: 1.6, fontWeight: "900", fontSize: 14 },
  desktopNav: { width: 252, backgroundColor: colors.ink, paddingHorizontal: 15, paddingTop: 18, paddingBottom: 18 }, brandBlock: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 8, paddingBottom: 30 }, brandMark: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#333333", alignItems: "center", justifyContent: "center" }, brandCopy: { flex: 1, minWidth: 0 }, brandName: { color: colors.surface, letterSpacing: 1.1, fontWeight: "900", fontSize: 13 }, brandSub: { color: "#A7A7A7", fontSize: 10, marginTop: 4 }, navSection: { gap: 4, marginBottom: 23 }, navOverline: { color: "#6F6F6F", fontSize: 10, fontWeight: "800", letterSpacing: 1.1, paddingHorizontal: 10, marginBottom: 5, textTransform: "uppercase" }, navItem: { height: 46, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 11, borderRadius: 12 }, navItemActive: { backgroundColor: "#292929" }, navItemText: { flex: 1, color: "#9C9C9C", fontSize: 13, fontWeight: "700" }, navItemTextActive: { color: colors.surface }, navBadge: { minWidth: 19, height: 19, borderRadius: 10, backgroundColor: colors.error, justifyContent: "center", alignItems: "center", paddingHorizontal: 4 }, navBadgeText: { color: colors.surface, fontSize: 10, fontWeight: "900" }, navBottom: { flex: 1, justifyContent: "flex-end" },
  header: { minHeight: 72, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, gap: 12 }, headerTitleGroup: { flexDirection: "row", alignItems: "center", gap: 10 }, mobileMark: { width: 35, height: 35, borderRadius: 11, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }, headerEyebrow: { color: colors.inkFaint, fontSize: 9.5, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 }, headerTitle: { color: colors.ink, fontSize: 16, fontWeight: "800", marginTop: 2 }, headerActions: { flexDirection: "row", alignItems: "center", gap: 8 }, notificationWrap: { position: "relative" },
  profileButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }, profileButtonText: { color: colors.surface, fontSize: 12, fontWeight: "900", letterSpacing: 0.4 },
  contentViewport: { flex: 1 }, contentInner: { flex: 1, paddingHorizontal: 18, paddingTop: 22 }, contentInnerWide: { width: "100%", maxWidth: 1380, alignSelf: "center", paddingHorizontal: 32, paddingTop: 30 },
  mobileNav: { height: 68, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.surface, flexDirection: "row", alignItems: "stretch", paddingHorizontal: 5, paddingBottom: 2 }, mobileTab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, position: "relative" }, mobileTabIcon: { position: "relative" }, mobileTabText: { color: colors.inkFaint, fontSize: 9, fontWeight: "700" }, mobileTabTextActive: { color: colors.ink }, mobileTabIndicator: { position: "absolute", width: 18, height: 3, borderRadius: 2, backgroundColor: colors.ink, bottom: 0 }, mobileBadge: { position: "absolute", right: -9, top: -7, minWidth: 15, height: 15, borderRadius: 8, backgroundColor: colors.error, borderWidth: 1, borderColor: colors.surface, alignItems: "center", justifyContent: "center" }, mobileBadgeText: { color: colors.surface, fontSize: 8, fontWeight: "900" },
  quickMenuList: { gap: 7 }, quickMenuItem: { minHeight: 70, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 11 }, quickMenuIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" }, quickMenuCopy: { flex: 1 }, quickMenuTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" }, quickMenuDetail: { color: colors.inkMuted, fontSize: 11, marginTop: 4 },
  profileMenuTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 17 }, profileAvatar: { width: 50, height: 50, borderRadius: 17, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }, profileAvatarText: { color: colors.surface, fontSize: 16, fontWeight: "900" }, profileMenuCopy: { flex: 1, minWidth: 0 }, profileName: { color: colors.ink, fontSize: 15, fontWeight: "800" }, profileRole: { color: colors.inkMuted, fontSize: 12, marginTop: 4 }, profileCallout: { flexDirection: "row", gap: 9, padding: 13, borderRadius: 13, backgroundColor: colors.soft, marginBottom: 16 }, profileCalloutText: { color: colors.inkMuted, fontSize: 12, lineHeight: 18, flex: 1 }, profileSecondary: { marginTop: 9 },
  notificationList: { gap: 8 }, notificationRow: { minHeight: 66, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 11 }, notificationIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" }, notificationIconError: { backgroundColor: "#FBECEE" }, notificationCopy: { flex: 1, minWidth: 0 }, notificationTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" }, notificationDetail: { color: colors.inkMuted, fontSize: 11, marginTop: 3 }, notificationEmpty: { alignItems: "center", gap: 10, paddingVertical: 36 }, notificationEmptyText: { color: colors.inkMuted, fontSize: 12.5, textAlign: "center" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
