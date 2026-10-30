import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

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
import NuovaSegnalazioneScreen from "./src/screens/NuovaSegnalazioneScreen";
import NuovoItinerarioScreen from "./src/screens/NuovoItinerarioScreen";
import EliminaAccountScreen from "./src/screens/EliminaAccountScreen";
import MercatinoScreen from "./src/screens/MercatinoScreen";
import AnnuncioScreen from "./src/screens/AnnuncioScreen";
import NuovoAnnuncioScreen from "./src/screens/NuovoAnnuncioScreen";
import MessaggiScreen from "./src/screens/MessaggiScreen";
import ConversazioneScreen from "./src/screens/ConversazioneScreen";
import SchermataAvvio from "./src/screens/SchermataAvvio";
import AccediScreen from "./src/screens/AccediScreen";
import { colori } from "./src/theme/colors";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { PreferenzeProvider } from "./src/context/PreferenzeContext";

// Copertina con logo e frase mentre l'app controlla la sessione: resta
// visibile almeno un attimo anche se il controllo finisce subito, per non
// far lampeggiare lo schermo.
const DURATA_MINIMA_MS = 3200;

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
      <EsploraStack.Screen name="Sentieri" component={SentieriScreen} />
      <EsploraStack.Screen name="Percorsi4x4" component={Percorsi4x4Screen} />
      <EsploraStack.Screen name="ItinerarioDettaglio" component={ItinerarioDettaglioScreen} />
      <EsploraStack.Screen name="Cultura" component={CulturaScreen} />
      <EsploraStack.Screen name="SchedaCulturale" component={SchedaCulturaleScreen} />
      <EsploraStack.Screen name="NuovoItinerario" component={NuovoItinerarioScreen} />
    </EsploraStack.Navigator>
  );
}

function PreferitiStackNavigator() {
  return (
    <PreferitiStack.Navigator screenOptions={{ headerShown: false }}>
      <PreferitiStack.Screen name="PreferitiLista" component={PreferitiScreen} />
      <PreferitiStack.Screen name="Scheda" component={SchedaScreen} />
      <PreferitiStack.Screen name="SchedaCulturale" component={SchedaCulturaleScreen} />
    </PreferitiStack.Navigator>
  );
}

function MappaStackNavigator() {
  return (
    <MappaStack.Navigator screenOptions={{ headerShown: false }}>
      <MappaStack.Screen name="MappaVista" component={MappaScreen} />
      <MappaStack.Screen name="Scheda" component={SchedaScreen} />
      <MappaStack.Screen name="SchedaCulturale" component={SchedaCulturaleScreen} />
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
      <ProfiloStack.Screen name="MieSegnalazioni" component={MieSegnalazioniScreen} />
      <ProfiloStack.Screen name="NuovaSegnalazione" component={NuovaSegnalazioneScreen} />
      <ProfiloStack.Screen name="EliminaAccount" component={EliminaAccountScreen} />
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

function ContenutoApp() {
  const { session, caricamento } = useAuth();
  const [tempoMinimoPassato, setTempoMinimoPassato] = useState(false);
  const [saltatoAccesso, setSaltatoAccesso] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTempoMinimoPassato(true), DURATA_MINIMA_MS);
    return () => clearTimeout(timer);
  }, []);

  if (caricamento || !tempoMinimoPassato) {
    return <SchermataAvvio />;
  }

  // All'avvio, se non si è già loggati, si chiede di accedere o
  // registrarsi prima di entrare — con la possibilità di continuare senza
  // account (l'accesso verrà richiesto solo al momento di prenotare). Una
  // volta scelto (login riuscito o "continua senza account") non si
  // richiede più finché l'app resta aperta.
  if (!session && !saltatoAccesso) {
    return <AccediScreen onSaltaAccesso={() => setSaltatoAccesso(true)} />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colori.blu,
          tabBarInactiveTintColor: "#9ca3af",
          tabBarLabelStyle: { fontSize: 9, fontWeight: "700" },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? ICONE_TAB[route.name] : `${ICONE_TAB[route.name]}-outline`}
              size={19}
              color={color}
            />
          ),
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
    <PreferenzeProvider>
      <AuthProvider>
        <ContenutoApp />
      </AuthProvider>
    </PreferenzeProvider>
  );
}
