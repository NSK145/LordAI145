import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X, Image as ImgIcon } from "lucide-react";
import { getApiBaseUrl } from "@/lib/api-config";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

export default function ImageGenModal({
  open,
  onClose,
  onInsert,
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (urls: string[]) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [quality, setQuality] = useState("high");
  const [ratio, setRatio] = useState("1:1");
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    try {
      const res = await authenticatedFetch(`${getApiBaseUrl()}/api/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, quality, ratio }),
      });
      const body = await res.json();
      if (body?.images && Array.isArray(body.images)) {
        onInsert(body.images);
        onClose();
      }
    } catch (err) {
      // ignore
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        >
          <motion.div
            initial={{ y: 24 }}
            animate={{ y: 0 }}
            exit={{ y: 24 }}
            className="w-full max-w-2xl rounded-2xl bg-[#031426] p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Generate Images</h3>
              <button onClick={onClose} aria-label="Close" className="p-2">
                {" "}
                <X className="h-5 w-5" />{" "}
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image..."
              className="w-full rounded-md p-3 bg-background/30 text-white"
              rows={4}
            />
            <div className="mt-3 flex items-center gap-2">
              <select
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
                className="rounded-md bg-background/30 px-3 py-2 text-sm"
              >
                <option>1:1</option>
                <option>16:9</option>
                <option>4:3</option>
              </select>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="rounded-md bg-background/30 px-3 py-2 text-sm"
              >
                <option value="high">High</option>
                <option value="med">Medium</option>
                <option value="low">Low</option>
              </select>
              <button
                onClick={generate}
                disabled={busy}
                className="ml-auto inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold"
              >
                {busy ? "Generating..." : "Generate"} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
