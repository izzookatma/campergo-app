import { Platform } from "react-native";
import Constants from "expo-constants";

// Quando la mappa vera (react-native-maps) NON può essere mostrata e va
// usato il segnaposto:
// - dentro Expo Go, che non contiene il modulo nativo;
// - su Android finché non c'è la chiave Google Maps: lì la mappa è sempre
//   Google e senza chiave non resta vuota, manda in bianco TUTTA l'app
//   ("API key not found", verificato sull'emulatore il 16/11/2026) fino
//   al riavvio.
// Quando la chiave Google verrà aggiunta in app.json
// (android.config.googleMaps.apiKey), mettere anche
// extra.mappaAndroidAttiva a true: la chiave in sé non è leggibile da qui
// (Expo la toglie dalla configurazione visibile all'app).
const DENTRO_EXPO_GO = Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";
const ANDROID_SENZA_CHIAVE = Platform.OS === "android" && Constants.expoConfig?.extra?.mappaAndroidAttiva !== true;

export const MAPPA_VERA_NON_DISPONIBILE = DENTRO_EXPO_GO || ANDROID_SENZA_CHIAVE;
