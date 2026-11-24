import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeading({ eyebrow, title, description, align = "left", className }: SectionHeadingProps) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
      <h2 className="display-title mt-3 text-[2rem] text-foreground sm:text-[2.6rem]">{title}</h2>
      {description && <p className="mt-4 text-[0.98rem] leading-relaxed text-muted-foreground">{description}</p>}
    </div>
  );
}
