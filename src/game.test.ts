import { afterEach, describe, expect, it } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import { ConstantClock, createEngine } from "@clockwyrks/simple-2d";
import { game, BACKGROUND } from "./game";
import type { CaromState } from "./game";
import type { DeepReadonly } from "ts-essentials";
import * as C from "./constants";
import { obstacle } from "./world";

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});
async function setup(step = 10) {
  const events = new EventTarget();
  const canvas = createCanvas(C.FIELD_W, C.FIELD_H);
  const engine = createEngine({
    canvas: canvas as unknown as HTMLCanvasElement,
    game,
    background: BACKGROUND,
    width: C.FIELD_W,
    height: C.FIELD_H,
    layout: C.LAYOUT,
    clock: new ConstantClock(step),
    surface: {
      cssWidth: () => C.FIELD_W,
      cssHeight: () => C.FIELD_H,
      dpr: () => 1,
      events: () => events,
    },
  });
  await engine.initialize();
  cleanups.push(() => engine.destroy());
  const key = (code: string, down = true) =>
    events.dispatchEvent(
      Object.assign(new Event(down ? "keydown" : "keyup"), {
        code,
        repeat: false,
      }),
    );
  const tap = async (code: string) => {
    key(code);
    await engine.advance(1);
    key(code, false);
  };
  const pointer = (
    type: string,
    x: number,
    y: number,
    device = "mouse",
    id = 1,
  ) =>
    events.dispatchEvent(
      Object.assign(new Event(`pointer${type}`), {
        clientX: x,
        clientY: y,
        pointerId: id,
        pointerType: device,
        isPrimary: id === 1,
        button: 0,
        buttons: type === "up" ? 0 : 1,
      }),
    );
  const d = engine.debug;
  const apply = (f: (s: DeepReadonly<CaromState>) => CaromState) =>
    engine.apply(f);
  const shot = (x: number, y: number, vx: number, vy: number, spin = 0) => {
    apply((s) => d.clearWorld(s));
    apply((s) => d.spawnBall(s));
    apply((s) => d.setScreen(s, "playing"));
    apply((s) => d.setBallHeld(s, false));
    apply((s) => d.setBallPosition(s, x, y));
    apply((s) => d.setBallVelocity(s, vx, vy));
    apply((s) => d.setBallSpin(s, spin));
  };
  return { engine, d, key, tap, pointer, apply, shot, canvas };
}

