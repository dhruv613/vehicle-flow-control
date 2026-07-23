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

import { Icon, IconButton, NotificationDot, PrimaryButton, Sheet, Toast } from "./src/components/garageUi";
import { GarageProvider, useGarage } from "./src/hooks/useGarage";
import {
  CalendarScreen,
  CustomersScreen,
  DashboardScreen,
  InventoryScreen,
  SettingsScreen,
  VehiclesScreen,
  WorkOrdersScreen,
} from "./src/screens/GarageScreens";
import type { ScreenName } from "./src/data/types";
import { colors, font, radius } from "./src/theme/tokens";

const navigation: { key: ScreenName; label: string; icon: Parameters<typeof Icon>[0]["name"] }[] = [
  { key: "dashboard", label: "Overview", icon: "grid-outline" },
  { key: "vehicles", label: "Vehicles", icon: "car-outline" },
  { key: "customers", label: "Customers", icon: "people-outline" },
  { key: "workorders", label: "Work orders", icon: "construct-outline" },
  { key: "calendar", label: "Calendar", icon: "calendar-outline" },
  { key: "inventory", label: "Inventory", icon: "cube-outline" },
  { key: "settings", label: "Settings", icon: "settings-outline" },
];

const mobileTabs: ScreenName[] = ["dashboard", "vehicles", "workorders", "calendar", "settings"];

export default function App() {
  return <GarageProvider><GarageApp /></GarageProvider>;
}

