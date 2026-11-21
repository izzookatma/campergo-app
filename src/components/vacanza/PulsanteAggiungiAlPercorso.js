import { Ionicons } from "@expo/vector-icons";
import Pulsante from "../ui/Pulsante";
import { useT } from "../../i18n/i18n";
import { aggiungiLuogoAlPercorso } from "../../lib/bozzaVacanza";

// Compare nelle schede solo quando si arriva da "Crea la tua vacanza"
// (route.params.aggiungiAlPercorso = { giorno, ruolo }). Tocca → il posto
// entra nel percorso e si torna alla vacanza.
export default function PulsanteAggiungiAlPercorso({ richiesta, luogo, navigation }) {
  const t = useT();
  if (!richiesta) return null;
  const titoli = {
    visita: t("vacanza.aggiungiAlGiorno", { n: richiesta.giorno }),
    dormire: t("vacanza.dormoQui", { n: richiesta.giorno }),
    partenza: t("vacanza.usaPartenza"),
    arrivo: t("vacanza.usaArrivo"),
  };
  return (
    <Pulsante
      titolo={titoli[richiesta.ruolo] || titoli.visita}
      icona={<Ionicons name="add-circle" size={20} color="#fff" />}
      disabilitato={!luogo}
      onPress={() => {
        aggiungiLuogoAlPercorso(richiesta, luogo);
        navigation.popTo("CreaVacanza");
      }}
    />
  );
}
