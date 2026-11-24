import { cn } from "@/lib/utils";

interface ShinyTextProps {
  text: string;
  className?: string;
  speed?: number;
  baseColor?: string;
}

/** ReactBits — ShinyText (reactbits.dev), using the CSS shiny keyframes. */
export function ShinyText({ text, className, speed = 4.5, baseColor = "#e8f4ef" }: ShinyTextProps) {
  return (
    <span
      className={cn("inline-block bg-clip-text text-transparent", className)}
      style={{
        backgroundImage: `linear-gradient(110deg, ${baseColor} 35%, rgba(255,255,255,0.95) 50%, ${baseColor} 65%)`,
        backgroundSize: "200% 100%",
        animation: `shiny ${speed}s linear infinite`,
        WebkitBackgroundClip: "text",
      }}
    >
      {text}
    </span>
  );
}
