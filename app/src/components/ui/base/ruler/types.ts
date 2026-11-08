import type { SharedValue } from "react-native-reanimated";

interface IRuler {
  height: number;
  width: number;
  /** The only values the ruler can select, in the order they are shown. */
  values: readonly number[];
  /** The distance, in pixels, between two values. */
  step: number;
  /** The selected value. The ruler scrolls to it whenever it changes. */
  value?: number;
  readonly onScroll?: (offset: number) => void;
  readonly onValueChange?: (value: number) => void;
  readonly tickColor?: string;
  readonly activeTickColor?: string;
  readonly backgroundColor?: string;
  readonly notchHeight?: number;
  readonly notchWidth?: number;
  readonly enableHaptics?: boolean;
  readonly animateOnMount?: boolean;
  /** When false the ruler ignores swipes. */
  readonly enabled?: boolean;
}

interface ITick {
  index: number;
  tickX: number;
  xCenter: number;
  yCenter: number;
  translateX: SharedValue<number>;
  mountAnimation: SharedValue<number>;
  notchHeight: number;
  notchWidth: number;
  tickColor: string;
  activeTickColor: string;
  step: number;
}

export type { IRuler, ITick };
