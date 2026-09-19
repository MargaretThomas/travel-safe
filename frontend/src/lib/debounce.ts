export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number,
): { call: (...args: Args) => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    call(...args: Args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        fn(...args);
      }, waitMs);
    },
    cancel() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
