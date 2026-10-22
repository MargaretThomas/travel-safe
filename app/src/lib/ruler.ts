/**
 * Geometry for the interval ruler.
 *
 * The ruler is not a free range: it only ever selects from a fixed list of
 * values (the check-in intervals), so every helper here works in "tick" space.
 * A tick is one selectable value, the ruler rests on a whole tick, and the
 * helpers translate between ticks, pixel offsets and values.
 *
 * The helpers are marked as worklets so the ruler can call them on the UI
 * thread while the unit tests call the very same code on the JS thread.
 */

/** The smallest distance, in pixels, that two ticks may sit apart. */
export const MIN_TICK_STEP = 1;

function safeStep(step: number): number {
  'worklet';
  return Number.isFinite(step) && step > 0 ? step : MIN_TICK_STEP;
}

/** Clamps a tick index into the range of ticks the ruler is able to show. */
export function clampTickIndex(index: number, tickCount: number): number {
  'worklet';
  if (tickCount <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  const whole = Math.round(index);
  if (!(whole > 0)) return 0;
  if (whole > tickCount - 1) return tickCount - 1;
  return whole;
}

/**
 * The pixel offset that brings a tick under the centre marker.
 * Offsets are zero when the first tick is centred and negative as the ruler
 * scrolls towards the later values.
 */
export function tickOffset(index: number, step: number): number {
  'worklet';
  if (!Number.isFinite(index)) return 0;
  const whole = Math.round(index);
  if (whole <= 0) return 0;
  return -whole * safeStep(step);
}

/** The furthest the ruler can scroll: the last tick under the centre marker. */
export function maxTickOffset(tickCount: number, step: number): number {
  'worklet';
  if (tickCount <= 1) return 0;
  return -(tickCount - 1) * safeStep(step);
}

/** The tick that sits under the centre marker for a pixel offset. */
export function tickIndexAtOffset(offset: number, step: number, tickCount: number): number {
  'worklet';
  if (tickCount <= 0) return 0;
  if (!Number.isFinite(offset)) return 0;
  return clampTickIndex(-offset / safeStep(step), tickCount);
}

/** The pixel offset of the tick closest to a pixel offset. */
export function snapOffsetToTick(offset: number, step: number, tickCount: number): number {
  'worklet';
  return tickOffset(tickIndexAtOffset(offset, step, tickCount), step);
}

/**
 * The index of the value closest to a target. Ties keep the earlier value, so
 * a target that sits exactly between two values picks the shorter interval.
 */
export function nearestValueIndex(values: readonly number[], target: number): number {
  if (values.length === 0) return 0;
  if (!Number.isFinite(target)) return 0;

  let nearest = 0;
  let nearestDistance = Math.abs(values[0] - target);
  for (let index = 1; index < values.length; index += 1) {
    const distance = Math.abs(values[index] - target);
    if (distance < nearestDistance) {
      nearest = index;
      nearestDistance = distance;
    }
  }
  return nearest;
}
