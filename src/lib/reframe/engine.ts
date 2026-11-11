import { ALTERNATIVES, COMBOS, INITIAL, type ComboId, type Pair, type ShotId } from "./data";

export type ShotStatus = "locked" | "kept" | "adjusted" | "new" | null;

export interface Shot {
  id: ShotId;
  caption: string;
  reason: string;
  locked: boolean;
  status: ShotStatus;
}

const toShot = (combo: ComboId, [id, caption]: Pair): Shot => ({
  id,
  caption,
  reason: COMBOS[combo].reasons[id],
  locked: false,
  status: null,
});

export const initialStoryboard = (combo: ComboId): Shot[] => INITIAL[combo].map((p) => toShot(combo, p));

export interface RegenDiff {
  added: ShotId[];
  removed: ShotId[];
  adjusted: ShotId[];
  kept: ShotId[];
  locked: ShotId[];
}

export type RegenResult =
  | { ok: true; board: Shot[]; diff: RegenDiff; round: number; limited: boolean }
  | { ok: false; reason: "all-locked" | "no-change" };

const sameBoard = (a: Shot[], b: Shot[]) =>
  a.length === b.length && a.every((s, i) => s.id === b[i].id && s.caption === b[i].caption);

function fill(combo: ComboId, prev: Shot[], plan: Pair[], shift: number): Shot[] {
  const lockedIds = new Set(prev.filter((s) => s.locked).map((s) => s.id));
  const pool = plan.filter(([id]) => !lockedIds.has(id));
  const rotated = pool.slice(shift % pool.length).concat(pool.slice(0, shift % pool.length));
  let k = 0;
  return prev.map((s) => {
    if (s.locked) return { ...s };
    const pair = rotated[k++]!;
    return toShot(combo, pair);
  });
}

/**
 * Deterministic local regeneration. Locked shots keep id, caption and slot.
 * Unlocked slots are refilled from preset alternatives of the same audience;
 * never references shots outside the asset library and never duplicates locked shots.
 */
export function regenerate(combo: ComboId, prev: Shot[], round: number): RegenResult {
  const unlocked = prev.filter((s) => !s.locked).length;
  if (unlocked === 0) return { ok: false, reason: "all-locked" };
  const plans = [...ALTERNATIVES[combo], INITIAL[combo]];
  let next: Shot[] | null = null;
  let usedRound = round;
  outer: for (let attempt = 0; attempt < plans.length * 5; attempt++) {
    const r = round + attempt;
    const plan = plans[r % plans.length];
    const shift = Math.floor(r / plans.length);
    const cand = fill(combo, prev, plan, shift);
    if (!sameBoard(cand, prev)) {
      next = cand;
      usedRound = r;
      break outer;
    }
  }
  if (!next) return { ok: false, reason: "no-change" };

  const prevIds = new Set(prev.map((s) => s.id));
  const nextIds = new Set(next.map((s) => s.id));
  const diff: RegenDiff = { added: [], removed: [], adjusted: [], kept: [], locked: [] };
  next = next.map((s, i) => {
    const before = prev[i];
    let status: ShotStatus;
    if (s.locked) status = "locked";
    else if (before.id === s.id && before.caption === s.caption) status = "kept";
    else if (prevIds.has(s.id)) status = "adjusted";
    else status = "new";
    const key = status === "new" ? "added" : status;
    diff[key].push(s.id);
    return { ...s, status };
  });
  diff.removed = prev.filter((s) => !nextIds.has(s.id)).map((s) => s.id);
  return { ok: true, board: next, diff, round: usedRound + 1, limited: unlocked === 1 };
}

/** Move an unlocked shot one slot; refuses to cross or displace a locked shot. */
export function moveShot(board: Shot[], index: number, dir: -1 | 1): Shot[] | null {
  const j = index + dir;
  if (j < 0 || j >= board.length) return null;
  if (board[index].locked || board[j].locked) return null;
  const next = board.map((s) => ({ ...s }));
  const tmp = next[index]!;
  next[index] = next[j]!;
  next[j] = tmp;
  return next;
}
