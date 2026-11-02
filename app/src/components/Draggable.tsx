import { useMemo, useRef, type ReactNode } from "react";
import { PanResponder, View } from "react-native";

export interface DragCallbacks {
  /** Ziehen beginnt (Bildschirmkoordinaten). */
  onStart: (x: number, y: number) => void;
  onMove: (x: number, y: number) => void;
  /** Ziehen endet. `completed` ist false, wenn das System die Geste abgebrochen hat. */
  onEnd: (x: number, y: number, completed: boolean) => void;
}

interface Props extends DragCallbacks {
  children: ReactNode;
  /** Kurzes Antippen (ohne Bewegung). */
  onTap?: () => void;
  /** Ziehen abgeschaltet – Antippen funktioniert weiter. */
  dragDisabled?: boolean;
  accessibilityLabel?: string;
  selected?: boolean;
}

/** Ab dieser Bewegung (in Pixeln) gilt eine Berührung als Ziehen statt als Antippen. */
const DRAG_THRESHOLD = 8;

/**
 * Ein Stein, den man antippen oder ziehen kann.
 * Die Berührung wird sofort übernommen (sonst würde die umgebende
 * Bildlaufleiste senkrechte Bewegungen abfangen). Bewegt sich der Finger
 * kaum, zählt es beim Loslassen als Antippen, sonst als Ziehen.
 */
export function Draggable({ children, onTap, dragDisabled, onStart, onMove, onEnd, accessibilityLabel, selected }: Props) {
  const cb = useRef({ onStart, onMove, onEnd, onTap, dragDisabled });
  cb.current = { onStart, onMove, onEnd, onTap, dragDisabled };
  const dragging = useRef(false);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          dragging.current = false;
        },
        onPanResponderMove: (_, g) => {
          if (cb.current.dragDisabled) return;
          if (!dragging.current) {
            if (Math.abs(g.dx) < DRAG_THRESHOLD && Math.abs(g.dy) < DRAG_THRESHOLD) return;
            dragging.current = true;
            cb.current.onStart(g.moveX, g.moveY);
          }
          cb.current.onMove(g.moveX, g.moveY);
        },
        onPanResponderRelease: (_, g) => {
          if (dragging.current) cb.current.onEnd(g.moveX, g.moveY, true);
          else cb.current.onTap?.();
          dragging.current = false;
        },
        onPanResponderTerminate: (_, g) => {
          if (dragging.current) cb.current.onEnd(g.moveX, g.moveY, false);
          dragging.current = false;
        },
        onPanResponderTerminationRequest: () => !dragging.current,
      }),
    [],
  );

  return (
    <View
      {...responder.panHandlers}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={selected !== undefined ? { selected } : undefined}
      onAccessibilityTap={onTap}
      style={{ userSelect: "none", cursor: dragDisabled ? "pointer" : "grab" } as object}
    >
      {children}
    </View>
  );
}
