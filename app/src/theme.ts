/**
 * Gestaltung: schlicht, hell, gut lesbar.
 * Große Schrift, kräftige Kontraste (Text mindestens WCAG AA), klare Flächen.
 */
export const colors = {
  background: "#F7F6F2",
  surface: "#FFFFFF",
  text: "#1B1B1B",
  textMuted: "#4A4A4A",
  border: "#D6D3CB",

  primary: "#1D5BA8",
  primaryText: "#FFFFFF",
  primaryPressed: "#164A8A",
  secondary: "#FFFFFF",
  secondaryText: "#1D5BA8",
  danger: "#B3261E",
  success: "#1E7A3C",
  disabled: "#B9C4D3",

  // Brett
  cell: "#ECEAE3",
  gridLine: "#FFFFFF",
  w3: "#D9622B",
  w3Text: "#FFFFFF",
  w2: "#F2B8A2",
  w2Text: "#5A1E08",
  l3: "#2E7FB8",
  l3Text: "#FFFFFF",
  l2: "#B9DAF0",
  l2Text: "#0E3A5C",

  // Steine
  tile: "#FFF1CC",
  tileBorder: "#C79A3E",
  tileText: "#1B1B1B",
  tileNew: "#D6E8FF",
  tileNewBorder: "#1D5BA8",
  tileSelected: "#1D5BA8",
  jokerText: "#1D5BA8",

  messageBg: "#FFF8E1",
  messageBorder: "#E0B84D",
  errorBg: "#FDECEA",
  okBg: "#E7F5EC",
};

export const font = {
  small: 17,
  body: 20,
  large: 24,
  title: 30,
  huge: 38,
};

export const space = {
  xs: 4,
  s: 8,
  m: 12,
  l: 18,
  xl: 28,
};

export const radius = 12;

/** Mindestgröße für alles, was angetippt wird (Android empfiehlt 48 dp – wir nehmen mehr). */
export const touchMin = 56;
