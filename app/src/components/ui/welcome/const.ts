import { Spacing } from "@/constants/theme";

/**
 * Brand metrics for the welcome screen.
 *
 * Colours are never hardcoded here: they come from the active theme (see
 * `useTheme`) so the screen follows the app in both light and dark mode.
 */

export const WELCOME_MAX_WIDTH = 560;

/** Corner radius of the brand mark and the feature icon chips. */
export const WELCOME_RADIUS = 12;

/** Brand mark. */
export const WELCOME_MARK_SIZE = 40;

/** Icon drawn inside the brand mark. */
export const WELCOME_MARK_ICON_SIZE = 22;

/** Icon drawn inside a feature chip. */
export const WELCOME_FEATURE_ICON_SIZE = 20;

/** Square chip that holds a feature icon. */
export const WELCOME_FEATURE_CHIP_SIZE = 40;

/** Wordmark next to the brand mark. */
export const WELCOME_WORDMARK_SIZE = 20;
export const WELCOME_WORDMARK_LINE_HEIGHT = 26;

/** Small line above the headline. */
export const WELCOME_EYEBROW_SIZE = 12;
export const WELCOME_EYEBROW_LINE_HEIGHT = 16;
export const WELCOME_EYEBROW_LETTER_SPACING = 0.8;

/** Large headline. */
export const WELCOME_HEADLINE_SIZE = 40;
export const WELCOME_HEADLINE_LINE_HEIGHT = 46;

/** Trust point card. */
export const WELCOME_FEATURE_RADIUS = Spacing.three;
export const WELCOME_FEATURE_PADDING = Spacing.three;
export const WELCOME_FEATURE_GAP = Spacing.two;

/** Fine print under the call to action. */
export const WELCOME_LEGAL_SIZE = 13;
export const WELCOME_LEGAL_LINE_HEIGHT = 19;

/** Gap between the call to action buttons. */
export const WELCOME_ACTION_GAP = Spacing.two;

/** Gap between the trust point cards. */
export const WELCOME_FEATURE_LIST_GAP = Spacing.two;

/** Space between the headline and the trust points. */
export const WELCOME_HEADLINE_GAP = Spacing.four;

/** Horizontal padding of the screen. */
export const WELCOME_HORIZONTAL_PADDING = Spacing.four;
