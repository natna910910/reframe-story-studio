import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ChevronRight, Clapperboard, Columns2,
  Download, Film, FolderOpen, Home, Info, Lock, MonitorPlay, PanelLeftClose, PanelLeftOpen, RefreshCw,
  RotateCcw, Target, Undo2, Unlock, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ASSETS, COMBOS, assetById, type ComboId, type ShotId } from "@/lib/reframe/data";
import { initialStoryboard, moveShot, regenerate, type RegenDiff, type Shot } from "@/lib/reframe/engine";
import { cn } from "@/lib/utils";
import { Thumb } from "./Thumb";
import { StoryPreview } from "./Preview";

type Step = "home" | "assets" | "direction" | "storyboard" | "preview";
const STEPS: { id: Exclude<Step, "home">; label: string; icon: typeof Film }[] = [
  { id: "assets", label: "素材分析", icon: FolderOpen },
  { id: "direction", label: "创作方向", icon: Target },
  { id: "storyboard", label: "故事板", icon: Clapperboard },
  { id: "preview", label: "预览导出", icon: MonitorPlay },
];
const STAGES = ["理解素材内容", "匹配受众关注点", "规划叙事结构"];
const DEMO_NOTE = "产品概念演示 · AI生成结果由预设数据模拟";

interface Snapshot { board: Shot[]; diff: RegenDiff | null }

