import { describe, expect, it } from "vitest";
import { ASSETS } from "./data";
import { initialStoryboard, moveShot, regenerate } from "./engine";

describe("ReFrame engine", () => {
  it("initial plans follow the required orders", () => {
    expect(initialStoryboard("A").map((s) => s.id)).toEqual(["S01", "S03", "S06", "S04", "S05"]);
    expect(initialStoryboard("B").map((s) => s.id)).toEqual(["S02", "S07", "S04", "S05", "S08"]);
  });

  it("locked shot keeps id, slot and caption after regeneration; others change", () => {
    const board = initialStoryboard("A");
    board[1] = { ...board[1]!, locked: true };
    const r = regenerate("A", board, 0);
    if (!r.ok) throw new Error("expected ok");
    expect(r.board[1]!.id).toBe("S03");
    expect(r.board[1]!.caption).toBe("先看看菜单和价格");
    expect(r.board.filter((s) => s.id === "S03")).toHaveLength(1);
    expect(r.board.map((s) => s.id + s.caption)).not.toEqual(board.map((s) => s.id + s.caption));
    const valid = new Set(ASSETS.map((a) => a.id));
    r.board.forEach((s) => expect(valid.has(s.id)).toBe(true));
  });

  it("refuses when all shots are locked", () => {
    const board = initialStoryboard("B").map((s) => ({ ...s, locked: true }));
    expect(regenerate("B", board, 0)).toEqual({ ok: false, reason: "all-locked" });
  });

  it("cannot move across a locked shot", () => {
    const board = initialStoryboard("A");
    board[2] = { ...board[2]!, locked: true };
    expect(moveShot(board, 1, 1)).toBeNull();
    expect(moveShot(board, 0, 1)?.map((s) => s.id)).toEqual(["S03", "S01", "S06", "S04", "S05"]);
  });
});
