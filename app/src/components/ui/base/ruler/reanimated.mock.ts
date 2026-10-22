/**
 * A small stand-in for Reanimated, used by the ruler tests.
 *
 * The real library needs the native worklets runtime, which is not available
 * in Jest. This mock keeps the parts the ruler relies on: shared values that
 * notify when they change, derived values that are read lazily, animations
 * that jump straight to their target, and reactions that run whenever one of
 * the shared values changes.
 */
/*
 * A stand-in for Reanimated's hooks, so it deliberately reads refs while it
 * renders: that is how a shared value hands its current value back.
 */
/* eslint-disable react-hooks/refs */
import React from "react";

type Listener = () => void;

export type SharedValue<T> = {
  value: T;
  addListener: (listener: Listener) => () => void;
};

type Animation = {
  __animation: "decay";
  velocity: number;
  clamp: [number, number];
  onFinish?: (finished: boolean) => void;
};

/** How far a fling travels in the mock. */
const DECAY_FACTOR = 10;

const sharedValues: SharedValue<unknown>[] = [];
const pending: (() => void)[] = [];

function isAnimation(value: unknown): value is Animation {
  return typeof value === "object" && value !== null && "__animation" in value;
}

function createShared<T>(initial: T): SharedValue<T> {
  const listeners = new Set<Listener>();
  let current = initial;

  const shared: SharedValue<T> = {
    get value() {
      return current;
    },
    set value(next: T) {
      if (isAnimation(next)) {
        runAnimation(shared, next);
        return;
      }
      if (Object.is(current, next)) return;
      current = next;
      listeners.forEach((listener) => listener());
    },
    addListener(listener: Listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return shared;
}

function runAnimation<T>(shared: SharedValue<T>, animation: Animation): void {
  const [min, max] = animation.clamp;
  const current = Number(shared.value);
  const moved = Math.min(max, Math.max(min, current + animation.velocity * DECAY_FACTOR));
  shared.value = moved as unknown as T;
  pending.push(() => animation.onFinish?.(true));
}

/** Runs the callbacks of the animations that are still waiting. */
export function flushAnimations(): void {
  while (pending.length > 0) {
    const next = pending.shift();
    next?.();
  }
}

export function useSharedValue<T>(initial: T): SharedValue<T> {
  const ref = React.useRef<SharedValue<T> | null>(null);
  if (!ref.current) {
    ref.current = createShared(initial);
    sharedValues.push(ref.current);
  }
  return ref.current;
}

export function useDerivedValue<T>(factory: () => T): { value: T } {
  const factoryRef = React.useRef(factory);
  factoryRef.current = factory;
  const ref = React.useRef<{ value: T } | null>(null);
  if (!ref.current) {
    ref.current = Object.defineProperty({} as { value: T }, "value", {
      get: () => factoryRef.current(),
    });
  }
  return ref.current;
}

export function useAnimatedReaction<T>(
  prepare: () => T,
  react: (current: T, previous: T | null) => void,
): void {
  const prepareRef = React.useRef(prepare);
  prepareRef.current = prepare;
  const reactRef = React.useRef(react);
  reactRef.current = react;
  const previous = React.useRef<T | null>(null);
  const checkRef = React.useRef<() => void>(() => undefined);

  React.useEffect(() => {
    const check = () => {
      const current = prepareRef.current();
      if (previous.current !== null && Object.is(previous.current, current)) return;
      const last = previous.current;
      previous.current = current;
      reactRef.current(current, last);
    };
    checkRef.current = check;

    const unsubscribe = sharedValues.map((shared) => shared.addListener(check));
    check();
    return () => unsubscribe.forEach((stop) => stop());
  }, []);

  // A re-render can change the value the prepare function closes over.
  React.useEffect(() => {
    checkRef.current();
  });
}

export function withSpring(
  to: number,
  _config?: unknown,
  onFinish?: (finished: boolean) => void,
): number {
  if (onFinish) pending.push(() => onFinish(true));
  return to;
}

export function withTiming(
  to: number,
  _config?: unknown,
  onFinish?: (finished: boolean) => void,
): number {
  if (onFinish) pending.push(() => onFinish(true));
  return to;
}

export function withDecay(
  config: { velocity?: number; clamp?: [number, number] },
  onFinish?: (finished: boolean) => void,
): Animation {
  return {
    __animation: "decay",
    velocity: config.velocity ?? 0,
    clamp: config.clamp ?? [-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    onFinish,
  };
}

export function withClamp(
  config: { min: number; max: number },
  animation: Animation,
): Animation {
  return {
    ...animation,
    clamp: [
      Math.max(config.min, animation.clamp[0]),
      Math.min(config.max, animation.clamp[1]),
    ],
  };
}

export function interpolate(
  value: number,
  input: number[],
  output: number[],
): number {
  if (value <= input[0]) return output[0];
  if (value >= input[input.length - 1]) return output[output.length - 1];
  for (let index = 1; index < input.length; index += 1) {
    if (value <= input[index]) {
      const span = input[index] - input[index - 1];
      const ratio = span === 0 ? 0 : (value - input[index - 1]) / span;
      return output[index - 1] + (output[index] - output[index - 1]) * ratio;
    }
  }
  return output[output.length - 1];
}

export function interpolateColor(
  value: number,
  input: number[],
  output: string[],
): string {
  let closest = 0;
  let distance = Number.MAX_SAFE_INTEGER;
  input.forEach((edge, index) => {
    const gap = Math.abs(value - edge);
    if (gap < distance) {
      distance = gap;
      closest = index;
    }
  });
  return output[closest];
}

export const Extrapolation = {
  CLAMP: "clamp",
  EXTEND: "extend",
  IDENTITY: "identity",
};

export default {
  useSharedValue,
  useDerivedValue,
  useAnimatedReaction,
  withSpring,
  withTiming,
  withDecay,
  withClamp,
  interpolate,
  interpolateColor,
  Extrapolation,
};