export function ReFrameApp() {
  const [step, setStep] = useState<Step>("home");
  const [combo, setCombo] = useState<ComboId>("A");
  const [failNext, setFailNext] = useState(false);
  const [gen, setGen] = useState<{ status: "idle" | "loading" | "error"; stage: number; target: ComboId }>({ status: "idle", stage: 0, target: "A" });
  const [boards, setBoards] = useState<Partial<Record<ComboId, Shot[]>>>({});
  const [version, setVersion] = useState<ComboId>("A");
  const [history, setHistory] = useState<Record<ComboId, Snapshot[]>>({ A: [], B: [] });
  const [rounds, setRounds] = useState<Record<ComboId, number>>({ A: 0, B: 0 });
  const [diffs, setDiffs] = useState<Record<ComboId, RegenDiff | null>>({ A: null, B: null });
  const [regenLoading, setRegenLoading] = useState(false);
  const [selected, setSelected] = useState<ShotId | null>(null);
  const [compare, setCompare] = useState(false);
  const [detail, setDetail] = useState<ShotId | null>(null);
  const [assetsOpen, setAssetsOpen] = useState(true);
  const [exported, setExported] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  const board = boards[version];
  const anyBoard = !!(boards.A || boards.B);

  const reset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setStep("home"); setCombo("A"); setFailNext(false); setGen({ status: "idle", stage: 0, target: "A" });
    setBoards({}); setVersion("A"); setHistory({ A: [], B: [] }); setRounds({ A: 0, B: 0 });
    setDiffs({ A: null, B: null }); setRegenLoading(false); setSelected(null); setCompare(false); setExported(null);
    toast("示例项目已重置");
  };

  const runGenerate = (target: ComboId) => {
    setGen({ status: "loading", stage: 0, target });
    setVersion(target);
    setStep("storyboard");
    setCompare(false);
    later(() => setGen((g) => ({ ...g, stage: 1 })), 550);
    later(() => setGen((g) => ({ ...g, stage: 2 })), 1100);
    const shouldFail = failNext;
    later(() => {
      if (shouldFail) {
        setGen({ status: "error", stage: 2, target });
        setFailNext(false);
        return;
      }
      setBoards((b) => ({ ...b, [target]: initialStoryboard(target) }));
      setGen({ status: "idle", stage: 0, target });
      setSelected(null);
      toast.success(`已生成「${COMBOS[target].audience}」叙事方案`);
    }, 1700);
  };

  const updateBoard = (next: Shot[]) => setBoards((b) => ({ ...b, [version]: next }));

  const toggleLock = (id: ShotId) => {
    if (!board) return;
    const prev = board;
    const target = prev.find((s) => s.id === id)!;
    const next = prev.map((s) => (s.id === id ? { ...s, locked: !s.locked } : s));
    updateBoard(next);
    const v = version;
    toast(target.locked ? `已解锁 ${id}` : `已锁定 ${id}，局部重新生成时将保持不变`, {
      action: { label: "撤销", onClick: () => setBoards((b) => ({ ...b, [v]: prev })) },
    });
  };

  const move = (i: number, dir: -1 | 1) => {
    if (!board) return;
    const next = moveShot(board, i, dir);
    if (!next) {
      toast.warning("锁定镜头位置固定，无法与其交换顺序");
      return;
    }
    updateBoard(next.map((s) => ({ ...s, status: s.status === "kept" ? null : s.status })));
  };

  const lockedCount = board?.filter((s) => s.locked).length ?? 0;
  const allLocked = !!board && lockedCount === board.length;

  const doRegen = () => {
    if (!board) return;
    if (allLocked) {
      toast.warning("所有镜头均已锁定，没有可调整的位置");
      return;
    }
    const r = regenerate(version, board, rounds[version]);
    if (!r.ok) {
      toast.warning("锁定镜头过多，可用素材无法产生新的组合，请解锁部分镜头后重试");
      return;
    }
    setRegenLoading(true);
    const v = version;
    const prev = board;
    const prevDiff = diffs[v];
    later(() => {
      setHistory((h) => ({ ...h, [v]: [...h[v], { board: prev, diff: prevDiff }] }));
      setBoards((b) => ({ ...b, [v]: r.board }));
      setRounds((x) => ({ ...x, [v]: r.round }));
      setDiffs((d) => ({ ...d, [v]: r.diff }));
      setRegenLoading(false);
      if (r.limited) toast.warning("仅剩 1 个未锁定位置，本次调整空间有限");
      else toast.success(`已重新生成未锁定镜头，保留 ${r.diff.locked.length} 个锁定镜头`);
    }, 1100);
  };

  const undo = () => {
    const stack = history[version];
    const last = stack[stack.length - 1];
    if (!last) return;
    // keep current lock decisions for shots still present at the same id
    setBoards((b) => ({ ...b, [version]: last.board }));
    setDiffs((d) => ({ ...d, [version]: last.diff }));
    setHistory((h) => ({ ...h, [version]: stack.slice(0, -1) }));
    toast("已撤销本次重新生成，恢复上一个版本");
  };

  const exportPlan = () => {
    if (!board) return;
    const c = COMBOS[version];
    const data = {
      project: "周末咖啡馆探店",
      title: c.title,
      audience: c.audience,
      goal: c.goal,
      focus: c.focus,
      totalDuration: board.reduce((a, s) => a + assetById(s.id).duration, 0),
      shots: board.map((s, i) => ({
        order: i + 1, id: s.id, name: assetById(s.id).title, duration: assetById(s.id).duration,
        caption: s.caption, reason: s.reason, locked: s.locked,
      })),
      note: DEMO_NOTE + "；不包含真实视频渲染。",
      exportedAt: new Date().toISOString(),
    };
    const name = `reframe-plan-${version === "A" ? "student-guide" : "lifestyle-mood"}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    setExported(name);
    toast.success(`已导出 ${name}`);
  };

  const goStep = (s: Step) => {
    if ((s === "storyboard" || s === "preview") && !anyBoard && gen.status === "idle") {
      toast("请先在“创作方向”中生成叙事方案");
      setStep("direction");
      return;
    }
    if (s === "preview" && !board) {
      toast("当前版本尚未生成，请先生成故事板");
      return;
    }
    setStep(s);
  };

  if (step === "home") return <HomeScreen onStart={() => setStep("assets")} />;

  const usedIds = new Set(board?.map((s) => s.id) ?? []);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card px-4">
        <button onClick={() => setStep("home")} className="flex items-center gap-2 rounded-md px-1 text-[15px] font-semibold">
          <Logo /> ReFrame AI
        </button>
        <span className="text-border">/</span>
        <span className="truncate text-[13px] text-muted-foreground">周末咖啡馆探店</span>
        <nav className="mx-auto hidden items-center gap-1 md:flex" aria-label="步骤">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />}
              <button
                onClick={() => goStep(s.id)}
                className={cn("rounded-md px-2.5 py-1 text-[13px] transition-colors", step === s.id ? "bg-selected font-medium text-accent-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {i + 1}. {s.label}
              </button>
            </div>
          ))}
        </nav>
        <span className="hidden text-[12px] text-muted-foreground xl:inline">{DEMO_NOTE}</span>
        <Button variant="outline" size="sm" onClick={reset}><RotateCcw /> 重置示例</Button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left nav */}
        <aside className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-border bg-card py-3">
          <NavBtn label="首页" icon={Home} onClick={() => setStep("home")} />
          <div className="my-1 h-px w-8 bg-border" />
          {STEPS.map((s) => (
            <NavBtn key={s.id} label={s.label} icon={s.icon} active={step === s.id} onClick={() => goStep(s.id)} />
          ))}
          <div className="mt-auto">
            <NavBtn label={assetsOpen ? "收起素材" : "展开素材"} icon={assetsOpen ? PanelLeftClose : PanelLeftOpen} onClick={() => setAssetsOpen(!assetsOpen)} />
          </div>
        </aside>

        {/* Asset panel */}
        {assetsOpen && (
          <aside className="hidden w-[248px] shrink-0 flex-col border-r border-border bg-card lg:flex">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-[14px] font-semibold">素材库</h2>
              <span className="text-[12px] text-muted-foreground">8 段 · 38 秒</span>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-2">
              {ASSETS.map((a) => (
                <button key={a.id} onClick={() => setDetail(a.id)} className="flex w-full items-center gap-3 rounded-md p-1.5 text-left transition-colors hover:bg-secondary">
                  <Thumb id={a.id} label={false} className="h-12 w-[27px] shrink-0 rounded" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[13px]">
                      <span className="font-medium text-muted-foreground">{a.id}</span>
                      <span className="truncate">{a.title}</span>
                    </div>
                    <div className="text-[12px] text-muted-foreground">{a.duration}s · {a.summary}</div>
                  </div>
                  {(step === "storyboard" || step === "preview") && usedIds.has(a.id) && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" title="已用于当前版本" />
                  )}
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* Main */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          {step === "assets" && <AssetsStep onDetail={setDetail} onNext={() => setStep("direction")} />}
          {step === "direction" && (
            <DirectionStep
              combo={combo} setCombo={setCombo} failNext={failNext} setFailNext={setFailNext}
              generated={boards} onBack={() => setStep("assets")}
              onGenerate={() => runGenerate(combo)}
              onView={() => { setVersion(combo); setStep("storyboard"); }}
            />
          )}
          {step === "storyboard" && (
            <StoryboardStep
              version={version}
              setVersion={(v) => { setVersion(v); setSelected(null); }}
              board={board} boards={boards} gen={gen} regenLoading={regenLoading}
              compare={compare} setCompare={setCompare}
              selected={selected} setSelected={setSelected}
              onLock={toggleLock} onMove={move} onRegen={doRegen} allLocked={allLocked} lockedCount={lockedCount}
              onRetry={() => runGenerate(gen.target)} onGenerate={runGenerate}
              onBackDirection={() => { setCombo(gen.target); setGen((g) => ({ ...g, status: "idle" })); setStep("direction"); }}
              onPreview={() => goStep("preview")}
              diff={diffs[version]} canUndo={history[version].length > 0} onUndo={undo}
            />
          )}
          {step === "preview" && board && (
            <PreviewStep version={version} board={board} onBack={() => setStep("storyboard")} onExport={exportPlan} exported={exported} />
          )}
        </main>

        {/* Right columns for storyboard */}
        {step === "storyboard" && board && gen.status === "idle" && !compare && (
          <>
            <section className="hidden w-[256px] shrink-0 flex-col border-l border-border bg-card p-4 xl:flex">
              <h2 className="mb-3 text-[14px] font-semibold">竖屏预览</h2>
              <StoryPreview board={board} title={COMBOS[version].title} />
            </section>
            <AIPanel version={version} board={board} selected={selected} diff={diffs[version]} canUndo={history[version].length > 0} onUndo={undo} />
          </>
        )}
      </div>

      <AssetDialog id={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function Logo() {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
      <Columns2 className="h-3.5 w-3.5" strokeWidth={2} />
    </span>
  );
}

function NavBtn({ label, icon: Icon, active, onClick }: { label: string; icon: typeof Film; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick} title={label} aria-label={label}
      className={cn("flex h-10 w-10 items-center justify-center rounded-lg transition-colors", active ? "bg-selected text-accent-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
    </button>
  );
}

/* ---------------- Home ---------------- */

function HomeScreen({ onStart }: { onStart: () => void }) {
  const [files, setFiles] = useState<{ name: string; url: string; type: string }[]>([]);
  useEffect(() => () => files.forEach((f) => URL.revokeObjectURL(f.url)), [files]);
  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-14 items-center gap-2 border-b border-border bg-card px-6 text-[15px] font-semibold">
        <Logo /> ReFrame AI
        <span className="ml-auto text-[12px] font-normal text-muted-foreground">{DEMO_NOTE}</span>
      </header>
      <div className="animate-fade-up mx-auto max-w-5xl px-6 py-14">
        <h1 className="text-[24px] font-semibold tracking-tight">同一组素材，为不同受众讲出不同的故事</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-6 text-muted-foreground">
          ReFrame AI 根据目标受众重新规划镜头选择、叙事顺序与字幕。你可以锁定重要镜头，只重新生成其余部分——AI 负责建议，你保留控制权。
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-[1.4fr_1fr]">
          <div className="rounded-xl border border-border bg-card p-5 shadow-panel">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12px] text-muted-foreground">示例项目</div>
                <h2 className="mt-0.5 text-[16px] font-semibold">周末咖啡馆探店</h2>
              </div>
              <span className="rounded-md bg-accent px-2 py-0.5 text-[12px] text-accent-foreground">8 段素材 · 38 秒</span>
            </div>
            <div className="mt-4 grid grid-cols-8 gap-1.5">
              {ASSETS.map((a) => <Thumb key={a.id} id={a.id} className="aspect-[9/16]" />)}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[13px] text-muted-foreground">两种受众方向 · 镜头锁定 · 局部重新生成 · 方案导出</p>
              <Button onClick={onStart}>体验示例项目 <ArrowRight /></Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-panel">
            <div className="text-[12px] text-muted-foreground">自定义素材</div>
            <h2 className="mt-0.5 text-[16px] font-semibold">上传自己的素材</h2>
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-secondary/60 px-4 py-6 text-center transition-colors hover:bg-secondary focus-within:ring-2 focus-within:ring-ring/40">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-[13px]">选择本地视频或图片</span>
              <span className="text-[12px] text-muted-foreground">仅在浏览器内预览，不会上传</span>
              <input
                type="file" accept="video/*,image/*" multiple className="sr-only"
                onChange={(e) => {
                  const list = Array.from(e.target.files ?? []).slice(0, 8).map((f) => ({ name: f.name, url: URL.createObjectURL(f), type: f.type }));
                  setFiles(list);
                }}
              />
            </label>
            {files.length > 0 && (
              <>
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {files.map((f) => (
                    <div key={f.url} className="aspect-[9/16] overflow-hidden rounded-md bg-secondary" title={f.name}>
                      {f.type.startsWith("video") ? <video src={f.url} muted className="h-full w-full object-cover" /> : <img src={f.url} alt={f.name} className="h-full w-full object-cover" />}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2 rounded-md border border-border bg-background p-2.5 text-[12px] leading-5 text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                  已载入 {files.length} 个文件用于预览。自定义素材的真实 AI 分析暂未接入，当前无法为其生成叙事方案，请先体验示例项目。
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Assets ---------------- */

function StepHeader({ title, desc, children }: { title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-6 py-4">
      <div>
        <h1 className="text-[20px] font-semibold tracking-tight">{title}</h1>
        {desc && <p className="mt-1 text-[13px] text-muted-foreground">{desc}</p>}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function AssetsStep({ onDetail, onNext }: { onDetail: (id: ShotId) => void; onNext: () => void }) {
  return (
    <div className="animate-fade-up">
      <StepHeader title="素材分析" desc="点击素材查看详情与识别标签。">
        <Button onClick={onNext}>下一步，设置创作方向 <ArrowRight /></Button>
      </StepHeader>
      <div className="px-6 py-5">
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[13px]">
          <Check className="h-4 w-4 text-success" /> AI 已识别 8 段素材，共 38 秒
          <span className="ml-auto text-[12px] text-muted-foreground">识别结果为预设演示数据</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
          {ASSETS.map((a) => (
            <button key={a.id} onClick={() => onDetail(a.id)} className="group flex gap-3 rounded-[10px] border border-border bg-card p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/50">
              <Thumb id={a.id} className="aspect-[9/16] w-[72px] shrink-0" />
              <div className="min-w-0 py-0.5">
                <div className="text-[12px] text-muted-foreground">{a.id} · {a.duration}s</div>
                <div className="text-[14px] font-medium">{a.title}</div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">{a.summary}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {a.tags.map((t) => <span key={t} className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">{t}</span>)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AssetDialog({ id, onClose }: { id: ShotId | null; onClose: () => void }) {
  const a = id ? assetById(id) : null;
  return (
    <Dialog open={!!a} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        {a && (
          <>
            <DialogHeader>
              <DialogTitle className="text-[16px] font-semibold">{a.id} · {a.title}</DialogTitle>
              <DialogDescription>{a.duration} 秒 · {a.summary}</DialogDescription>
            </DialogHeader>
            <div className="flex gap-4">
              <Thumb id={a.id} label={false} className="aspect-[9/16] w-40 shrink-0" />
              <div className="space-y-3 text-[13px]">
                <div><div className="text-[12px] text-muted-foreground">画面描述</div><p className="mt-1 leading-6">{a.description}</p></div>
                <div>
                  <div className="text-[12px] text-muted-foreground">AI 识别标签</div>
                  <div className="mt-1 flex flex-wrap gap-1">{a.tags.map((t) => <span key={t} className="rounded bg-accent px-1.5 py-0.5 text-[12px] text-accent-foreground">{t}</span>)}</div>
                </div>
                <div><div className="text-[12px] text-muted-foreground">适配度</div>
                  <p className="mt-1 leading-6 text-muted-foreground">留学生：{COMBOS.A.reasons[a.id]}<br />白领：{COMBOS.B.reasons[a.id]}</p></div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Direction ---------------- */

function DirectionStep(p: {
  combo: ComboId; setCombo: (c: ComboId) => void; failNext: boolean; setFailNext: (b: boolean) => void;
  generated: Partial<Record<ComboId, Shot[]>>; onBack: () => void; onGenerate: () => void; onView: () => void;
}) {
  const c = COMBOS[p.combo];
  const exists = !!p.generated[p.combo];
  return (
    <div className="animate-fade-up">
      <StepHeader title="创作方向" desc="选择目标受众与创作目标，AI 将据此重新规划镜头与字幕。">
        <Button variant="outline" onClick={p.onBack}><ArrowLeft /> 上一步</Button>
        {exists ? (
          <>
            <Button variant="outline" onClick={p.onGenerate}><RefreshCw /> 重新生成</Button>
            <Button onClick={p.onView}>查看已生成方案 <ArrowRight /></Button>
          </>
        ) : (
          <Button onClick={p.onGenerate}>AI 生成叙事方案 <ArrowRight /></Button>
        )}
      </StepHeader>
      <div className="grid gap-6 px-6 py-5 xl:grid-cols-2">
        <OptionGroup title="目标受众" value={p.combo} onChange={p.setCombo} items={[
          { id: "A", label: COMBOS.A.audience, desc: COMBOS.A.audienceDesc },
          { id: "B", label: COMBOS.B.audience, desc: COMBOS.B.audienceDesc },
        ]} />
        <OptionGroup title="创作目标" value={p.combo} onChange={p.setCombo} items={[
          { id: "A", label: COMBOS.A.goal, desc: COMBOS.A.goalDesc },
          { id: "B", label: COMBOS.B.goal, desc: COMBOS.B.goalDesc },
        ]} />
      </div>
      <div className="px-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-[12px] text-muted-foreground">当前组合 {p.combo}</div>
          <div className="mt-1 text-[15px] font-semibold">{c.audience} + {c.goal}</div>
          <p className="mt-1 text-[13px] leading-6 text-muted-foreground">本演示预设两种组合：A 留学生 + 实用攻略，B 都市白领 + 情绪氛围；选择受众会同步匹配对应目标。</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {c.focus.map((f) => <span key={f} className="rounded-md bg-accent px-2 py-0.5 text-[12px] text-accent-foreground">{f}</span>)}
          </div>
          {exists && <p className="mt-3 text-[12px] text-success">该组合已生成，重新生成会覆盖当前版本的编辑与锁定。</p>}
        </div>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground">
          <input type="checkbox" checked={p.failNext} onChange={(e) => p.setFailNext(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
          模拟生成失败（用于演示失败与重试状态）
        </label>
      </div>
    </div>
  );
}

function OptionGroup({ title, items, value, onChange }: { title: string; value: ComboId; onChange: (c: ComboId) => void; items: { id: ComboId; label: string; desc: string }[] }) {
  return (
    <fieldset>
      <legend className="mb-2 text-[15px] font-semibold">{title}</legend>
      <div className="grid gap-2">
        {items.map((it) => {
          const on = value === it.id;
          return (
            <button key={it.id} role="radio" aria-checked={on} onClick={() => onChange(it.id)}
              className={cn("flex items-start gap-3 rounded-[10px] border p-3.5 text-left transition-colors", on ? "border-primary/50 bg-selected" : "border-border bg-card hover:bg-secondary")}>
              <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border", on ? "border-primary bg-primary" : "border-border")}>
                {on && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
              </span>
              <span>
                <span className="block text-[14px] font-medium">{it.id}. {it.label}</span>
                <span className="mt-0.5 block text-[13px] text-muted-foreground">{it.desc}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ---------------- Storyboard ---------------- */

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  locked: { text: "已保留", cls: "bg-selected text-accent-foreground" },
  kept: { text: "未变化", cls: "bg-secondary text-muted-foreground" },
  adjusted: { text: "已调整", cls: "bg-accent text-accent-foreground border border-primary/30" },
  new: { text: "新增", cls: "bg-success/10 text-success" },
};

function StoryboardStep(p: {
  version: ComboId; setVersion: (v: ComboId) => void; board: Shot[] | undefined; boards: Partial<Record<ComboId, Shot[]>>;
  gen: { status: string; stage: number; target: ComboId }; regenLoading: boolean;
  compare: boolean; setCompare: (b: boolean) => void; selected: ShotId | null; setSelected: (s: ShotId) => void;
  onLock: (id: ShotId) => void; onMove: (i: number, d: -1 | 1) => void; onRegen: () => void; allLocked: boolean; lockedCount: number;
  onRetry: () => void; onGenerate: (c: ComboId) => void; onBackDirection: () => void; onPreview: () => void;
  diff: RegenDiff | null; canUndo: boolean; onUndo: () => void;
}) {
  const c = COMBOS[p.version];
  const tabs = (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary p-0.5" role="tablist">
      {(["A", "B"] as ComboId[]).map((v) => (
        <button key={v} role="tab" aria-selected={!p.compare && p.version === v} disabled={p.gen.status !== "idle"}
          onClick={() => { p.setCompare(false); p.setVersion(v); }}
          className={cn("rounded-md px-3 py-1 text-[13px] transition-colors disabled:opacity-50", !p.compare && p.version === v ? "bg-card font-medium text-foreground shadow-panel" : "text-muted-foreground hover:text-foreground")}>
          版本 {v} · {v === "A" ? "留学生" : "都市白领"}
        </button>
      ))}
      <button role="tab" aria-selected={p.compare} disabled={p.gen.status !== "idle"}
        onClick={() => (p.boards.A && p.boards.B ? p.setCompare(!p.compare) : toast("两个版本都生成后才能对比，请先生成另一个版本"))}
        className={cn("flex items-center gap-1 rounded-md px-3 py-1 text-[13px] transition-colors disabled:opacity-50", p.compare ? "bg-card font-medium shadow-panel" : "text-muted-foreground hover:text-foreground")}>
        <Columns2 className="h-3.5 w-3.5" /> 对比
      </button>
    </div>
  );

  if (p.gen.status === "loading") return <GeneratingState stage={p.gen.stage} target={p.gen.target} />;
  if (p.gen.status === "error") {
    const t = COMBOS[p.gen.target];
    return (
      <div className="animate-fade-up flex h-full items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-[15px] font-semibold"><AlertCircle className="h-4 w-4 text-destructive" /> 叙事方案生成失败</div>
          <p className="mt-2 text-[13px] leading-6 text-muted-foreground">在“规划叙事结构”阶段请求超时（模拟错误）。你的素材与参数已保留，可直接重试。</p>
          <div className="mt-3 rounded-md bg-secondary p-3 text-[13px]">
            <div>目标受众：{t.audience}</div><div>创作目标：{t.goal}</div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={p.onRetry}><RefreshCw /> 重试</Button>
            <Button variant="outline" onClick={p.onBackDirection}>返回修改方向</Button>
          </div>
        </div>
      </div>
    );
  }

  if (p.compare && p.boards.A && p.boards.B) {
    const a = p.boards.A, b = p.boards.B;
    const aIds = new Set(a.map((s) => s.id)), bIds = new Set(b.map((s) => s.id));
    return (
      <div className="animate-fade-up">
        <StepHeader title="版本对比" desc="同一组素材，两种受众的镜头级差异。浅蓝标记为该版本独有镜头。">{tabs}</StepHeader>
        <div className="grid gap-4 px-6 py-5 lg:grid-cols-2">
          {([["A", a, bIds], ["B", b, aIds]] as const).map(([v, list, other]) => (
            <div key={v} className="rounded-xl border border-border bg-card p-4">
              <div className="text-[12px] text-muted-foreground">版本 {v} · {COMBOS[v].audience} · {COMBOS[v].goal}</div>
              <div className="mt-1 text-[15px] font-semibold">《{COMBOS[v].title}》</div>
              <div className="mt-1 text-[12px] text-muted-foreground">重点：{COMBOS[v].focus.join(" / ")}</div>
              <ol className="mt-3 space-y-2">
                {list.map((s, i) => (
                  <li key={s.id} className={cn("flex gap-3 rounded-lg border p-2", other.has(s.id) ? "border-border" : "border-primary/30 bg-accent")}>
                    <Thumb id={s.id} className="aspect-[9/16] w-11 shrink-0" />
                    <div className="min-w-0 text-[13px]">
                      <div className="text-[12px] text-muted-foreground">#{i + 1} · {s.id} {assetById(s.id).title}{!other.has(s.id) && " · 独有"}{s.locked && " · 已锁定"}</div>
                      <div className="mt-0.5">{s.caption}</div>
                      <div className="mt-0.5 text-[12px] text-muted-foreground">{s.reason}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!p.board) {
    return (
      <div className="animate-fade-up">
        <StepHeader title="故事板">{tabs}</StepHeader>
        <div className="m-6 rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <div className="text-[15px] font-semibold">版本 {p.version} 尚未生成</div>
          <p className="mt-1 text-[13px] text-muted-foreground">{c.audience} + {c.goal}</p>
          <Button className="mt-4" onClick={() => p.onGenerate(p.version)}>生成此版本</Button>
        </div>
      </div>
    );
  }

  const total = p.board.reduce((a, s) => a + assetById(s.id).duration, 0);
  const regenDisabledReason = p.allLocked ? "所有镜头均已锁定，没有可重新生成的位置。请解锁至少一个镜头。" : null;

  return (
    <div className="animate-fade-up">
      <StepHeader title={`《${c.title}》`} desc={`${c.audience} · ${c.goal} · ${p.board.length} 个镜头 · ${total} 秒`}>
        {tabs}
      </StepHeader>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-2.5">
        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><Lock className="h-3.5 w-3.5" /> 已锁定 {p.lockedCount}/{p.board.length}</span>
        <div className="ml-auto flex items-center gap-2">
          {p.canUndo && <Button variant="outline" size="sm" onClick={p.onUndo}><Undo2 /> 撤销重新生成</Button>}
          <span title={regenDisabledReason ?? "仅重新生成未锁定的镜头"}>
            <Button size="sm" variant="outline" onClick={p.onRegen} disabled={p.regenLoading || p.allLocked}>
              <RefreshCw className={cn(p.regenLoading && "animate-spin")} /> {p.regenLoading ? "正在重新生成…" : "局部重新生成"}
            </Button>
          </span>
          <Button size="sm" onClick={p.onPreview}>预览与导出 <ArrowRight /></Button>
        </div>
      </div>
      {regenDisabledReason && (
        <div className="mx-6 mt-3 flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-[12px] text-warning">
          <Info className="h-3.5 w-3.5" /> {regenDisabledReason}
        </div>
      )}
      {!p.allLocked && p.lockedCount === p.board.length - 1 && (
        <div className="mx-6 mt-3 flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-[12px] text-muted-foreground">
          <Info className="h-3.5 w-3.5" /> 仅剩 1 个未锁定位置，重新生成的调整空间有限。
        </div>
      )}

      {/* Timeline strip */}
      <div className="px-6 pt-4">
        <div className="flex h-9 gap-0.5 overflow-hidden rounded-md border border-border bg-card p-0.5">
          {p.board.map((s) => (
            <button key={s.id} onClick={() => p.setSelected(s.id)} style={{ flex: assetById(s.id).duration }}
              className={cn("flex items-center justify-center gap-1 rounded text-[11px] transition-colors", p.selected === s.id ? "bg-primary text-primary-foreground" : s.locked ? "bg-selected text-accent-foreground" : "bg-secondary text-muted-foreground hover:bg-accent")}>
              {s.locked && <Lock className="h-3 w-3" />}{s.id} · {assetById(s.id).duration}s
            </button>
          ))}
        </div>
      </div>

      {/* Shot list */}
      <ol className={cn("space-y-2 px-6 py-4 transition-opacity", p.regenLoading && "pointer-events-none opacity-60")}>
        {p.board.map((s, i) => {
          const a = assetById(s.id);
          const st = s.status ? STATUS_LABEL[s.status] : null;
          const highlight = s.status === "adjusted" || s.status === "new";
          const upOk = i > 0 && !s.locked && !p.board![i - 1].locked;
          const downOk = i < p.board!.length - 1 && !s.locked && !p.board![i + 1].locked;
          return (
            <li key={s.id} onClick={() => p.setSelected(s.id)}
              className={cn("animate-fade-up group flex cursor-pointer gap-3 rounded-[10px] border p-2.5 transition-colors",
                p.selected === s.id ? "border-primary/50" : "border-border",
                highlight ? "bg-accent" : "bg-card hover:bg-background")}>
              <div className="flex w-6 shrink-0 flex-col items-center pt-1 text-[12px] font-medium text-muted-foreground">{i + 1}</div>
              <Thumb id={s.id} className="aspect-[9/16] w-[60px] shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-medium text-muted-foreground">{s.id}</span>
                  <span className="text-[14px] font-medium">{a.title}</span>
                  <span className="text-[12px] text-muted-foreground">{a.duration}s</span>
                  {s.locked && <span className="flex items-center gap-1 rounded bg-selected px-1.5 py-0.5 text-[11px] text-accent-foreground"><Lock className="h-3 w-3" fill="currentColor" /> 已锁定</span>}
                  {st && <span className={cn("rounded px-1.5 py-0.5 text-[11px]", st.cls)}>{st.text}</span>}
                </div>
                <div className="mt-1 text-[13px] leading-5">“{s.caption}”</div>
                <div className="mt-1 text-[12px] leading-5 text-muted-foreground"><span className="text-foreground/70">选镜原因：</span>{s.reason}</div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant={s.locked ? "default" : "outline"} className="h-7 w-[72px] px-2 text-[12px]" aria-pressed={s.locked} onClick={() => p.onLock(s.id)}>
                  {s.locked ? <><Lock fill="currentColor" /> 已锁定</> : <><Unlock /> 锁定</>}
                </Button>
                <div className="flex gap-1">
                  <Button size="icon" variant="outline" className="h-7 w-7" aria-label="上移" disabled={!upOk} title={s.locked ? "锁定镜头位置固定" : undefined} onClick={() => p.onMove(i, -1)}><ArrowUp /></Button>
                  <Button size="icon" variant="outline" className="h-7 w-7" aria-label="下移" disabled={!downOk} title={s.locked ? "锁定镜头位置固定" : undefined} onClick={() => p.onMove(i, 1)}><ArrowDown /></Button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {p.regenLoading && (
        <div className="mx-6 mb-4 overflow-hidden rounded-md border border-border bg-card px-3 py-2 text-[12px] text-muted-foreground">
          正在根据「{c.audience}」重新规划未锁定镜头，锁定镜头保持不变…
          <div className="mt-1.5 h-0.5 overflow-hidden rounded bg-secondary"><div className="animate-progress h-full w-1/3 bg-primary" /></div>
        </div>
      )}
    </div>
  );
}

function GeneratingState({ stage, target }: { stage: number; target: ComboId }) {
  return (
    <div className="animate-fade-up px-6 py-6">
      <div className="mb-4 rounded-xl border border-border bg-card p-4">
        <div className="text-[14px] font-semibold">正在为「{COMBOS[target].audience}」生成叙事方案</div>
        <ol className="mt-3 space-y-2">
          {STAGES.map((s, i) => (
            <li key={s} className={cn("flex items-center gap-2 text-[13px]", i > stage && "text-muted-foreground")}>
              {i < stage ? <Check className="h-4 w-4 text-success" /> : i === stage ? <RefreshCw className="h-4 w-4 animate-spin text-primary" /> : <span className="h-4 w-4 rounded-full border border-border" />}
              {s}
            </li>
          ))}
        </ol>
        <div className="mt-3 h-1 overflow-hidden rounded bg-secondary">
          <div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${((stage + 1) / 3) * 100}%` }} />
        </div>
      </div>
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3 rounded-[10px] border border-border bg-card p-2.5">
            <div className="aspect-[9/16] w-[60px] animate-pulse rounded-md bg-secondary" />
            <div className="flex-1 space-y-2 py-1"><div className="h-3 w-1/3 animate-pulse rounded bg-secondary" /><div className="h-3 w-2/3 animate-pulse rounded bg-secondary" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AIPanel({ version, board, selected, diff, canUndo, onUndo }: { version: ComboId; board: Shot[]; selected: ShotId | null; diff: RegenDiff | null; canUndo: boolean; onUndo: () => void }) {
  const c = COMBOS[version];
  const sel = board.find((s) => s.id === selected);
  const unused = ASSETS.filter((a) => !board.some((s) => s.id === a.id));
  return (
    <aside className="hidden w-[284px] shrink-0 flex-col overflow-y-auto border-l border-border bg-card min-[1360px]:flex">
      <section className="border-b border-border p-4">
        <h2 className="text-[14px] font-semibold">叙事说明</h2>
        <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{c.summary}</p>
        <div className="mt-2 flex flex-wrap gap-1">{c.focus.map((f) => <span key={f} className="rounded bg-accent px-1.5 py-0.5 text-[12px] text-accent-foreground">{f}</span>)}</div>
      </section>
      {diff && (
        <section className="animate-fade-up border-b border-border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold">本次调整</h2>
            {canUndo && <button onClick={onUndo} className="flex items-center gap-1 rounded text-[12px] text-primary hover:text-primary-hover"><Undo2 className="h-3.5 w-3.5" /> 撤销</button>}
          </div>
          <dl className="mt-2 space-y-1.5 text-[12px]">
            <DiffRow label="已保留（锁定）" ids={diff.locked} />
            <DiffRow label="新增" ids={diff.added} />
            <DiffRow label="已调整" ids={diff.adjusted} />
            <DiffRow label="未变化" ids={diff.kept} />
            <DiffRow label="移出" ids={diff.removed} />
          </dl>
        </section>
      )}
      <section className="border-b border-border p-4">
        <h2 className="text-[14px] font-semibold">选镜理由</h2>
        {sel ? (
          <div className="mt-2 text-[13px]">
            <div className="font-medium">{sel.id} · {assetById(sel.id).title}</div>
            <p className="mt-1 leading-6 text-muted-foreground">{sel.reason}</p>
          </div>
        ) : <p className="mt-2 text-[13px] text-muted-foreground">选中一个镜头查看 AI 为何选择它。</p>}
      </section>
      <section className="p-4">
        <h2 className="text-[14px] font-semibold">未使用素材</h2>
        <ul className="mt-2 space-y-2">
          {unused.map((a) => (
            <li key={a.id} className="text-[12px] leading-5"><span className="font-medium">{a.id} {a.title}</span><span className="block text-muted-foreground">{c.reasons[a.id]}</span></li>
          ))}
        </ul>
      </section>
    </aside>
  );
}

