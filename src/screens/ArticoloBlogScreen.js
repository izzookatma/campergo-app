import { useEffect, useState } from "react";
import { View, Text, Image, Pressable, ScrollView, StyleSheet, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { colori } from "../theme/colors";
import {
  caricaArticolo,
  caricaArticoliCorrelati,
  incrementaMiPiace,
  paragrafiArticolo,
  etichettaRubrica,
  urlCtaArticolo,
  testoCtaArticolo,
} from "../lib/blog";

function dataLunga(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

const RE_IMMAGINE = /^!\[([^\]]*)\]\(([^)]+)\)$/;
const chiaveMiPiace = (slug) => `naturago_blog_mi_piace_${slug}`;

// Spezza un paragrafo nei pezzi di testo normale e nei link
// "[testo](/percorso)": i link interni al sito si aprono nel browser (l'app
// non ha le pagine elenco per categoria/regione), stessa idea di
// testoConLink in src/ArticoloBlog.jsx sul sito.
function BloccoTesto({ testo, stile }) {
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parti = [];
  let ultimo = 0;
  let m;
  while ((m = re.exec(testo))) {
    if (m.index > ultimo) parti.push(testo.slice(ultimo, m.index));
    const href = m[2];
    const testoLink = m[1];
    parti.push(
      <Text
        key={m.index}
        style={styles.link}
        onPress={() => Linking.openURL(href.startsWith("http") ? href : `https://www.naturago.it${href}`)}
      >
        {testoLink}
      </Text>
    );
    ultimo = re.lastIndex;
  }
  if (ultimo < testo.length) parti.push(testo.slice(ultimo));
  return <Text style={stile}>{parti}</Text>;
}

function BloccoArticolo({ paragrafo }) {
  if (paragrafo.startsWith("## ")) {
    return <Text style={styles.sottotitolo}>{paragrafo.slice(3)}</Text>;
  }
  const immagine = RE_IMMAGINE.exec(paragrafo);
  if (immagine) {
    const [, credito, url] = immagine;
    return (
      <View style={styles.figura}>
        <Image source={{ uri: url }} style={styles.figuraImmagine} />
        {credito ? <Text style={styles.figuraCredito}>Foto: {credito}</Text> : null}
      </View>
    );
  }
  return <BloccoTesto testo={paragrafo} stile={styles.paragrafo} />;
}

