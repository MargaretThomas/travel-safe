import { useRef, type MouseEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
}

/**
 * ReactBits — SpotlightCard (reactbits.dev), adapted for Tailwind tokens.
 * Tracks the pointer and paints a soft radial highlight inside the card.
 */
export function SpotlightCard({
  children,
  className,
  spotlightColor = "rgba(31, 111, 92, 0.13)",
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    element.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
    element.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
    element.style.setProperty("--spotlight-color", spotlightColor);
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-colors duration-300",
        "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-500 before:content-['']",
        "before:bg-[radial-gradient(420px_circle_at_var(--mouse-x)_var(--mouse-y),var(--spotlight-color),transparent_60%)]",
        "hover:before:opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}