describe("engine-driven menus and matches", () => {
  it("initializes the full world and keeps menus still", async () => {
    const { engine, d } = await setup();
    const before = d.snapshot(engine.state);
    expect(before).toMatchObject({
      version: C.CAROM_DEBUG_VERSION,
      screen: "title",
      score: { p1: 0, p2: 0 },
      ball: { held: true, holdTimer: C.HOLD_TIME, speed: 0 },
      obstacleClock: 0,
    });
    await engine.advance(5);
    expect(engine.state.simTime).toBeCloseTo(0.05);
    expect(engine.state.ball?.holdTimer).toBe(before.ball?.holdTimer);
    expect(engine.state.obstacleClock).toBe(0);
    expect(d.menuItemRect(engine.state, -1)).toBeNull();
    expect(d.menuItemRect(engine.state, 3)).toBeNull();
    expect(engine.diagnostics().every((r) => r.error === undefined)).toBe(true);
  });
  it("wraps menus, remembers title choice, and shows how-to", async () => {
    const { engine, tap } = await setup();
    await tap("KeyW");
    expect(engine.state.menuIndex).toBe(2);
    await tap("Enter");
    expect(engine.state.screen).toBe("howto");
    await tap("Enter");
    expect(engine.state.screen).toBe("title");
    expect(engine.state.menuIndex).toBe(2);
    await tap("KeyW");
    await tap("Enter");
    expect(engine.state.mode).toBe("versus");
    expect(engine.state.titleIndex).toBe(1);
    await tap("Escape");
    expect(engine.state.screen).toBe("paused");
    await tap("Escape");
    expect(engine.state.screen).toBe("countdown");
    await tap("KeyP");
    await tap("KeyS");
    await tap("KeyS");
    await tap("Enter");
    expect(engine.state.screen).toBe("title");
    expect(engine.state.menuIndex).toBe(1);
  });
  it("gives keyboard movement priority and handles simultaneous escape edges once", async () => {
    const { engine, key, tap } = await setup();
    key("KeyS");
    key("Enter");
    await engine.advance(1);
    key("KeyS", false);
    key("Enter", false);
    expect(engine.state.screen).toBe("title");
    expect(engine.state.menuIndex).toBe(1);
    await tap("Enter");
    await tap("Escape");
    const before = engine.debug.snapshot(engine.state);
    await engine.advance(12);
    expect(engine.debug.snapshot(engine.state).ball).toEqual(before.ball);
    expect(engine.state.obstacleClock).toBe(before.obstacleClock);
    await tap("Escape");
    expect(engine.state.screen).toBe("countdown");
  });
  it("serves on the elapsed hold frame, not before, and clears the trail after points", async () => {
    const { engine, d, apply, tap } = await setup();
    await tap("Enter");
    apply((s) => d.setBallServeSign(s, -1));
    apply((s) => d.setBallHoldTimer(s, 0.01));
    await engine.advance(1);
    expect(engine.state.screen).toBe("playing");
    expect(engine.state.ball).toMatchObject({
      x: C.FIELD_CX,
      y: C.FIELD_CY,
      held: false,
      holdTimer: 0,
      serveSign: -1,
    });
    expect(engine.state.ball?.vx).toBeCloseTo(
      -C.SERVE_SPEED * Math.cos(C.SERVE_ANGLE),
    );
    await engine.advance(20);
    expect(
      engine.state.ball?.trail.every(
        (p) => engine.state.simTime - p.t <= C.TRAIL_TIME + 1e-10,
      ),
    ).toBe(true);
  });
  it("supports pointer and touch confirmation across frames without accepting mismatched edges", async () => {
    const { engine, pointer, d } = await setup();
    const r = d.menuItemRect(engine.state, 1)!;
    pointer("down", r.x + 20, r.y + 20);
    await engine.advance(1);
    pointer("up", 0, 0);
    await engine.advance(1);
    expect(engine.state.screen).toBe("title");
    pointer("down", r.x + 20, r.y + 20, "touch");
    await engine.advance(1);
    pointer("up", r.x + 20, r.y + 20, "touch");
    await engine.advance(1);
    expect(engine.state.mode).toBe("versus");
    expect(engine.state.screen).toBe("countdown");
  });
  it("takes same-frame clicks and resets the world when leaving how-to", async () => {
    const { engine, pointer, d, tap } = await setup();
    const r = d.menuItemRect(engine.state, 2)!;
    pointer("move", r.x + 5, r.y + 5);
    pointer("down", r.x + 5, r.y + 5);
    pointer("up", r.x + 5, r.y + 5);
    await engine.advance(1);
    expect(engine.state.screen).toBe("howto");
    await tap("Escape");
    expect(engine.state.titleIndex).toBe(2);
  });
  it("moves solo with either key set, and clamps actual driven velocity", async () => {
    const { engine, key, tap, d, apply } = await setup();
    await tap("Enter");
    key("ArrowDown");
    await engine.advance(10);
    key("ArrowDown", false);
    expect(engine.state.paddles.left.cy).toBeCloseTo(
      C.FIELD_CY + C.PADDLE_SPEED * 0.1,
    );
    apply((s) => d.setPaddleDriven(s, "left", true));
    apply((s) => d.setPaddleVy(s, "left", 1000));
    apply((s) => d.setPaddleCy(s, "left", C.PADDLE_MAX_CY - 2));
    await engine.advance(1);
    expect(engine.state.paddles.left.vy).toBeCloseTo(200);
    await engine.advance(1);
    expect(engine.state.paddles.left.vy).toBe(0);
    expect(engine.state.paddles.left.drivenVy).toBe(1000);
  });
  it("plays versus with independent paddles, restarts, and resumes", async () => {
    const { engine, tap, key } = await setup();
    await tap("KeyS");
    await tap("Enter");
    key("KeyW");
    key("ArrowDown");
    await engine.advance(3);
    key("KeyW", false);
    key("ArrowDown", false);
    expect(engine.state.paddles.left.cy).toBeLessThan(C.FIELD_CY);
    expect(engine.state.paddles.right.cy).toBeGreaterThan(C.FIELD_CY);
    await tap("KeyP");
    await tap("Enter");
    expect(engine.state.screen).toBe("countdown");
    await tap("KeyP");
    await tap("KeyS");
    await tap("Enter");
    expect(engine.state.score).toEqual({ p1: 0, p2: 0 });
    expect(engine.state.paddles.left.cy).toBe(C.FIELD_CY);
  });
});

