import { Component } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { segnaErrore } from "../lib/telemetria";
import StatoErrore from "./ui/StatoErrore";
import { useTema } from "../theme/tema";
import { useT } from "../i18n/i18n";

function Riserva({ onRiprova }) {
  const { c } = useTema();
  const t = useT();
  return (
    <View style={{ flex: 1, backgroundColor: c.sfondo }}>
      <SafeAreaView style={{ flex: 1, justifyContent: "center" }}>
        <StatoErrore messaggio={t("comune.erroreInatteso")} onRiprova={onRiprova} />
      </SafeAreaView>
    </View>
  );
}

// Rete di sicurezza: un errore durante il disegno di una schermata non deve
// lasciare lo schermo bianco. Segnala l'errore (statistiche anonime) e offre
// «Riprova», che ridisegna l'app.
export default class ErrorBoundary extends Component {
  state = { errore: null };

  static getDerivedStateFromError(errore) {
    return { errore };
  }

  componentDidCatch(errore, info) {
    console.error("[NaturaGo app] errore di rendering", errore, info?.componentStack);
    const riga = String(info?.componentStack || "").trim().split("\n")[0];
    segnaErrore(new Error(`${errore?.message || errore} ${riga}`.slice(0, 280)), true);
  }

  render() {
    if (this.state.errore) {
      return <Riserva onRiprova={() => this.setState({ errore: null })} />;
    }
    return this.props.children;
  }
}
