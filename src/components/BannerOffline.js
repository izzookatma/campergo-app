import { useEffect, useState } from "react";
import { View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Testo from "./ui/Testo";
import { useT } from "../i18n/i18n";

// Striscia in alto che compare solo quando manca la connessione, così
// l'utente capisce perché le liste non si caricano (e non pensa a un guasto).
export default function BannerOffline() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const annulla = NetInfo.addEventListener((stato) => {
      setOffline(stato.isConnected === false || stato.isInternetReachable === false);
    });
    return annulla;
  }, []);

  if (!offline) return null;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ backgroundColor: "#92400e", paddingTop: insets.top + 4, paddingBottom: 6, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 8 }}
    >
      <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
      <Testo style={{ color: "#fff", fontSize: 12.5, fontWeight: "600", flex: 1 }}>{t("comune.offline")}</Testo>
    </View>
  );
}
