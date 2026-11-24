import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
}

export function Logo({ className, showWordmark = true, wordmarkClassName }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="size-9 shrink-0 drop-shadow-sm"
        role="img"
      >
        <rect width="64" height="64" rx="16" fill="#1f6f5c" />
        <path
          d="M32 13.5l14.5 5.2v12.4c0 10.6-6.2 18.2-14.5 21.4-8.3-3.2-14.5-10.8-14.5-21.4V18.7L32 13.5z"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3.1"
          strokeLinejoin="round"
        />
        <path
          d="M23.6 32.1l5.9 5.8 11.2-12"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showWordmark && (
        <span className={cn("text-[1.06rem] font-extrabold tracking-[-0.035em]", wordmarkClassName)}>
          Travel Safe
        </span>
      )}
    </span>
  );
}
