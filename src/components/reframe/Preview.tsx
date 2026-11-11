import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { assetById } from "@/lib/reframe/data";
import type { Shot } from "@/lib/reframe/engine";
import { Thumb } from "./Thumb";
import { cn } from "@/lib/utils";

export function StoryPreview({ board, title, large = false }: { board: Shot[]; title: string; large?: boolean }) {
  const durations = board.map((s) => assetById(s.id).duration * 1000);
  const total = durations.reduce((a, b) => a + b, 0);
  const key = board.map((s) => s.id + s.caption).join("|");
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setElapsed(0);
    setPlaying(false);
  }, [key]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setElapsed((e) => {
        if (e + 100 >= total) {
          setPlaying(false);
          return total;
        }
        return e + 100;
      });
    }, 100);
    return () => clearInterval(t);
  }, [playing, total]);

  const { idx, local } = useMemo(() => {
    let acc = 0;
    for (let i = 0; i < durations.length; i++) {
      if (elapsed < acc + durations[i] || i === durations.length - 1) return { idx: i, local: elapsed - acc };
      acc += durations[i]!;
    }
    return { idx: 0, local: 0 };
  }, [elapsed, durations]);

  const shot = board[idx];
  const fmt = (ms: number) => `0:${String(Math.floor(ms / 1000)).padStart(2, "0")}`;
  const ended = elapsed >= total;

  return (
    <div className="flex flex-col gap-3">
      <div className={cn("relative mx-auto aspect-[9/16] w-full overflow-hidden rounded-lg border border-border bg-foreground", large ? "max-w-[300px]" : "max-w-[220px]")}>
        {shot && <Thumb key={shot.id} id={shot.id} label={false} className="animate-fade-up absolute inset-0 rounded-none" />}
        <div className="absolute inset-x-0 top-0 flex gap-0.5 p-2">
          {board.map((s, i) => (
            <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded bg-card/40">
              <div className="h-full bg-card" style={{ width: i < idx ? "100%" : i === idx ? `${(local / durations[i]!) * 100}%` : "0%" }} />
            </div>
          ))}
        </div>
        <div className="absolute left-2 top-4 rounded bg-foreground/60 px-1.5 py-0.5 text-[10px] text-background">故事板预览 · {shot?.id}</div>
        {shot && (
          <div className="absolute inset-x-3 bottom-6 text-center">
            <span className="rounded bg-foreground/70 px-2 py-1 text-[13px] leading-6 text-background [box-decoration-break:clone]">{shot.caption}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button size="icon" variant="outline" className="h-8 w-8" aria-label={playing ? "暂停" : "播放"} onClick={() => (ended ? (setElapsed(0), setPlaying(true)) : setPlaying(!playing))}>
          {playing ? <Pause /> : <Play />}
        </Button>
        <Button size="icon" variant="outline" className="h-8 w-8" aria-label="重播" onClick={() => { setElapsed(0); setPlaying(true); }}>
          <RotateCcw />
        </Button>
        <div className="flex-1">
          <div className="h-1 overflow-hidden rounded bg-secondary">
            <div className="h-full bg-primary transition-[width] duration-100" style={{ width: `${(elapsed / total) * 100}%` }} />
          </div>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">{fmt(elapsed)} / {fmt(total)}</span>
      </div>
      <p className="text-[12px] leading-5 text-muted-foreground">
        《{title}》· 以静态镜头定时切换模拟，非真实渲染视频。
      </p>
    </div>
  );
}
