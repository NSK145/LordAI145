import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Send, Mic, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
  onAttachClick?: () => void;
  onVoiceClick?: () => void;
  placeholder?: string;
}

export function ChatInputBar({
  value,
  onChange,
  onSubmit,
  busy,
  onAttachClick,
  onVoiceClick,
  placeholder = "Ask LORD anything...",
}: ChatInputBarProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const newHeight = Math.min(ta.scrollHeight, 220);
    ta.style.height = `${newHeight}px`;
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="w-full">
      <div className="relative mx-auto max-w-3xl">
        <motion.div
          animate={focused ? { scale: 1.01 } : { scale: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative rounded-full border transition-all duration-200"
          style={{
            background: "rgba(35,35,35,0.95)",
            borderColor: focused ? "hsl(var(--primary))" : "rgba(255,255,255,0.08)",
            boxShadow: focused
              ? "0 0 0 2px hsl(var(--primary) / 0.3), 0 4px 24px rgba(0,0,0,0.2)"
              : "0 4px 24px rgba(0,0,0,0.15)",
            backdropFilter: "blur(24px)",
          }}
        >
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            rows={1}
            className="max-h-[220px] min-h-[72px] w-full resize-none rounded-full border-0 bg-transparent px-14 py-5 text-base text-white outline-none placeholder:text-muted-foreground"
          />

          <div className="absolute bottom-1/2 left-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full">
            <button
              type="button"
              onClick={onAttachClick}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border/40 bg-background/50 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
              aria-label="Attach file"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <div className="absolute bottom-1/2 right-3 flex -translate-y-1/2 items-center gap-2">
            {onVoiceClick && (
              <motion.button
                type="button"
                onClick={onVoiceClick}
                className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
                aria-label="Voice input"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Mic className="h-5 w-5" />
              </motion.button>
            )}
            <motion.button
              type="button"
              onClick={onSubmit}
              disabled={busy || !value.trim()}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full text-white transition-all",
                busy || !value.trim()
                  ? "cursor-not-allowed bg-white/10"
                  : "bg-primary hover:scale-105",
              )}
              aria-label="Send message"
              whileHover={{ scale: busy || !value.trim() ? 1 : 1.05 }}
              whileTap={{ scale: busy || !value.trim() ? 1 : 0.95 }}
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