function GarageApp() {
  const { width } = useWindowDimensions();
  const isWide = width >= 920;
  const [screen, setScreen] = useState<ScreenName>("dashboard");
  const [quickMenu, setQuickMenu] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  const { settings, inventory, toast, dismissToast } = useGarage();
  const activeItem = navigation.find((item) => item.key === screen) ?? navigation[0];
  const lowStock = inventory.filter((item) => item.quantity <= item.reorderAt).length;

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
          <Header title={activeItem.label} isWide={isWide} onOpenMenu={() => setProfileMenu(true)} onOpenQuick={() => setQuickMenu(true)} />
          <Animated.View style={[styles.contentViewport, { opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
            <View style={[styles.contentInner, isWide && styles.contentInnerWide]}>{content}</View>
          </Animated.View>
          {!isWide ? <MobileNav active={screen} onNavigate={navigate} lowStock={lowStock} /> : null}
        </View>
      </View>
      <QuickMenu visible={quickMenu} onClose={() => setQuickMenu(false)} onNavigate={(target) => { setQuickMenu(false); navigate(target); }} />
      <ProfileMenu visible={profileMenu} onClose={() => setProfileMenu(false)} onNavigate={(target) => { setProfileMenu(false); navigate(target); }} />
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
    <View style={styles.navSection}><Text style={styles.navOverline}>Workspace</Text>{navigation.slice(0, 4).map((item) => <NavItem key={item.key} item={item} active={active === item.key} onPress={() => onNavigate(item.key)} badge={item.key === "inventory" ? lowStock : 0} />)}</View>
    <View style={styles.navSection}><Text style={styles.navOverline}>Planning</Text>{navigation.slice(4, 6).map((item) => <NavItem key={item.key} item={item} active={active === item.key} onPress={() => onNavigate(item.key)} badge={item.key === "inventory" ? lowStock : 0} />)}</View>
    <View style={styles.navBottom}><NavItem item={navigation[6]} active={active === "settings"} onPress={() => onNavigate("settings")} badge={0} /><View style={styles.navHelp}><Icon name="sparkles-outline" size={17} color="#B6B6B6" /><View style={styles.navHelpCopy}><Text style={styles.navHelpTitle}>Client-ready demo</Text><Text style={styles.navHelpDetail}>Local-first workspace</Text></View></View></View>
  </View>;
}

function NavItem({ item, active, onPress, badge }: { item: typeof navigation[number]; active: boolean; onPress: () => void; badge: number }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.navItem, active && styles.navItemActive, pressed && styles.pressed]}><Icon name={item.icon} size={19} color={active ? colors.surface : "#9C9C9C"} /><Text style={[styles.navItemText, active && styles.navItemTextActive]}>{item.label}</Text>{badge ? <View style={styles.navBadge}><Text style={styles.navBadgeText}>{badge}</Text></View> : null}</Pressable>;
}

function Header({ title, isWide, onOpenMenu, onOpenQuick }: { title: string; isWide: boolean; onOpenMenu: () => void; onOpenQuick: () => void }) {
  return <View style={styles.header}>
    <View style={styles.headerTitleGroup}>{!isWide ? <View style={styles.mobileMark}><Icon name="speedometer-outline" size={19} color={colors.surface} /></View> : null}<View><Text style={styles.headerEyebrow}>Motorwise garage</Text><Text style={styles.headerTitle}>{title}</Text></View></View>
    <View style={styles.headerActions}><View style={styles.notificationWrap}><IconButton icon="notifications-outline" label="Notifications" onPress={onOpenMenu} /><NotificationDot /></View>{isWide ? <PrimaryButton label="Create" icon="add" onPress={onOpenQuick} compact /> : <IconButton icon="add" label="Create new" onPress={onOpenQuick} inverse />}</View>
  </View>;
}

function MobileNav({ active, onNavigate, lowStock }: { active: ScreenName; onNavigate: (screen: ScreenName) => void; lowStock: number }) {
  return <View style={styles.mobileNav}>{mobileTabs.map((key) => { const item = navigation.find((entry) => entry.key === key)!; const selected = active === key; const badge = key === "settings" ? 0 : key === "workorders" ? lowStock : 0; return <Pressable key={key} onPress={() => onNavigate(key)} style={({ pressed }) => [styles.mobileTab, pressed && styles.pressed]}><View style={styles.mobileTabIcon}><Icon name={item.icon} size={20} color={selected ? colors.ink : colors.inkFaint} />{badge ? <View style={styles.mobileBadge}><Text style={styles.mobileBadgeText}>{badge}</Text></View> : null}</View><Text style={[styles.mobileTabText, selected && styles.mobileTabTextActive]}>{item.label === "Work orders" ? "Jobs" : item.label}</Text>{selected ? <View style={styles.mobileTabIndicator} /> : null}</Pressable>; })}</View>;
}

function QuickMenu({ visible, onClose, onNavigate }: { visible: boolean; onClose: () => void; onNavigate: (screen: ScreenName) => void }) {
  return <Sheet visible={visible} onClose={onClose} title="Create something useful" subtitle="Jump into the most common front-desk actions."><View style={styles.quickMenuList}><QuickMenuItem icon="car-outline" title="Add a vehicle" detail="Register a car and assign its owner." onPress={() => onNavigate("vehicles")} /><QuickMenuItem icon="person-add-outline" title="Add a customer" detail="Start a clean customer profile." onPress={() => onNavigate("customers")} /><QuickMenuItem icon="construct-outline" title="Open a work order" detail="Send a vehicle into the workshop flow." onPress={() => onNavigate("workorders")} /><QuickMenuItem icon="calendar-outline" title="Schedule an appointment" detail="Reserve a drop-off or collection time." onPress={() => onNavigate("calendar")} /><QuickMenuItem icon="cube-outline" title="Add an inventory part" detail="Create a trackable stock line." onPress={() => onNavigate("inventory")} /></View></Sheet>;
}

function QuickMenuItem({ icon, title, detail, onPress }: { icon: Parameters<typeof Icon>[0]["name"]; title: string; detail: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.quickMenuItem, pressed && styles.pressed]}><View style={styles.quickMenuIcon}><Icon name={icon} size={20} color={colors.ink} /></View><View style={styles.quickMenuCopy}><Text style={styles.quickMenuTitle}>{title}</Text><Text style={styles.quickMenuDetail}>{detail}</Text></View><Icon name="chevron-forward" size={19} color={colors.inkFaint} /></Pressable>;
}

