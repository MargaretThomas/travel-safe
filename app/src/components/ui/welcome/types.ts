import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/**
 * Tone of a word inside the welcome headline. `brand` paints the word in the
 * brand colour so the lead phrase carries the identity, `default` keeps it in
 * the regular text colour.
 */
export type TWelcomeTokenTone = 'brand' | 'default';

/**
 * A single run of text in the welcome headline.
 */
export interface IWelcomeToken {
  kind: 'word';
  text: string;
  tone?: TWelcomeTokenTone;
}

/**
 * Brand icons the welcome screen knows how to draw.
 */
export type TWelcomeIcon = 'brand' | 'schedule' | 'check' | 'lock';

/**
 * A trust point: an icon, a short title and a sentence of body copy.
 */
export interface IWelcomeFeature {
  key: string;
  icon: TWelcomeIcon;
  title: string;
  body: string;
}

/**
 * Visual weight of a welcome action.
 */
export type TWelcomeActionVariant = 'primary' | 'secondary';

/**
 * A call to action. `testID` is exposed so end-to-end flows can tap it.
 */
export interface IWelcomeAction {
  key: string;
  label: string;
  variant?: TWelcomeActionVariant;
  testID?: string;
}

export interface IWelcomeScreenProps {
  /** Brand name shown next to the mark. */
  wordmark?: string;
  /** Replaces the wordmark with custom artwork, for example a logo image. */
  logo?: ReactNode;
  /** Small line above the headline that frames the product. */
  eyebrow?: string;
  /** Large headline, split into coloured runs. */
  headline?: IWelcomeToken[];
  /** Trust points shown under the headline. */
  features?: IWelcomeFeature[];
  /** Call to action buttons. */
  actions?: IWelcomeAction[];
  /** Fine print below the call to action. */
  legal?: string;
  /** Stable identifier for the screen, used by end-to-end flows. */
  testID?: string;
  style?: StyleProp<ViewStyle>;
  onActionPress?: (action: IWelcomeAction) => void;
}
