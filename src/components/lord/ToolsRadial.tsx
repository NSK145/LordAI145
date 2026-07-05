import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Image, FileText, Layers, Archive, Plus } from "lucide-react";

export function ToolsRadial({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  // allow external toggling via CustomEvent 'tools:toggle'
  useEffect(() => {
    const handler = () => setOpen((s) => !s);
    window.addEventListener("tools:toggle", handler as EventListener);
    return () => window.removeEventListener("tools:toggle", handler as EventListener);
  }, []);

  const items = [
    { id: "search", label: "Search", icon: Search },
    { id: "canvas", label: "Canvas", icon: Image },
    { id: "files", label: "Files", icon: FileText },
    { id: "memory", label: "Memory", icon: Archive },
    { id: "plugins", label: "Plugins", icon: Layers },
  ];

  return (
    <div className={className}>
      <div className="relative">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="absolute left-0 bottom-16 z-50 flex flex-col items-center gap-3"
            >
              {items.map((it, idx) => {
                const Icon = it.icon;
                return (
                  <motion.button
                    key={it.id}
                    initial={{ y: 6, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 6, opacity: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    aria-label={it.label}
                    className="flex items-center gap-2 rounded-full bg-white/6 px-3 py-2 text-sm text-white/90 shadow-lg backdrop-blur"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{it.label}</span>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((s) => !s)}
          className="group relative z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/12 text-cyan-200 shadow-[0_10px_30px_rgba(3,218,197,0.06)] backdrop-blur transition hover:scale-105"
        >
          <Plus className="h-5 w-5" />
          <span className="sr-only">Open tools</span>
        </button>
      </div>
    </div>
  );
}

export default ToolsRadial;
