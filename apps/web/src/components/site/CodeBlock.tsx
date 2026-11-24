import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  filename?: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ code, filename, language = "bash", className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border border-white/10 bg-[#0d1714] text-[#dce9e4]", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#8fb3a8]">
          <span className="size-1.5 rounded-full bg-[#5fc3a6]" />
          {filename ?? language}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={copy}
          className="h-7 rounded-md px-2 text-[0.7rem] text-[#b9d2c9] hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto p-4 text-[0.8rem] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
