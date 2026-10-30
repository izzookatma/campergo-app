import Svg, { Circle, ClipPath, Defs, G, Line, Path, Rect } from "react-native-svg";

// Stessa bussola del sito (vedi IconaBussolaLogo in src/App.jsx), portata
// in SVG vero per React Native: nessun quadrato di sfondo, solo il cerchio.
export default function IconaBussolaLogo({ size = 80 }) {
  return (
    <Svg width={size} height={size} viewBox="-80 -80 160 160">
      <Defs>
        <ClipPath id="ng-badge-quadrante">
          <Circle r={72} />
        </ClipPath>
      </Defs>
      <Circle r={72} fill="#F7FAFB" />
      <G clipPath="url(#ng-badge-quadrante)">
        <Path d="M-80,18 L-52,-10 L-30,11 L-8,-15 L18,14 L42,-8 L80,26 L80,75 L-80,75 Z" fill="#CFE0E8" />
        <Path d="M-80,36 L-56,16 L-33,34 L-4,12 L25,37 L51,18 L80,42 L80,75 L-80,75 Z" fill="#1C6E8C" />
        <G fill="#215E4F">
          <Path d="M-37,56 l6.5,-19 l6.5,19 z" />
          <Path d="M-37,46 l6.5,-17 l6.5,17 z" />
          <Path d="M31,58 l8,-23 l8,23 z" />
          <Path d="M31,47 l8,-20 l8,20 z" />
        </G>
        <Rect x={-80} y={60} width={160} height={17} fill="#194C3F" />
      </G>
      <G stroke="#5B6B75" strokeWidth={3} strokeLinecap="round" opacity={0.8}>
        <Line x1={0} y1={-68} x2={0} y2={-56} />
        <Line x1={0} y1={68} x2={0} y2={56} />
        <Line x1={-68} y1={0} x2={-56} y2={0} />
        <Line x1={68} y1={0} x2={56} y2={0} />
      </G>
      <Circle r={72} fill="none" stroke="#0E3A53" strokeWidth={5} />
      <Path d="M0,54 L10.5,0 L0,-6 L-10.5,0 Z" fill="#0E3A53" />
      <Path d="M0,-54 L10.5,0 L0,6 L-10.5,0 Z" fill="#E08A3E" />
      <Circle r={7} fill="#0E3A53" />
      <Circle r={2.7} fill="#F7FAFB" />
    </Svg>
  );
}
