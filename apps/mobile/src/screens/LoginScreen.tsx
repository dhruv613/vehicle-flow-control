import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { FormField, Icon, IconButton, Label, PrimaryButton } from "../components/garageUi";
import { API_BASE_URL } from "../data/garageRepository";
import { DEMO_ACCOUNTS, useAuth } from "../hooks/useAuth";
import { colors, font, radius } from "../theme/tokens";

const highlights = [
  { icon: "construct-outline", title: "Workshop board", detail: "Every job, bay and technician on one live board." },
  { icon: "people-outline", title: "Customer book", detail: "Owners, vehicles and history stay connected." },
  { icon: "receipt-outline", title: "Billing", detail: "Estimates, invoices and payments without paperwork." },
] as const;

export function LoginScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 920;
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const failure = await signIn(username, password);
    if (failure) {
      setError(failure);
      setBusy(false);
    }
  };

  const fillDemo = (demoUsername: string, demoPassword: string) => {
    setUsername(demoUsername);
    setPassword(demoPassword);
    setError(null);
  };

  return (
    <View style={[styles.root, isWide && styles.rootWide]}>
      {isWide ? (
        <View style={styles.brandPanel}>
          <View style={styles.brandHeader}>
            <View style={styles.brandMark}><Icon name="speedometer-outline" size={22} color={colors.surface} /></View>
            <Text style={styles.brandName}>MOTORWISE</Text>
          </View>
          <View style={styles.brandBody}>
            <Text style={styles.brandHeadline}>Run the whole garage from one calm screen.</Text>
            <Text style={styles.brandSub}>Vehicles, customers, work orders, appointments, stock and billing — connected on web and mobile.</Text>
            <View style={styles.highlightList}>
              {highlights.map((item) => (
                <View key={item.title} style={styles.highlightRow}>
                  <View style={styles.highlightIcon}><Icon name={item.icon} size={18} color={colors.surface} /></View>
                  <View style={styles.highlightCopy}>
                    <Text style={styles.highlightTitle}>{item.title}</Text>
                    <Text style={styles.highlightDetail}>{item.detail}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
          <Text style={styles.brandFoot}>{API_BASE_URL ? "Connected to your garage server" : "Local demo workspace"}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.formViewport} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.formColumn}>
          {!isWide ? (
            <View style={styles.mobileBrand}>
              <View style={styles.brandMark}><Icon name="speedometer-outline" size={22} color={colors.surface} /></View>
              <Text style={styles.mobileBrandName}>MOTORWISE</Text>
            </View>
          ) : null}

          <Label>Garage workspace</Label>
          <Text style={styles.formTitle}>Welcome back.</Text>
          <Text style={styles.formDetail}>Sign in to open the operations desk for your workshop.</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Icon name="alert-circle-outline" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <FormField
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="e.g. admin"
            autoCapitalize="none"
            onSubmitEditing={submit}
          />
          <FormField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            autoCapitalize="none"
            secureTextEntry={!showPassword}
            onSubmitEditing={submit}
            trailing={
              <IconButton
                icon={showPassword ? "eye-off-outline" : "eye-outline"}
                label={showPassword ? "Hide password" : "Show password"}
                onPress={() => setShowPassword((current) => !current)}
                style={styles.eyeButton}
              />
            }
          />
          <PrimaryButton label={busy ? "Signing in…" : "Sign in"} icon="log-in-outline" onPress={submit} disabled={busy} style={styles.submit} />

          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Demo accounts</Text>
            <Text style={styles.demoDetail}>Tap one to fill the form, then sign in.</Text>
            <View style={styles.demoChips}>
              {DEMO_ACCOUNTS.map((account) => (
                <Pressable
                  key={account.username}
                  onPress={() => fillDemo(account.username, account.password)}
                  style={({ pressed }) => [styles.demoChip, pressed && styles.pressed]}
                >
                  <View style={styles.demoAvatar}><Text style={styles.demoAvatarText}>{account.name.split(" ").map((piece) => piece[0]).join("").slice(0, 2)}</Text></View>
                  <View style={styles.demoChipCopy}>
                    <Text style={styles.demoChipName}>{account.username}</Text>
                    <Text style={styles.demoChipRole}>{account.role}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  root: { flex: 1, backgroundColor: colors.background },
  rootWide: { flexDirection: "row" },
  brandPanel: { width: "44%", maxWidth: 560, backgroundColor: colors.ink, paddingHorizontal: 44, paddingVertical: 40, justifyContent: "space-between" },
  brandHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandMark: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#333333", alignItems: "center", justifyContent: "center" },
  brandName: { color: colors.surface, letterSpacing: 1.4, fontWeight: "900", fontSize: 15 },
  brandBody: { gap: 14, maxWidth: 420 },
  brandHeadline: { color: colors.surface, fontFamily: font.display, fontSize: 26, fontWeight: "800", letterSpacing: -0.3, lineHeight: 34 },
  brandSub: { color: "#B9B9B9", fontSize: 14, lineHeight: 21 },
  highlightList: { gap: 14, marginTop: 14 },
  highlightRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  highlightIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#242424", alignItems: "center", justifyContent: "center" },
  highlightCopy: { flex: 1 },
  highlightTitle: { color: colors.surface, fontSize: 13, fontWeight: "800" },
  highlightDetail: { color: "#9C9C9C", fontSize: 11.5, marginTop: 3, lineHeight: 16 },
  brandFoot: { color: "#7B7B7B", fontSize: 11, fontWeight: "700" },
  formViewport: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 36 },
  formColumn: { width: "100%", maxWidth: 420, alignSelf: "center", gap: 6 },
  mobileBrand: { alignItems: "center", gap: 10, marginBottom: 26 },
  mobileBrandName: { color: colors.ink, letterSpacing: 1.4, fontWeight: "900", fontSize: 14 },
  formTitle: { color: colors.ink, fontFamily: font.display, fontSize: 24, fontWeight: "800", letterSpacing: -0.3, marginTop: 6 },
  formDetail: { color: colors.inkMuted, fontSize: 14, lineHeight: 20, marginBottom: 20 },
  errorBox: { flexDirection: "row", gap: 8, alignItems: "center", borderRadius: 12, backgroundColor: "#FBECEE", padding: 12, marginBottom: 15 },
  errorText: { color: colors.error, flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "700" },
  eyeButton: { width: 38, height: 38, backgroundColor: "transparent" },
  submit: { marginTop: 4 },
  demoBox: { marginTop: 26, borderRadius: radius.md, backgroundColor: colors.soft, padding: 16 },
  demoTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  demoDetail: { color: colors.inkMuted, fontSize: 11.5, marginTop: 3, marginBottom: 12 },
  demoChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  demoChip: { flexGrow: 1, flexBasis: 150, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 9 },
  demoAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  demoAvatarText: { color: colors.surface, fontSize: 11, fontWeight: "900" },
  demoChipCopy: { flex: 1, minWidth: 0 },
  demoChipName: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  demoChipRole: { color: colors.inkMuted, fontSize: 10, marginTop: 2 },
});
