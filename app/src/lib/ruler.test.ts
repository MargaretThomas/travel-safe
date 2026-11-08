import {
  clampTickIndex,
  maxTickOffset,
  MIN_TICK_STEP,
  nearestValueIndex,
  snapOffsetToTick,
  tickIndexAtOffset,
  tickOffset,
} from './ruler';

const VALUES = [60, 1440, 2880, 4320, 10080, 20160, 43200, 86400, 129600, 259200, 525600];

describe('ruler', () => {
  it('clamps a tick index into the range the ruler can show', () => {
    expect(clampTickIndex(0, 11)).toBe(0);
    expect(clampTickIndex(10, 11)).toBe(10);
    expect(clampTickIndex(-4, 11)).toBe(0);
    expect(clampTickIndex(99, 11)).toBe(10);
  });

  it('has no ticks to show when the ruler is empty', () => {
    expect(clampTickIndex(3, 0)).toBe(0);
    expect(tickIndexAtOffset(-100, 20, 0)).toBe(0);
    expect(maxTickOffset(0, 20)).toBe(0);
  });

  it('rounds a tick index to a whole tick', () => {
    expect(clampTickIndex(2.4, 11)).toBe(2);
    expect(clampTickIndex(2.6, 11)).toBe(3);
  });

  it('treats a broken index as the first tick', () => {
    expect(clampTickIndex(NaN, 11)).toBe(0);
    expect(clampTickIndex(Infinity, 11)).toBe(0);
  });

  it('brings a tick under the centre marker', () => {
    expect(tickOffset(0, 20)).toBe(0);
    expect(tickOffset(1, 20)).toBe(-20);
    expect(tickOffset(10, 20)).toBe(-200);
  });

  it('never scrolls past the first tick', () => {
    expect(tickOffset(-5, 20)).toBe(0);
    expect(tickOffset(NaN, 20)).toBe(0);
  });

  it('finds the tick under the centre marker for an offset', () => {
    expect(tickIndexAtOffset(0, 20, 11)).toBe(0);
    expect(tickIndexAtOffset(-20, 20, 11)).toBe(1);
    expect(tickIndexAtOffset(-200, 20, 11)).toBe(10);
  });

  it('snaps an offset between two ticks to the nearer tick', () => {
    expect(snapOffsetToTick(-9, 20, 11)).toBe(0);
    expect(snapOffsetToTick(-11, 20, 11)).toBe(-20);
    expect(snapOffsetToTick(-29, 20, 11)).toBe(-20);
    expect(snapOffsetToTick(-31, 20, 11)).toBe(-40);
  });

  it('snaps an offset beyond the ends back onto the first or last tick', () => {
    expect(snapOffsetToTick(120, 20, 11)).toBe(0);
    expect(snapOffsetToTick(-400, 20, 11)).toBe(-200);
  });

  it('stops the ruler at the last tick', () => {
    expect(maxTickOffset(11, 20)).toBe(-200);
    expect(maxTickOffset(1, 20)).toBe(0);
  });

  it('refuses a step that would divide by zero', () => {
    expect(tickIndexAtOffset(-40, 0, 11)).toBe(10);
    expect(snapOffsetToTick(-40, 0, 11)).toBe(-10);
    expect(maxTickOffset(11, 0)).toBe(-10);
  });

  it('falls back to the smallest step when the step is unusable', () => {
    expect(tickOffset(3, 0)).toBe(-3 * MIN_TICK_STEP);
    expect(tickOffset(3, -20)).toBe(-3 * MIN_TICK_STEP);
  });

  it('finds the value closest to a target', () => {
    expect(nearestValueIndex(VALUES, 60)).toBe(0);
    expect(nearestValueIndex(VALUES, 10080)).toBe(4);
    expect(nearestValueIndex(VALUES, 525600)).toBe(10);
  });

  it('snaps a value that is not on the ruler to the nearest one', () => {
    expect(nearestValueIndex(VALUES, 90)).toBe(0);
    expect(nearestValueIndex(VALUES, 5000)).toBe(3);
    expect(nearestValueIndex(VALUES, 100000)).toBe(7);
  });

  it('keeps the shorter interval when a target sits between two values', () => {
    expect(nearestValueIndex([10, 20], 15)).toBe(0);
  });

  it('has no value to pick when the ruler is empty', () => {
    expect(nearestValueIndex([], 60)).toBe(0);
    expect(nearestValueIndex([10, 20], NaN)).toBe(0);
  });
});
