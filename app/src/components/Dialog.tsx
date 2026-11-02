import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, font, radius, space } from "../theme";
import { BigButton } from "./BigButton";

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel: () => void;
  danger?: boolean;
}

/** Eigener Bestätigungsdialog (sieht auf allen Geräten gleich aus, große Schrift). */
export function Dialog({ visible, title, message, children, confirmLabel, cancelLabel = "Abbrechen", onConfirm, onCancel, danger }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Dialog schließen">
        <Pressable style={styles.box} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {children}
          <View style={styles.buttons}>
            <BigButton label={cancelLabel} variant="secondary" onPress={onCancel} style={styles.button} />
            {onConfirm && confirmLabel ? (
              <BigButton label={confirmLabel} variant={danger ? "danger" : "primary"} onPress={onConfirm} style={styles.button} />
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: space.l },
  box: { backgroundColor: colors.surface, borderRadius: radius, padding: space.xl, width: "100%", maxWidth: 560, gap: space.m },
  title: { fontSize: font.title, fontWeight: "800", color: colors.text },
  message: { fontSize: font.body, color: colors.text, lineHeight: font.body * 1.4 },
  buttons: { flexDirection: "row", flexWrap: "wrap", gap: space.m, marginTop: space.m },
  button: { flexGrow: 1, flexBasis: 180 },
});