describe("physics, AI, scoring, and audio", () => {
  it("reflects walls and preserves speed while spin decays exponentially", async () => {
    const { engine, shot } = await setup();
    shot(300, C.BALL_R + 1, 200, -300, 300);
    await engine.advance(1);
    expect(engine.state.ball!.vy).toBeGreaterThan(0);
    expect(
      Math.hypot(engine.state.ball!.vx, engine.state.ball!.vy),
    ).toBeCloseTo(Math.hypot(200, 300));
    expect(engine.state.ball!.spin).toBeCloseTo(
      300 * Math.pow(0.5, 0.01 / C.SPIN_HALFLIFE),
    );
    shot(300, C.FIELD_H - C.BALL_R - 1, 200, 300);
    await engine.advance(1);
    expect(engine.state.ball!.vy).toBeLessThan(0);
  });
  it("applies contact angle, speed cap, and paddle velocity spin", async () => {
    const { engine, shot, d, apply } = await setup();
    shot(C.P1_X1 + C.BALL_R + 2, C.FIELD_CY, -C.SPEED_CAP, 0);
    apply((s) => d.setPaddleDriven(s, "left", true));
    apply((s) => d.setPaddleVy(s, "left", 300));
    await engine.advance(1);
    expect(engine.state.ball!.vx).toBeGreaterThan(0);
    expect(
      Math.hypot(engine.state.ball!.vx, engine.state.ball!.vy),
    ).toBeCloseTo(C.SPEED_CAP);
    expect(engine.state.ball!.spin).toBeGreaterThan(240);
    shot(C.P2_X0 - C.BALL_R - 1, C.FIELD_CY, 500, 0);
    apply((s) => d.setMode(s, "versus"));
    await engine.advance(1);
    expect(engine.state.ball!.vx).toBeLessThan(0);
  });
  it("treats paddle end caps as walls", async () => {
    const { engine, shot } = await setup();
    shot(
      C.P1_X0 + C.PADDLE_W / 2,
      C.FIELD_CY - C.PADDLE_HALF - C.BALL_R - 1,
      0,
      400,
    );
    await engine.advance(1);
    expect(engine.state.ball!.vy).toBe(-400);
    expect(engine.state.ball!.spin).toBe(0);
  });
  it("reflects a tilted obstacle face in its local frame without changing speed", async () => {
    const { engine, shot, apply, d } = await setup(2);
    const t = 0.6,
      o = obstacle(0, t),
      c = Math.cos(o.theta),
      s = Math.sin(o.theta);
    shot(
      o.cx + (C.OBSTACLE_HW + C.BALL_R + 1) * c,
      o.cy + (C.OBSTACLE_HW + C.BALL_R + 1) * s,
      -700 * c,
      -700 * s,
    );
    apply((st) => d.setObstacleClock(st, t));
    apply((st) => d.setObstacleClockRunning(st, false));
    apply((st) => d.spawnObstacle(st, 0));
    await engine.advance(2);
    expect(engine.state.ball!.vx).toBeGreaterThan(0);
    expect(engine.state.ball!.vy).toBeGreaterThan(0);
    expect(
      Math.hypot(engine.state.ball!.vx, engine.state.ball!.vy),
    ).toBeCloseTo(700);
  });
  it("pushes balls out of obstacle interiors and resolves corner normals", async () => {
    const { engine, shot, apply, d } = await setup();
    shot(C.OBSTACLE_CENTERS[0].x, C.OBSTACLE_CENTERS[0].y, 0, 0);
    apply((s) => d.spawnObstacle(s, 0));
    apply((s) => d.setObstacleClockRunning(s, false));
    await engine.advance(1);
    expect(engine.state.ball!.x).toBeCloseTo(
      C.OBSTACLE_CENTERS[0].x + C.OBSTACLE_HW + C.BALL_R,
    );
    shot(506, 296, -100, -100);
    apply((s) => d.spawnObstacle(s, 0));
    apply((s) => d.setObstacleClock(s, 0));
    await engine.advance(1);
    expect(engine.state.ball!.vx).toBeGreaterThan(0);
  });
  it("scores only past a whole goal, serves toward the loser, and enforces win by two", async () => {
    const { engine, shot, apply, d, tap } = await setup();
    shot(C.FIELD_W + C.BALL_R + 1, 300, 100, 0);
    apply((s) => d.setScore(s, 10, 10));
    await engine.advance(1);
    expect(engine.state.score).toEqual({ p1: 11, p2: 10 });
    expect(engine.state.screen).toBe("countdown");
    expect(engine.state.receiver).toBe("right");
    expect(engine.state.ball?.trail).toEqual([]);
    shot(C.FIELD_W + C.BALL_R + 1, 300, 100, 0);
    await engine.advance(1);
    expect(engine.state.winner).toBe("left");
    expect(engine.state.screen).toBe("matchover");
    await tap("Enter");
    expect(engine.state.screen).toBe("countdown");
    shot(-C.BALL_R - 1, 300, -100, 0);
    apply((s) => d.setScore(s, 0, 10));
    await engine.advance(1);
    expect(engine.state.winner).toBe("right");
    await tap("KeyS");
    await tap("Enter");
    expect(engine.state.screen).toBe("title");
  });
  it("gates AI sensing and movement independently", async () => {
    const { engine, shot, apply, d } = await setup();
    shot(900, 600, 400, 10);
    await engine.advance(1);
    expect(engine.state.paddles.right.vy).toBe(C.AI_SPEED);
    apply((s) => d.setAiMovement(s, false));
    const cy = engine.state.paddles.right.cy;
    await engine.advance(1);
    expect(engine.state.paddles.right.cy).toBe(cy);
    expect(engine.state.paddles.right.vy).toBe(0);
    apply((s) => d.setAiTracking(s, false));
    apply((s) => d.setAiMovement(s, true));
    apply((s) => d.setPaddleCy(s, "right", 600));
    await engine.advance(1);
    expect(engine.state.paddles.right.vy).toBe(-C.AI_SPEED);
  });
  it("emits each collision cue once a frame even muted", async () => {
    const { engine, shot, tap } = await setup(100);
    const cues: { cue: string; gain: number }[] = [];
    engine.events.on("cue:played", (e) => cues.push(e));
    await tap("KeyM");
    expect(engine.state.muted).toBe(true);
    shot(200, 20, 0, -10000);
    await engine.advance(1);
    expect(cues.filter((c) => c.cue === C.CUES.wallBounce)).toHaveLength(1);
    expect(cues[0].gain).toBe(0);
  });
  it("reaches equivalent contacts at 2 and 16 ms", async () => {
    const outcomes = [];
    for (const step of [2, 16]) {
      const { engine, shot } = await setup(step);
      shot(400, 370, -500, 0, 60);
      await engine.advance(800 / step);
      outcomes.push(engine.state.ball!);
    }
    expect(
      Math.abs(
        Math.hypot(outcomes[0].vx, outcomes[0].vy) -
          Math.hypot(outcomes[1].vx, outcomes[1].vy),
      ),
    ).toBeLessThan(10);
    expect(Math.sign(outcomes[0].vx)).toBe(Math.sign(outcomes[1].vx));
  });
});

