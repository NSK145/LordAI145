import { motion, AnimatePresence } from "framer-motion";
import { Upload, Image, Palette, FileText, Mic, Globe, Youtube, Search } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ToolItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TOOLS: ToolItem[] = [
  { id: "upload", label: "Upload File", icon: Upload },
  { id: "image", label: "Upload Image", icon: Image },
  { id: "create", label: "Create Image", icon: Palette },
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "web", label: "Website", icon: Globe },
  { id: "youtube", label: "YouTube", icon: Youtube },
  { id: "research", label: "Research", icon: Search },
];

interface ToolMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToolSelect?: (tool: string) => void;
}

export function ToolMenu({ open, onOpenChange, onToolSelect }: ToolMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleToolClick = useCallback(
    (toolId: string) => {
      onToolSelect?.(toolId);
      onOpenChange(false);
    },
    [onToolSelect, onOpenChange],
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onOpenChange(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onOpenChange]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="absolute bottom-full left-0 mb-3 w-64 rounded-2xl border border-border/40 bg-[rgba(30,30,30,0.95)] shadow-2xl backdrop-blur-xl"
        >
          <div className="p-2">
            {TOOLS.map((tool, i) => {
              const Icon = tool.icon;
              return (
                <motion.button
                  key={tool.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, delay: i * 0.03 }}
                  onClick={() => handleToolClick(tool.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all",
                    "text-muted-foreground hover:bg-primary/10 hover:text-primary",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tool.label}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
