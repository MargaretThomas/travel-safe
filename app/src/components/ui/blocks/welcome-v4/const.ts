import { Colors } from "@/constants/theme";
import type { IWelcomeAction, IWelcomeLegalLink, IWelcomeToken } from "./types";

export const DEFAULT_WORDMARK = "Travel Safe";

export const DEFAULT_HEADLINE: IWelcomeToken[] = [
  { kind: "word", text: "Safety" },
  /*
  {
    kind: "avatar",
    background: "#dcd8f7",
    source:
      "https://i.pinimg.com/736x/99/f3/5a/99f35a4179e659ce63250408e68c8cf6.jpg",
  },
  */
  { kind: "word", text: "check-ins" },
  { kind: "word", text: "for", muted: true },
  { kind: "word", text: "people", muted: true },
  { kind: "word", text: "who" },
  { kind: "word", text: "travel" },
  { kind: "word", text: "alone" },
];

export const DEFAULT_ACTIONS: IWelcomeAction[] = [
  {
    key: "apple",
    label: "Get Started",
    icon: "apple",
    variant: "primary",
  },
];

export const DEFAULT_LEGAL_PREFIX =
  "By continuing you confirm that you agree to our";
export const DEFAULT_LEGAL_LINKS: IWelcomeLegalLink[] = [
  { key: "terms", label: "Terms of Service" },
  { key: "privacy", label: "Privacy Policy" },
];
export const DEFAULT_LEGAL_SUFFIX =
  "and good behavior in chat with users (write to your loved ones more often 🤍).";

export const FONTS = {
  bold: "Inter_700Bold",
  semiBold: "Inter_600SemiBold",
  medium: "Inter_500Medium",
  regular: "Inter_400Regular",
} as const;

export const HEADLINE_SIZE = 55;
export const HEADLINE_LINE_HEIGHT = 54;
export const AVATAR_SIZE = 50;
export const ICON_SIZE = 17;
export const CONTENT_HORIZONTAL_PADDING = 23;
export const ACTION_HEIGHT = 54;
export const ACTION_RADIUS = 14;
export const ACTION_GAP = 15;
export const WORDMARK_SIZE = 28;

export const COLORS = {
  screen: "#ffffff",
  wordmark: Colors.light.brand,
  headline: "#111111",
  headlineMuted: "#a8a8a8",
  primary: "#2b2b2b",
  primaryPressed: "#454545",
  primaryLabel: "#ffffff",
  secondary: "#f0f0f0",
  secondaryPressed: "#e4e4e4",
  secondaryLabel: "#111111",
  legal: "#9a9a9a",
  legalLink: "#818181",
} as const;
