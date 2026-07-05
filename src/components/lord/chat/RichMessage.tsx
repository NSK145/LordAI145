import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function RichMessage({ text }: { text: string }) {
  const blocks = splitFencedCode(text);
  return (
    <div className="prose prose-invert space-y-4">
      {blocks.map((block, i) =>
        block.type === "code" ? (
          <CodeBlock key={i} lang={block.lang} code={block.code} />
        ) : (
          <TextContent key={i} text={block.text} />
        ),
      )}
    </div>
  );
}

type Block = { type: "text"; text: string } | { type: "code"; lang: string; code: string };

function splitFencedCode(input: string): Block[] {
  const out: Block[] = [];
  const re = /```([\w+-]*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    if (m.index > last) out.push({ type: "text", text: input.slice(last, m.index) });
    out.push({ type: "code", lang: m[1] || "text", code: m[2].replace(/\n$/, "") });
    last = m.index + m[0].length;
  }
  if (last < input.length) out.push({ type: "text", text: input.slice(last) });
  return out.length ? out : [{ type: "text", text: input }];
}

function TextContent({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/);

  return (
    <div className="space-y-3">
      {paragraphs.map((p, i) => {
        const trimmed = p.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={i} className="text-lg font-semibold text-white">
              {trimmed.slice(4)}
            </h3>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={i} className="text-xl font-semibold text-white">
              {trimmed.slice(3)}
            </h2>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h1 key={i} className="text-2xl font-bold text-white">
              {trimmed.slice(2)}
            </h1>
          );
        }

        return (
          <p key={i} className="leading-relaxed text-foreground/90">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode[] {
  const re = /(\*\*[^*]+\*\*|`[^`\n]+`|__[^_]+__|_[^_]+_)/g;
  const parts = text.split(re).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-primary">
          {p.slice(2, -2)}
        </strong>
      );
    }
    if (p.startsWith("__") && p.endsWith("__")) {
      return (
        <strong key={i} className="font-semibold text-primary">
          {p.slice(2, -2)}
        </strong>
      );
    }
    if (p.startsWith("_") && p.endsWith("_") && !p.startsWith("`")) {
      return (
        <em key={i} className="italic text-primary/80">
          {p.slice(1, -1)}
        </em>
      );
    }
    if (p.startsWith("`") && p.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[0.85em] text-primary"
        >
          {p.slice(1, -1)}
        </code>
      );
    }

    return <span key={i}>{p}</span>;
  });
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Copy failed silently
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden rounded-xl border border-border/40 bg-[rgba(20,20,20,0.8)]"
    >
      <div className="flex items-center justify-between border-b border-border/40 bg-white/5 px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-primary/80">
          {lang}
        </span>
        <button
          onClick={copy}
          className={cn(
            "flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] transition",
            copied ? "text-[var(--hud-success)]" : "text-muted-foreground hover:text-primary",
          )}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs">
        <code className="font-mono text-foreground/90">{code}</code>
      </pre>
    </motion.div>
  );
}
