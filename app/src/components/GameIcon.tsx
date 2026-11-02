import { StyleSheet, View } from "react-native";
import type { GameType } from "../games/registry";
import { colors } from "../theme";
import { RommeTile } from "./RommeTile";
import { Tile } from "./Tile";

interface Props {
  type: GameType;
  size?: number;
}

/**
 * Spielbild, gezeichnet aus den echten Spielsteinen der App –
 * so sieht man sofort, welches Spiel gemeint ist.
 */
export function GameIcon({ type, size = 72 }: Props) {
  const r = size * 0.18;
  if (type === "woerterei") {
    const t = Math.round(size * 0.3);
    const cell = size / 5;
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.box, { width: size, height: size, borderRadius: r, backgroundColor: colors.cell }]}
      >
        {/* Ein paar Bonusfelder im Hintergrund */}
        <View style={[styles.cell, { left: 0, top: 0, width: cell, height: cell, backgroundColor: colors.w3 }]} />
        <View style={[styles.cell, { right: 0, bottom: 0, width: cell, height: cell, backgroundColor: colors.w3 }]} />
        <View style={[styles.cell, { right: cell * 0.6, top: cell * 0.6, width: cell, height: cell, backgroundColor: colors.l2 }]} />
        <View style={[styles.cell, { left: cell * 0.6, bottom: cell * 0.6, width: cell, height: cell, backgroundColor: colors.w2 }]} />
        {/* Wort quer über das Brett */}
        <View style={[styles.abs, { left: size * 0.05, top: size * 0.36, transform: [{ rotate: "-8deg" }] }]}>
          <Tile letter="W" size={t} />
        </View>
        <View style={[styles.abs, { left: size * 0.35, top: size * 0.33 }]}>
          <Tile letter="Ö" size={t} />
        </View>
        <View style={[styles.abs, { left: size * 0.65, top: size * 0.36, transform: [{ rotate: "8deg" }] }]}>
          <Tile letter="R" size={t} />
        </View>
      </View>
    );
  }

  // Zahlen-Rommé: drei Siebener in verschiedenen Farben, aufgefächert auf grünem Tisch
  const t = Math.round(size * 0.29);
  const seven = (color: number) => color * 13 + 6;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.box, { width: size, height: size, borderRadius: r, backgroundColor: "#CFE3CF" }]}
    >
      <View style={[styles.abs, { left: size * 0.05, top: size * 0.27, transform: [{ rotate: "-12deg" }] }]}>
        <RommeTile id={seven(0)} size={t} />
      </View>
      <View style={[styles.abs, { left: size * 0.355, top: size * 0.2 }]}>
        <RommeTile id={seven(1)} size={t} />
      </View>
      <View style={[styles.abs, { left: size * 0.66, top: size * 0.27, transform: [{ rotate: "12deg" }] }]}>
        <RommeTile id={seven(2)} size={t} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: "hidden", borderWidth: 2, borderColor: "rgba(0,0,0,0.08)" },
  cell: { position: "absolute", borderRadius: 3, opacity: 0.85 },
  abs: { position: "absolute", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
});