function DiffRow({ label, ids }: { label: string; ids: ShotId[] }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{ids.length ? ids.join("、") : "—"}</dd>
    </div>
  );
}

/* ---------------- Preview ---------------- */

function PreviewStep({ version, board, onBack, onExport, exported }: { version: ComboId; board: Shot[]; onBack: () => void; onExport: () => void; exported: string | null }) {
  const c = COMBOS[version];
  return (
    <div className="animate-fade-up">
      <StepHeader title="预览与导出" desc={`版本 ${version} · ${c.audience} · ${c.goal}`}>
        <Button variant="outline" onClick={onBack}><ArrowLeft /> 返回故事板</Button>
        <Button onClick={onExport}><Download /> 导出创作方案</Button>
      </StepHeader>
      <div className="grid gap-6 px-6 py-5 lg:grid-cols-[320px_1fr]">
        <StoryPreview board={board} title={c.title} large />
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-[15px] font-semibold">《{c.title}》</div>
            <ol className="mt-3 divide-y divide-border">
              {board.map((s, i) => (
                <li key={s.id} className="flex items-center gap-3 py-2 text-[13px]">
                  <span className="w-5 text-muted-foreground">{i + 1}</span>
                  <span className="w-10 font-medium text-muted-foreground">{s.id}</span>
                  <span className="flex-1">{s.caption}</span>
                  {s.locked && <Lock className="h-3.5 w-3.5 text-primary" fill="currentColor" />}
                  <span className="w-8 text-right text-muted-foreground">{assetById(s.id).duration}s</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex gap-2 rounded-lg border border-border bg-background p-3 text-[12px] leading-5 text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            当前 Demo 不支持真实视频渲染和 MP4 导出。导出的 JSON 方案包含标题、受众、创作目标、镜头顺序、字幕、选镜理由及锁定状态。
          </div>
          {exported && (
            <div className="animate-fade-up flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 p-3 text-[13px] text-success">
              <Check className="h-4 w-4" /> 已导出 {exported}，可在浏览器下载记录中查看。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
