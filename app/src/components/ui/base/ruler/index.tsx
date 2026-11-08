/*
 * A Reanimated shared value is a mutable box that lives on the UI thread. The
 * React Compiler rules treat everything it sees as an immutable render value,
 * which a shared value deliberately is not, so the immutability rule is turned
 * off for this file only.
 */
/* eslint-disable react-hooks/immutability */
import React, { memo, useCallback, useEffect, useMemo } from "react";
import { Canvas, Group, Line } from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withClamp,
  withDecay,
  withSpring,
  interpolate,
  interpolateColor,
  Extrapolation,
  withTiming,
} from "react-native-reanimated";
import { Platform } from "react-native";
import {
  AndroidHaptics,
  impactAsync,
  ImpactFeedbackStyle,
  performAndroidHapticsAsync,
} from "expo-haptics";
import {
  SPRING_CONFIG,
  SPRING_CONFIG_RESPONSIVE,
} from "./conf";
import type { IRuler, ITick } from "./types";
import { scheduleOnRN } from "react-native-worklets";
import {
  maxTickOffset,
  nearestValueIndex,
  snapOffsetToTick,
  tickIndexAtOffset,
  tickOffset,
} from "@/lib/ruler";

/** How far the ruler may be pulled past its first or last value. */
const RESISTANCE = 0.3;

const Tick = ({
  tickX,
  xCenter,
  yCenter,
  translateX,
  mountAnimation,
  notchHeight,
  notchWidth,
  tickColor,
  activeTickColor,
  step,
}: ITick) => {
  const distance = useDerivedValue(() => {
    return Math.abs(tickX + translateX.value - xCenter) / step;
  });

  const tickOpacity = useDerivedValue(() => {
    return (
      interpolate(
        distance.value,
        [0, 1, 3],
        [1, 0.6, 0.3],
        Extrapolation.CLAMP,
      ) * mountAnimation.value
    );
  });

  const clipFraction = useDerivedValue(() => {
    return interpolate(
      distance.value,
      [0, 1, 2],
      [0, 0.3, 0.6],
      Extrapolation.CLAMP,
    );
  });

  const baseline = yCenter + notchHeight / 2;

  const tickTop = useDerivedValue<number>(() => {
    return baseline - notchHeight * (1 - clipFraction.value);
  });

  const tickColorAnimated = useDerivedValue<string>(() => {
    return interpolateColor(
      distance.value,
      [0, 0.5, 1],
      [activeTickColor, activeTickColor, tickColor],
    );
  });

  return (
    <Line
      p1={useDerivedValue(() => ({ x: tickX, y: tickTop.value }))}
      p2={{ x: tickX, y: baseline }}
      color={tickColorAnimated}
      strokeWidth={notchWidth}
      strokeCap="round"
      opacity={tickOpacity}
    />
  );
};

/**
 * A ruler that snaps to a fixed list of values.
 *
 * The ruler only ever selects one of `values`: a swipe is measured in ticks,
 * the ruler rests on a whole tick, and the value under the centre marker is
 * the one reported back. It can never come to rest between two values, so it
 * can never select an interval that does not exist.
 */
