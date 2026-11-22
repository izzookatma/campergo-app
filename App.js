import { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, createNavigationContainerRef, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { vibraLeggera } from "./src/lib/vibrazione";

import EsploraHubScreen from "./src/screens/EsploraHubScreen";
import EsploraScreen from "./src/screens/EsploraScreen";
import MappaScreen from "./src/screens/MappaScreen";
import SchedaScreen from "./src/screens/SchedaScreen";
import PreferitiScreen from "./src/screens/PreferitiScreen";
import ProfiloScreen from "./src/screens/ProfiloScreen";
import PrenotazioniScreen from "./src/screens/PrenotazioniScreen";
import SentieriScreen from "./src/screens/SentieriScreen";
import Percorsi4x4Screen from "./src/screens/Percorsi4x4Screen";
import ItinerarioDettaglioScreen from "./src/screens/ItinerarioDettaglioScreen";
import CulturaScreen from "./src/screens/CulturaScreen";
import SchedaCulturaleScreen from "./src/screens/SchedaCulturaleScreen";
import MieSegnalazioniScreen from "./src/screens/MieSegnalazioniScreen";
import ItinerariOfflineScreen from "./src/screens/ItinerariOfflineScreen";
import NuovaSegnalazioneScreen from "./src/screens/NuovaSegnalazioneScreen";
import NuovoItinerarioScreen from "./src/screens/NuovoItinerarioScreen";
import EliminaAccountScreen from "./src/screens/EliminaAccountScreen";
import MiaStrutturaScreen from "./src/screens/MiaStrutturaScreen";
import ModificaProfiloScreen from "./src/screens/ModificaProfiloScreen";
import PiazzoleScreen from "./src/screens/PiazzoleScreen";
import AvvisiScreen from "./src/screens/AvvisiScreen";
import MercatinoScreen from "./src/screens/MercatinoScreen";
import AnnuncioScreen from "./src/screens/AnnuncioScreen";
import NuovoAnnuncioScreen from "./src/screens/NuovoAnnuncioScreen";
import MessaggiScreen from "./src/screens/MessaggiScreen";
import ConversazioneScreen from "./src/screens/ConversazioneScreen";
import BannerOffline from "./src/components/BannerOffline";
import ErrorBoundary from "./src/components/ErrorBoundary";
import SchermataAvvio from "./src/screens/SchermataAvvio";
import AccediScreen from "./src/screens/AccediScreen";
import BlogScreen from "./src/screens/BlogScreen";
import ArticoloBlogScreen from "./src/screens/ArticoloBlogScreen";
import PianificaViaggioScreen from "./src/screens/PianificaViaggioScreen";
import CreaVacanzaScreen from "./src/screens/CreaVacanzaScreen";
import PianiSalvatiScreen from "./src/screens/PianiSalvatiScreen";
import FaqScreen from "./src/screens/FaqScreen";
import NuovaDomandaScreen from "./src/screens/NuovaDomandaScreen";
import GiochiHubScreen from "./src/screens/GiochiHubScreen";
import TrisScreen from "./src/screens/TrisScreen";
import MemoryScreen from "./src/screens/MemoryScreen";
import CruciverbaScreen from "./src/screens/CruciverbaScreen";
import ImpiccatoScreen from "./src/screens/ImpiccatoScreen";
import OcaScreen from "./src/screens/OcaScreen";
import { colori } from "./src/theme/colors";
import { useTema } from "./src/theme/tema";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { PreferenzeProvider } from "./src/context/PreferenzeContext";
import { segnaApertura, segnaSchermata, attivaSegnalazioneErrori } from "./src/lib/telemetria";
import { useT } from "./src/i18n/i18n";

// Conteggio anonimo dell'uso (vedi src/lib/telemetria.js).
attivaSegnalazioneErrori();
const riferimentoNavigazione = createNavigationContainerRef();

// Link in ingresso (naturago://… e https://www.naturago.it/…): aprono la
// sezione giusta. Le schede singole (struttura, annuncio) richiedono i dati
// completi e non sono apribili da un link: quei percorsi portano alla lista.
const linking = {
  prefixes: [Linking.createURL("/"), "naturago://", "https://www.naturago.it", "https://naturago.it"],
  config: {
    screens: {
      Esplora: {
        screens: {
          EsploraHub: "esplora",
          EsploraLista: "campeggi",
          Sentieri: "sentieri",
          Percorsi4x4: "percorsi-4x4",
          Cultura: "cultura",
          Blog: "blog",
          ArticoloBlog: "blog/:slug",
          CreaVacanza: "crea-vacanza",
          Faq: "faq",
        },
      },
      Mappa: "mappa",
      Preferiti: "preferiti",
      Mercatino: "mercatino",
      Profilo: "profilo",
    },
  },
};

function segnaSchermataCorrente() {
  let stato = riferimentoNavigazione.getRootState();
  let rotta = null;
  while (stato && stato.routes?.length) {
    rotta = stato.routes[stato.index ?? 0];
    stato = rotta.state;
  }
  if (rotta) segnaSchermata(rotta.name, rotta.params);
}

// Copertina con logo e frase solo mentre l'app controlla la sessione: nessuna
// attesa artificiale, appena la sessione è pronta si entra.

const Tab = createBottomTabNavigator();
const EsploraStack = createNativeStackNavigator();
const PreferitiStack = createNativeStackNavigator();
const MappaStack = createNativeStackNavigator();
const ProfiloStack = createNativeStackNavigator();
const MercatinoStack = createNativeStackNavigator();

function EsploraStackNavigator() {
  return (
    <EsploraStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="EsploraHub">
      <EsploraStack.Screen name="EsploraHub" component={EsploraHubScreen} />
      <EsploraStack.Screen name="EsploraLista" component={EsploraScreen} />
      <EsploraStack.Screen name="Scheda" component={SchedaScreen} />
      <EsploraStack.Screen name="Accedi" component={AccediScreen} />
      <EsploraStack.Screen name="Sentieri" component={SentieriScreen} />
      <EsploraStack.Screen name="Percorsi4x4" component={Percorsi4x4Screen} />
      <EsploraStack.Screen name="ItinerarioDettaglio" component={ItinerarioDettaglioScreen} />
      <EsploraStack.Screen name="Cultura" component={CulturaScreen} />
      <EsploraStack.Screen name="SchedaCulturale" component={SchedaCulturaleScreen} />
      <EsploraStack.Screen name="NuovoItinerario" component={NuovoItinerarioScreen} />
      <EsploraStack.Screen name="Blog" component={BlogScreen} />
      <EsploraStack.Screen name="ArticoloBlog" component={ArticoloBlogScreen} />
      <EsploraStack.Screen name="PianificaViaggio" component={PianificaViaggioScreen} />
      <EsploraStack.Screen name="CreaVacanza" component={CreaVacanzaScreen} />
      <EsploraStack.Screen name="Faq" component={FaqScreen} />
      <EsploraStack.Screen name="NuovaDomanda" component={NuovaDomandaScreen} />
    </EsploraStack.Navigator>
  );
}

function PreferitiStackNavigator() {
  return (
    <PreferitiStack.Navigator screenOptions={{ headerShown: false }}>
      <PreferitiStack.Screen name="PreferitiLista" component={PreferitiScreen} />
      <PreferitiStack.Screen name="Scheda" component={SchedaScreen} />
      <PreferitiStack.Screen name="SchedaCulturale" component={SchedaCulturaleScreen} />
      <PreferitiStack.Screen name="Accedi" component={AccediScreen} />
    </PreferitiStack.Navigator>
  );
}

function MappaStackNavigator() {
  return (
    <MappaStack.Navigator screenOptions={{ headerShown: false }}>
      <MappaStack.Screen name="MappaVista" component={MappaScreen} />
      <MappaStack.Screen name="Scheda" component={SchedaScreen} />
      <MappaStack.Screen name="SchedaCulturale" component={SchedaCulturaleScreen} />
      <MappaStack.Screen name="ItinerarioDettaglio" component={ItinerarioDettaglioScreen} />
      <MappaStack.Screen name="Accedi" component={AccediScreen} />
    </MappaStack.Navigator>
  );
}

function ProfiloStackNavigator() {
  return (
    <ProfiloStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfiloStack.Screen name="ProfiloVista" component={ProfiloScreen} />
      <ProfiloStack.Screen name="Prenotazioni" component={PrenotazioniScreen} />
      <ProfiloStack.Screen name="Scheda" component={SchedaScreen} />
      <ProfiloStack.Screen name="SchedaCulturale" component={SchedaCulturaleScreen} />
      <ProfiloStack.Screen name="ItinerarioDettaglio" component={ItinerarioDettaglioScreen} />
      <ProfiloStack.Screen name="PianiSalvati" component={PianiSalvatiScreen} />
      <ProfiloStack.Screen name="PianificaViaggio" component={PianificaViaggioScreen} />
      <ProfiloStack.Screen name="CreaVacanza" component={CreaVacanzaScreen} />
      <ProfiloStack.Screen name="MieSegnalazioni" component={MieSegnalazioniScreen} />
      <ProfiloStack.Screen name="ItinerariOffline" component={ItinerariOfflineScreen} />
      <ProfiloStack.Screen name="NuovaSegnalazione" component={NuovaSegnalazioneScreen} />
      <ProfiloStack.Screen name="MiaStruttura" component={MiaStrutturaScreen} />
      <ProfiloStack.Screen name="ModificaProfilo" component={ModificaProfiloScreen} />
      <ProfiloStack.Screen name="PiazzoleStruttura" component={PiazzoleScreen} />
      <ProfiloStack.Screen name="AvvisiStruttura" component={AvvisiScreen} />
      <ProfiloStack.Screen name="EliminaAccount" component={EliminaAccountScreen} />
      <ProfiloStack.Screen name="Faq" component={FaqScreen} />
      <ProfiloStack.Screen name="NuovaDomanda" component={NuovaDomandaScreen} />
      <ProfiloStack.Screen name="GiochiHub" component={GiochiHubScreen} />
      <ProfiloStack.Screen name="Tris" component={TrisScreen} />
      <ProfiloStack.Screen name="Memory" component={MemoryScreen} />
      <ProfiloStack.Screen name="Cruciverba" component={CruciverbaScreen} />
      <ProfiloStack.Screen name="Impiccato" component={ImpiccatoScreen} />
      <ProfiloStack.Screen name="Oca" component={OcaScreen} />
      <ProfiloStack.Screen name="Accedi" component={AccediScreen} />
    </ProfiloStack.Navigator>
  );
}

function MercatinoStackNavigator() {
  return (
    <MercatinoStack.Navigator screenOptions={{ headerShown: false }}>
      <MercatinoStack.Screen name="MercatinoLista" component={MercatinoScreen} />
      <MercatinoStack.Screen name="Annuncio" component={AnnuncioScreen} />
      <MercatinoStack.Screen name="NuovoAnnuncio" component={NuovoAnnuncioScreen} />
      <MercatinoStack.Screen name="Messaggi" component={MessaggiScreen} />
      <MercatinoStack.Screen name="Conversazione" component={ConversazioneScreen} />
    </MercatinoStack.Navigator>
  );
}

const ICONE_TAB = {
  Esplora: "compass",
  Mappa: "map",
  Preferiti: "heart",
  Mercatino: "storefront",
  Profilo: "person",
};

const CHIAVE_TAB = {
  Esplora: "tab.esplora",
  Mappa: "tab.mappa",
  Preferiti: "tab.preferiti",
  Mercatino: "tab.mercatino",
  Profilo: "tab.profilo",
};

// Icona del tab con "molla" quando viene selezionata.
function IconaTab({ nome, focused, color }) {
  const [scala] = useState(() => new Animated.Value(1));
  const precedente = useRef(focused);
  useEffect(() => {
    if (focused && !precedente.current) {
      Animated.sequence([
        Animated.timing(scala, { toValue: 1.3, duration: 100, useNativeDriver: true }),
        Animated.spring(scala, { toValue: 1, friction: 4, tension: 170, useNativeDriver: true }),
      ]).start();
    }
    precedente.current = focused;
  }, [focused, scala]);
  return (
    <Animated.View style={{ transform: [{ scale: scala }] }}>
      <Ionicons name={focused ? nome : `${nome}-outline`} size={24} color={color} />
    </Animated.View>
  );
}

function ContenutoApp() {
  const { caricamento } = useAuth();
  const t = useT();
  const { c, scuro } = useTema();
  const temaNavigazione = {
    ...(scuro ? DarkTheme : DefaultTheme),
    colors: { ...(scuro ? DarkTheme : DefaultTheme).colors, background: c.sfondo, card: c.sfondoGruppo, border: c.separatore, text: c.testo, primary: c.primario },
  };

  useEffect(() => {
    segnaApertura();
  }, []);

  if (caricamento) {
    return <SchermataAvvio />;
  }

  // Si entra subito nell'app, senza schermata di accesso: l'account serve
  // solo per salvare preferiti, prenotare, usare la ricerca IA o il
  // mercatino, e viene richiesto in quel momento (tab Profilo o avviso).
  return (
    <NavigationContainer
      ref={riferimentoNavigazione}
      theme={temaNavigazione}
      linking={linking}
      onReady={segnaSchermataCorrente}
      onStateChange={segnaSchermataCorrente}
    >
      <StatusBar style={scuro ? "light" : "dark"} />
      <BannerOffline />
      <Tab.Navigator
        screenListeners={{ tabPress: () => vibraLeggera() }}
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: scuro ? c.primario : colori.blu,
          tabBarStyle: { backgroundColor: c.sfondoGruppo, borderTopColor: c.separatore },
          tabBarInactiveTintColor: "#8E97A3",
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
          tabBarIcon: ({ color, focused }) => (
            <IconaTab nome={ICONE_TAB[route.name]} focused={focused} color={color} />
          ),
          tabBarLabel: t(CHIAVE_TAB[route.name]),
        })}
      >
        <Tab.Screen name="Esplora" component={EsploraStackNavigator} />
        <Tab.Screen name="Mappa" component={MappaStackNavigator} />
        <Tab.Screen name="Preferiti" component={PreferitiStackNavigator} />
        <Tab.Screen name="Mercatino" component={MercatinoStackNavigator} />
        <Tab.Screen name="Profilo" component={ProfiloStackNavigator} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PreferenzeProvider>
        <AuthProvider>
          <ErrorBoundary>
            <ContenutoApp />
          </ErrorBoundary>
        </AuthProvider>
      </PreferenzeProvider>
    </SafeAreaProvider>
  );
}
