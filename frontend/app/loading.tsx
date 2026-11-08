import { Loader2 } from "lucide-react";

export default function GlobalLoading() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 bg-navy px-6 text-white">
      <Loader2 className="h-6 w-6 animate-spin text-white" />
      <p className="font-mono text-xs tracking-widest text-white/70 uppercase">Loading Dezaakir...</p>
    </div>
  );
}