describe("debug poses are isolated immutable transitions", () => {
  it("poses every field, reconciles without advancing, fails loudly for absent entities", async () => {
    const { engine, d, apply } = await setup();
    const original = structuredClone(engine.state);
    apply((s) => d.setMode(s, "versus"));
    apply((s) => d.setScreen(s, "paused"));
    apply((s) => d.setMenuIndex(s, 2));
    apply((s) => d.setTitleIndex(s, 1));
    apply((s) => d.setResumeScreen(s, "countdown"));
    apply((s) => d.setWinner(s, "right"));
    apply((s) => d.setReceiver(s, "right"));
    apply((s) => d.setMuted(s, true));
    apply((s) => d.setAiTracking(s, false));
    apply((s) => d.setAiMovement(s, false));
    apply((s) => d.setBallServeSign(s, 1));
    apply((s) => d.drawBallServeSign(s));
    apply((s) => d.setObstacleClock(s, 2));
    const before = d.snapshot(engine.state);
    apply((s) => d.reconcile(s));
    expect(d.snapshot(engine.state)).toEqual(before);
    expect(before.obstacles[0]).toEqual(obstacle(0, 2));
    apply((s) => d.clearWorld(s));
    expect(d.snapshot(engine.state).ball).toBeNull();
    expect(() => apply((s) => d.setBallSpin(s, 1))).toThrow();
    expect(() => apply((s) => d.spawnObstacle(s, 2))).toThrow();
    await engine.advance(1);
    expect(engine.state.obstacles).toEqual([]);
    apply((s) => d.spawnObstacle(s, 1));
    expect(engine.state.obstacles).toHaveLength(1);
    apply((s) => d.spawnObstacle(s, 1));
    expect(engine.state.obstacles).toHaveLength(1);
    apply((s) => d.reset(s));
    expect(engine.state).toEqual({
      ...original,
      muted: true,
      ball: { ...original.ball, serveSign: engine.state.ball!.serveSign },
    });
    expect([-1, 1]).toContain(engine.state.ball!.serveSign);
  });
  it("draws absent entities, all menu screens, diagnostics, and records real drawing", async () => {
    const { engine, apply, d } = await setup();
    engine.startRecording();
    for (const screen of [
      "title",
      "howto",
      "countdown",
      "playing",
      "paused",
      "matchover",
    ] as const) {
      apply((s) => d.setScreen(s, screen));
      await engine.advance(1);
    }
    apply((s) => d.clearWorld(s));
    apply((s) => d.setScreen(s, "playing"));
    await engine.advance(1);
    expect(engine.diagnostics().every((r) => !r.error)).toBe(true);
    expect(d.menuItemRect(engine.state, 0)).toBeNull();
    const recording = engine.stopRecording();
    expect(recording.frames).toHaveLength(7);
    expect(recording.ops.length).toBeGreaterThan(100);
  });
});