export default function ArticoloBlogScreen({ route, navigation }) {
  const { slug } = route.params;
  const [articolo, setArticolo] = useState(undefined);
  const [correlati, setCorrelati] = useState([]);
  const [conteggio, setConteggio] = useState(0);
  const [giaMesso, setGiaMesso] = useState(false);

  useEffect(() => {
    let attivo = true;
    caricaArticolo(slug)
      .then((a) => {
        if (!attivo) return;
        setArticolo(a ?? null);
        setConteggio(a?.mi_piace || 0);
        if (a?.rubrica) caricaArticoliCorrelati(a.rubrica, slug).then((r) => attivo && setCorrelati(r));
      })
      .catch((e) => console.error("Errore nel caricare l'articolo:", e));
    AsyncStorage.getItem(chiaveMiPiace(slug))
      .then((v) => attivo && setGiaMesso(v === "1"))
      .catch(() => {});
    return () => {
      attivo = false;
    };
  }, [slug]);

  const metti = async () => {
    if (giaMesso) return;
    setGiaMesso(true);
    setConteggio((c) => c + 1);
    AsyncStorage.setItem(chiaveMiPiace(slug), "1").catch(() => {});
    try {
      const nuovo = await incrementaMiPiace(slug);
      if (nuovo != null) setConteggio(nuovo);
    } catch (e) {
      console.error("Errore nel registrare il Mi piace:", e);
    }
  };

  if (articolo === undefined) {
    return (
      <View style={styles.schermo}>
        <ActivityIndicator style={{ marginTop: 60 }} color={colori.blu} />
      </View>
    );
  }

  if (articolo === null) {
    return (
      <View style={styles.schermo}>
        <SafeAreaView edges={["top"]} style={styles.intestazioneSemplice}>
          <Pressable style={styles.tornaIndietro} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={18} color={colori.testo} />
          </Pressable>
        </SafeAreaView>
        <View style={styles.vuoto}>
          <Text style={styles.vuotoTitolo}>Articolo non trovato</Text>
          <Text style={styles.vuotoTesto}>Può essere stato tolto o spostato.</Text>
        </View>
      </View>
    );
  }

  const paragrafi = paragrafiArticolo(articolo.contenuto);
  const urlCta = urlCtaArticolo(articolo);
  const testoCta = testoCtaArticolo(articolo);

  return (
    <View style={styles.schermo}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        {articolo.foto_copertina ? (
          <View style={styles.hero}>
            <Image source={{ uri: articolo.foto_copertina }} style={styles.heroImmagine} />
            <SafeAreaView edges={["top"]}>
              <Pressable style={styles.tornaIndietro} onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={18} color={colori.testo} />
              </Pressable>
            </SafeAreaView>
          </View>
        ) : (
          <SafeAreaView edges={["top"]} style={styles.intestazioneSemplice}>
            <Pressable style={styles.tornaIndietro} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={18} color={colori.testo} />
            </Pressable>
          </SafeAreaView>
        )}

        <View style={styles.contenuto}>
          {articolo.foto_credito && <Text style={styles.fotoCredito}>Foto: {articolo.foto_credito}</Text>}
          {articolo.rubrica && <Text style={styles.rubrica}>{etichettaRubrica(articolo.rubrica)}</Text>}
          <Text style={styles.titolo}>{articolo.titolo}</Text>
          {articolo.data_pubblicazione && (
            <Text style={styles.data}>Pubblicato il {dataLunga(articolo.data_pubblicazione)}</Text>
          )}
          {articolo.estratto && <Text style={styles.estratto}>{articolo.estratto}</Text>}

          <View style={{ gap: 10, marginTop: 6 }}>
            {paragrafi.map((p, i) => (
              <BloccoArticolo key={i} paragrafo={p} />
            ))}
          </View>

          <Pressable
            style={[styles.miPiace, giaMesso && styles.miPiaceAttivo]}
            onPress={metti}
            disabled={giaMesso}
          >
            <Ionicons name={giaMesso ? "heart" : "heart-outline"} size={16} color={giaMesso ? colori.arancio : colori.testo} />
            <Text style={[styles.miPiaceTesto, giaMesso && { color: colori.arancio }]}>
              Mi piace{conteggio > 0 ? ` (${conteggio})` : ""}
            </Text>
          </Pressable>

          {urlCta && testoCta && (
            <Pressable style={styles.cta} onPress={() => Linking.openURL(urlCta)}>
              <Text style={styles.ctaTesto}>{testoCta}</Text>
              <Ionicons name="arrow-forward" size={14} color={colori.bianco} />
            </Pressable>
          )}

          {correlati.length > 0 && (
            <View style={styles.leggiAnche}>
              <Text style={styles.leggiAncheTitolo}>Leggi anche</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {correlati.map((c) => (
                  <Pressable
                    key={c.slug}
                    style={styles.correlatoCard}
                    onPress={() => navigation.push("ArticoloBlog", { slug: c.slug })}
                  >
                    {c.foto_copertina ? (
                      <Image source={{ uri: c.foto_copertina }} style={styles.correlatoFoto} />
                    ) : (
                      <View style={[styles.correlatoFoto, { backgroundColor: colori.grigioSfondo }]} />
                    )}
                    <View style={styles.correlatoOmbra} />
                    <Text style={styles.correlatoTitolo} numberOfLines={3}>
                      {c.titolo}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.bianco },
  hero: { height: 220 },
  heroImmagine: { width: "100%", height: "100%", position: "absolute" },
  intestazioneSemplice: { paddingTop: 4 },
  tornaIndietro: {
    marginTop: 8,
    marginLeft: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  contenuto: { padding: 20, gap: 4 },
  fotoCredito: { fontSize: 10, color: colori.testoSecondario, marginBottom: 6 },
  rubrica: {
    alignSelf: "flex-start",
    backgroundColor: colori.arancioChiaro,
    color: colori.arancio,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 6,
  },
  titolo: { fontSize: 21, fontWeight: "800", color: colori.testo, lineHeight: 27 },
  data: { fontSize: 11, color: colori.testoSecondario, marginTop: 6 },
  estratto: { fontSize: 14, fontWeight: "600", color: colori.testo, marginTop: 10, lineHeight: 20 },
  sottotitolo: { fontSize: 16, fontWeight: "800", color: colori.testo, marginTop: 6 },
  paragrafo: { fontSize: 13.5, lineHeight: 21, color: "#374151" },
  link: { color: colori.blu, fontWeight: "700", textDecorationLine: "underline" },
  figura: { gap: 4 },
  figuraImmagine: { width: "100%", height: 190, borderRadius: 14 },
  figuraCredito: { fontSize: 10, color: colori.testoSecondario },
  miPiace: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colori.bordo,
  },
  miPiaceAttivo: { backgroundColor: colori.arancioChiaro, borderColor: colori.arancio },
  miPiaceTesto: { fontSize: 12.5, fontWeight: "700", color: colori.testo },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    backgroundColor: colori.arancio,
    borderRadius: 999,
    paddingVertical: 12,
  },
  ctaTesto: { color: colori.bianco, fontWeight: "800", fontSize: 13 },
  leggiAnche: { marginTop: 22, paddingTop: 16, borderTopWidth: 1, borderTopColor: colori.bordo, gap: 10 },
  leggiAncheTitolo: { fontSize: 15, fontWeight: "800", color: colori.testo },
  correlatoCard: { width: 140, height: 100, borderRadius: 12, overflow: "hidden" },
  correlatoFoto: { width: "100%", height: "100%", position: "absolute" },
  correlatoOmbra: { position: "absolute", inset: 0, backgroundColor: "rgba(15,29,23,0.35)" },
  correlatoTitolo: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 8, color: colori.bianco, fontSize: 11, fontWeight: "700", lineHeight: 14 },
  vuoto: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 40 },
  vuotoTitolo: { fontSize: 16, fontWeight: "800", color: colori.testo },
  vuotoTesto: { fontSize: 12.5, color: colori.testoSecondario },
});
