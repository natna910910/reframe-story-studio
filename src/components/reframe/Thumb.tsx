import { useState } from "react";
import { Film } from "lucide-react";
import { assetById, type ShotId } from "@/lib/reframe/data";
import { cn } from "@/lib/utils";

export function Thumb({ id, className, label = true }: { id: ShotId; className?: string; label?: boolean }) {
  const a = assetById(id);
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn("relative overflow-hidden rounded-md bg-secondary", className)}>
      {failed ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-accent text-accent-foreground">
          <Film className="h-4 w-4" strokeWidth={1.5} />
          <span className="text-[11px]">{a.summary}</span>
        </div>
      ) : (
        <img src={a.thumb} alt={a.title} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      )}
      {label && (
        <span className="absolute left-1 top-1 rounded bg-card/90 px-1 text-[10px] font-medium text-foreground">{id}</span>
      )}
    </div>
  );
}
