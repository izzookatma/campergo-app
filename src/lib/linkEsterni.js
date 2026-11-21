import { Linking, Alert } from "react-native";

// Apre un link esterno (telefono, mappe, sito, mail) senza mai restare in
// silenzio: se il telefono non sa aprirlo, mostra un avviso invece di non
// fare nulla. `messaggio` è il testo già tradotto (t("comune.linkNonApribile")).
export async function apriLink(url, messaggio) {
  if (!url) return false;
  try {
    await Linking.openURL(url);
    return true;
  } catch (e) {
    console.error("Impossibile aprire il link:", url, e);
    Alert.alert(messaggio || "Link non apribile");
    return false;
  }
}
