import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { colors, font, radius, space, touchMin } from "../theme";

interface Props {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Kleinere Schrift für Schaltflächen in engen Leisten. */
  compact?: boolean;
  testID?: string;
}

/** Große, klar beschriftete Schaltfläche – keine Symbole ohne Text. */
export function BigButton({ label, onPress, variant = "primary", disabled, style, compact, testID }: Props) {
  const primary = variant === "primary";
  const danger = variant === "danger";
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        primary && styles.primary,
        danger && styles.danger,
        !primary && !danger && styles.secondary,
        pressed && !disabled && (primary ? styles.primaryPressed : styles.pressed),
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          compact && styles.compact,
          primary || danger ? styles.labelLight : styles.labelDark,
          disabled && styles.labelDisabled,
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchMin,
    paddingHorizontal: space.l,
    paddingVertical: space.s,
    borderRadius: radius,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  primaryPressed: { backgroundColor: colors.primaryPressed, borderColor: colors.primaryPressed },
  danger: { backgroundColor: colors.danger, borderColor: colors.danger },
  secondary: { backgroundColor: colors.secondary, borderColor: colors.primary },
  pressed: { backgroundColor: "#E8EFF8" },
  disabled: { backgroundColor: "#EEF1F5", borderColor: colors.disabled },
  label: { fontSize: font.large, fontWeight: "700", textAlign: "center" },
  compact: { fontSize: font.body },
  labelLight: { color: colors.primaryText },
  labelDark: { color: colors.secondaryText },
  labelDisabled: { color: "#7C8796" },
});
