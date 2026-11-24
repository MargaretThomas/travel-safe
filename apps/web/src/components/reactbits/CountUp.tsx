import { animate, useInView } from "motion/react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  delay?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
  separator?: string;
}

/** ReactBits — CountUp (reactbits.dev), animated when it enters the viewport. */
export function CountUp({
  to,
  from = 0,
  duration = 1.6,
  delay = 0,
  className,
  suffix = "",
  prefix = "",
  separator = ",",
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -40px 0px" });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const element = ref.current;
    const controls = animate(from, to, {
      duration,
      delay,
      ease: "easeOut",
      onUpdate(value) {
        const rounded = Math.round(value);
        element.textContent = `${prefix}${rounded.toLocaleString("en-US").replaceAll(",", separator)}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [inView, from, to, duration, delay, prefix, suffix, separator]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {from.toLocaleString("en-US").replaceAll(",", separator)}
      {suffix}
    </span>
  );
}
