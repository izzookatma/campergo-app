import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { supabase } from "./supabase";

// Notifiche push per i gestori: ogni avviso nuovo (tabella avvisi_host)
// arriva anche come notifica sul telefono. Il token del telefono si salva
// in push_token_host; l'invio parte dal database (migrazione 392 del sito).

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

// Chiede il permesso (una volta) e registra il token del telefono.
// Non lancia mai errori: senza notifiche l'app funziona lo stesso.
export async function registraNotifichePush(utenteId) {
  try {
    if (!utenteId || Platform.OS === "web") return null;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Avvisi",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== "granted") return null;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { error } = await supabase.rpc("registra_push_token", { p_token: token, p_piattaforma: Platform.OS });
    if (error) throw error;
    return token;
  } catch (e) {
    console.error("[NaturaGo app] registraNotifichePush", e);
    return null;
  }
}