function ProfileMenu({ visible, onClose, onNavigate }: { visible: boolean; onClose: () => void; onNavigate: (screen: ScreenName) => void }) {
  const { settings, connection } = useGarage();
  const label = connection === "connected" ? "Connected to FastAPI" : connection === "local" ? "Using included local demo data" : "Working offline with local data";
  return <Sheet visible={visible} onClose={onClose} title="Garage workspace" subtitle={label}><View style={styles.profileMenuTop}><View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{settings.ownerName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</Text></View><View><Text style={styles.profileName}>{settings.ownerName}</Text><Text style={styles.profileRole}>{settings.garageName}</Text></View></View><View style={styles.profileCallout}><Icon name="information-circle-outline" size={20} color={colors.ink} /><Text style={styles.profileCalloutText}>This build has an Expo interface and a local FastAPI service. Use Settings to restore the demo workspace.</Text></View><PrimaryButton label="Open settings" icon="settings-outline" onPress={() => onNavigate("settings")} /><PrimaryButton label="View API-ready vehicles" icon="car-outline" onPress={() => onNavigate("vehicles")} variant="light" style={styles.profileSecondary} /></Sheet>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, appFrame: { flex: 1, flexDirection: "row", backgroundColor: colors.background }, mainArea: { flex: 1, minWidth: 0 },
  desktopNav: { width: 252, backgroundColor: colors.ink, paddingHorizontal: 15, paddingTop: 18, paddingBottom: 18 }, brandBlock: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 8, paddingBottom: 30 }, brandMark: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#333333", alignItems: "center", justifyContent: "center" }, brandCopy: { flex: 1, minWidth: 0 }, brandName: { color: colors.surface, letterSpacing: 1.1, fontWeight: "900", fontSize: 13 }, brandSub: { color: "#A7A7A7", fontSize: 10, marginTop: 4 }, navSection: { gap: 4, marginBottom: 23 }, navOverline: { color: "#6F6F6F", fontSize: 10, fontWeight: "800", letterSpacing: 1.1, paddingHorizontal: 10, marginBottom: 5, textTransform: "uppercase" }, navItem: { height: 46, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 11, borderRadius: 12 }, navItemActive: { backgroundColor: "#292929" }, navItemText: { flex: 1, color: "#9C9C9C", fontSize: 13, fontWeight: "700" }, navItemTextActive: { color: colors.surface }, navBadge: { minWidth: 19, height: 19, borderRadius: 10, backgroundColor: colors.error, justifyContent: "center", alignItems: "center", paddingHorizontal: 4 }, navBadgeText: { color: colors.surface, fontSize: 10, fontWeight: "900" }, navBottom: { flex: 1, justifyContent: "flex-end", gap: 14 }, navHelp: { borderRadius: 14, padding: 13, backgroundColor: "#202020", flexDirection: "row", gap: 9, alignItems: "center" }, navHelpCopy: { flex: 1 }, navHelpTitle: { color: colors.surface, fontSize: 11, fontWeight: "800" }, navHelpDetail: { color: "#9C9C9C", fontSize: 9.5, marginTop: 3 },
  header: { minHeight: 72, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, gap: 12 }, headerTitleGroup: { flexDirection: "row", alignItems: "center", gap: 10 }, mobileMark: { width: 35, height: 35, borderRadius: 11, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }, headerEyebrow: { color: colors.inkFaint, fontSize: 9.5, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 }, headerTitle: { color: colors.ink, fontSize: 16, fontWeight: "800", marginTop: 2 }, headerActions: { flexDirection: "row", alignItems: "center", gap: 8 }, notificationWrap: { position: "relative" },
  contentViewport: { flex: 1 }, contentInner: { flex: 1, paddingHorizontal: 18, paddingTop: 22 }, contentInnerWide: { width: "100%", maxWidth: 1380, alignSelf: "center", paddingHorizontal: 32, paddingTop: 30 },
  mobileNav: { height: 68, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.surface, flexDirection: "row", alignItems: "stretch", paddingHorizontal: 5, paddingBottom: 2 }, mobileTab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, position: "relative" }, mobileTabIcon: { position: "relative" }, mobileTabText: { color: colors.inkFaint, fontSize: 9, fontWeight: "700" }, mobileTabTextActive: { color: colors.ink }, mobileTabIndicator: { position: "absolute", width: 18, height: 3, borderRadius: 2, backgroundColor: colors.ink, bottom: 0 }, mobileBadge: { position: "absolute", right: -9, top: -7, minWidth: 15, height: 15, borderRadius: 8, backgroundColor: colors.error, borderWidth: 1, borderColor: colors.surface, alignItems: "center", justifyContent: "center" }, mobileBadgeText: { color: colors.surface, fontSize: 8, fontWeight: "900" },
  quickMenuList: { gap: 7 }, quickMenuItem: { minHeight: 70, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 11 }, quickMenuIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" }, quickMenuCopy: { flex: 1 }, quickMenuTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" }, quickMenuDetail: { color: colors.inkMuted, fontSize: 11, marginTop: 4 },
  profileMenuTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 17 }, profileAvatar: { width: 50, height: 50, borderRadius: 17, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }, profileAvatarText: { color: colors.surface, fontSize: 16, fontWeight: "900" }, profileName: { color: colors.ink, fontSize: 15, fontWeight: "800" }, profileRole: { color: colors.inkMuted, fontSize: 12, marginTop: 4 }, profileCallout: { flexDirection: "row", gap: 9, padding: 13, borderRadius: 13, backgroundColor: colors.soft, marginBottom: 16 }, profileCalloutText: { color: colors.inkMuted, fontSize: 12, lineHeight: 18, flex: 1 }, profileSecondary: { marginTop: 9 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
