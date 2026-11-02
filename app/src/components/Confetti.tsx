import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from "react-native";

const COLORS = ["#D9622B", "#F2B8A2", "#2E7FB8", "#B9DAF0", "#E0B84D", "#1E7A3C", "#C2185B", "#7B1FA2"];

interface Props {
  /** Wie viele Durchgänge (je ca. 3,5 Sekunden). */
  rounds?: number;
  count?: number;
}

/** Bunte Konfetti-Schnipsel, die über den Bildschirm rieseln – zum Feiern. */
export function Confetti({ rounds = 2, count = 60 }: Props) {
  const { width, height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;

  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        key: i,
        x: Math.random() * width,
        drift: (Math.random() - 0.5) * 120,
        delay: Math.random() * 0.45,
        size: 8 + Math.random() * 8,
        color: COLORS[i % COLORS.length]!,
        spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540),
        round: Math.random() > 0.6,
      })),
    [count, width],
  );

  useEffect(() => {
    progress.setValue(0);
    const anim = Animated.loop(
      Animated.timing(progress, { toValue: 1, duration: 3500, easing: Easing.linear, useNativeDriver: true }),
      { iterations: rounds },
    );
    anim.start();
    return () => anim.stop();
  }, [progress, rounds]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pieces.map((p) => {
        const t = progress.interpolate({
          inputRange: [0, p.delay, 1],
          outputRange: [0, 0, 1],
        });
        return (
          <Animated.View
            key={p.key}
            style={{
              position: "absolute",
              left: p.x,
              top: -20,
              width: p.size,
              height: p.round ? p.size : p.size * 0.5,
              borderRadius: p.round ? p.size / 2 : 2,
              backgroundColor: p.color,
              transform: [
                { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, height + 40] }) },
                { translateX: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, p.drift, p.drift * 0.4] }) },
                { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${p.spin}deg`] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