const RulerView = ({
  height,
  width,
  values,
  step,
  value,
  onScroll,
  onValueChange,
  tickColor = "rgba(255, 255, 255, 0.6)",
  activeTickColor = "#00D4FF",
  backgroundColor = "transparent",
  notchHeight = 40,
  notchWidth = 3,
  enableHaptics = false,
  animateOnMount = true,
  enabled = true,
}: IRuler) => {
  const xCenter = width / 2;
  const yCenter = height / 2;
  const tickCount = values.length;
  const selectedIndex = useMemo(
    () => nearestValueIndex(values, value ?? values[0]),
    [values, value],
  );

  const translateX = useSharedValue<number>(tickOffset(selectedIndex, step));
  /** True while the ruler is animating towards a value picked elsewhere. */
  const moving = useSharedValue<boolean>(false);
  /** True while a swipe is in flight. */
  const active = useSharedValue<boolean>(false);
  /** The offset the ruler is animating towards. */
  const headingTo = useSharedValue<number>(tickOffset(selectedIndex, step));
  const mountAnimation = useSharedValue<number>(animateOnMount ? 0 : 1);
  const lastReported = useSharedValue<number>(values[selectedIndex] ?? 0);

  const triggerHaptic = useCallback<() => void>(() => {
    if (enableHaptics) {
      if (Platform.OS === "ios") {
        impactAsync(ImpactFeedbackStyle.Light);
      } else {
        performAndroidHapticsAsync(AndroidHaptics.Segment_Tick);
      }
    }
  }, [enableHaptics]);

  const currentValue = useDerivedValue<number>(() => {
    const index = tickIndexAtOffset(translateX.value, step, tickCount);
    return values[index] ?? values[0] ?? 0;
  });

  useAnimatedReaction(
    () => currentValue.value,
    (current, previous) => {
      if (previous === null || current === previous) return;
      if (enableHaptics && active.value) {
        scheduleOnRN(triggerHaptic);
      }
      // A ruler on its way to a value picked elsewhere is not the user
      // choosing, so the values it passes on the way are not reported.
      if (onValueChange && !moving.value && current !== lastReported.value) {
        lastReported.value = current;
        scheduleOnRN(onValueChange, current);
      }
    },
    [onValueChange, enableHaptics, triggerHaptic],
  );

  useAnimatedReaction<number>(
    () => translateX.value,
    (current) => {
      if (onScroll) {
        scheduleOnRN(onScroll, current);
      }
    },
    [onScroll],
  );

  // A value picked elsewhere (a preset tapped, a sync) moves the ruler to it.
  // A swipe in flight owns the position, and a ruler already on its way there
  // is left alone.
  useAnimatedReaction(
    () => selectedIndex,
    (index, previous) => {
      if (previous === null || index === previous) return;
      if (active.value) return;
      const target = tickOffset(index, step);
      if (Math.abs(headingTo.value - target) < 0.5) return;
      moving.value = true;
      headingTo.value = target;
      translateX.value = withSpring<number>(target, SPRING_CONFIG, (finished) => {
        if (finished) moving.value = false;
      });
    },
    [selectedIndex, step],
  );

  useEffect(() => {
    mountAnimation.value = withTiming<number>(1, { duration: 600 });
  }, [mountAnimation]);

  const pan = Gesture.Pan()
    .enabled(enabled)
    .onStart(() => {
      if (!enabled) return;
      // A swipe always wins over a move the ruler made on its own.
      moving.value = false;
      active.value = true;
    })
    .onChange((e) => {
      if (!enabled) return;
      active.value = true;
      const next = translateX.value + e.changeX;
      const last = maxTickOffset(tickCount, step);

      if (next > 0) {
        translateX.value = next * RESISTANCE;
      } else if (next < last) {
        translateX.value = last + (next - last) * RESISTANCE;
      } else {
        translateX.value = next;
      }
    })
    .onFinalize((e) => {
      if (!enabled) return;
      const last = maxTickOffset(tickCount, step);

      if (translateX.value > 0) {
        headingTo.value = 0;
        translateX.value = withSpring<number>(0, SPRING_CONFIG);
        active.value = false;
      } else if (translateX.value < last) {
        headingTo.value = last;
        translateX.value = withSpring<number>(last, SPRING_CONFIG);
        active.value = false;
      } else {
        translateX.value = withClamp<number>(
          {
            min: last,
            max: 0,
          },
          withDecay(
            {
              velocity: e.velocityX,
              clamp: [last, 0],
              deceleration: 0.997,
            },
            (finish) => {
              if (finish) {
                const snapped = snapOffsetToTick(translateX.value, step, tickCount);
                headingTo.value = snapped;
                translateX.value = withSpring<number>(snapped, SPRING_CONFIG_RESPONSIVE);
                active.value = false;
              }
            },
          ),
        );
      }
    });

  const transform = useDerivedValue(() => {
    return [{ translateX: translateX.value }];
  });

  const ticksData = useMemo(() => {
    return values.map((_value, index) => ({
      index,
      tickX: index * step + xCenter,
    }));
  }, [values, step, xCenter]);

  const baseline = yCenter + notchHeight / 2;

  return (
    <GestureDetector gesture={pan}>
      <Canvas style={{ width, height, backgroundColor }}>
        <Group transform={transform}>
          {ticksData.map((tick) => (
            <Tick
              key={tick.index}
              index={tick.index}
              tickX={tick.tickX}
              xCenter={xCenter}
              yCenter={yCenter}
              translateX={translateX}
              mountAnimation={mountAnimation}
              notchHeight={notchHeight}
              notchWidth={notchWidth}
              tickColor={tickColor}
              activeTickColor={activeTickColor}
              step={step}
            />
          ))}
        </Group>
        <Line
          p1={{ x: xCenter, y: baseline - notchHeight - 8 }}
          p2={{ x: xCenter, y: baseline + 6 }}
          color={activeTickColor}
          strokeWidth={2}
          strokeCap="round"
        />
      </Canvas>
    </GestureDetector>
  );
};

export const Ruler = memo(RulerView);

export default Ruler;
