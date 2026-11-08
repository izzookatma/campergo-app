import Svg, { Line, Circle } from "react-native-svg";

// Il patibolo classico del gioco dell'impiccato, disegnato in SVG: il
// patibolo si vede sempre, l'omino compare un pezzo alla volta (testa,
// busto, due braccia, due gambe) via via che `fase` sale da 0 a 6 — un
// pezzo per ogni errore, qualunque sia il numero di tentativi del livello.
export default function DisegnoImpiccato({ fase = 0, size = 120, colorePatibolo = "#8a8f98", coloreOmino }) {
  const corpo = coloreOmino || colorePatibolo;
  return (
    <Svg width={size} height={size * 1.15} viewBox="0 0 120 138">
      <Line x1="8" y1="130" x2="70" y2="130" stroke={colorePatibolo} strokeWidth="5" strokeLinecap="round" />
      <Line x1="25" y1="130" x2="25" y2="10" stroke={colorePatibolo} strokeWidth="5" strokeLinecap="round" />
      <Line x1="25" y1="10" x2="80" y2="10" stroke={colorePatibolo} strokeWidth="5" strokeLinecap="round" />
      <Line x1="80" y1="10" x2="80" y2="24" stroke={colorePatibolo} strokeWidth="5" strokeLinecap="round" />

      {fase >= 1 && <Circle cx="80" cy="37" r="13" stroke={corpo} strokeWidth="4.5" fill="none" />}
      {fase >= 2 && <Line x1="80" y1="50" x2="80" y2="88" stroke={corpo} strokeWidth="4.5" strokeLinecap="round" />}
      {fase >= 3 && <Line x1="80" y1="60" x2="64" y2="75" stroke={corpo} strokeWidth="4.5" strokeLinecap="round" />}
      {fase >= 4 && <Line x1="80" y1="60" x2="96" y2="75" stroke={corpo} strokeWidth="4.5" strokeLinecap="round" />}
      {fase >= 5 && <Line x1="80" y1="88" x2="66" y2="112" stroke={corpo} strokeWidth="4.5" strokeLinecap="round" />}
      {fase >= 6 && <Line x1="80" y1="88" x2="94" y2="112" stroke={corpo} strokeWidth="4.5" strokeLinecap="round" />}
    </Svg>
  );
}
