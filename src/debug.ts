import type { DeepReadonly } from "ts-essentials";
import type {
  BallState,
  CaromState,
  Mode,
  Screen,
  Side,
  PaddleState,
} from "./game";
import { CAROM_DEBUG_VERSION } from "./constants";
import { initial, obstacle, park, poses, drawSign } from "./world";
import { menuItemRect } from "./menus";
type State = DeepReadonly<CaromState>;
type Pose<A extends unknown[] = []> = (state: State, ...args: A) => CaromState;
export interface CaromDebugApi {
  readonly version: number;
  clearWorld: Pose;
  spawnBall: Pose;
  spawnObstacle: Pose<[number]>;
  reset: Pose;
  reconcile: Pose;
  setScreen: Pose<[Screen]>;
  setMode: Pose<[Mode]>;
  setMenuIndex: Pose<[number]>;
  setTitleIndex: Pose<[number]>;
  setResumeScreen: Pose<["countdown" | "playing"]>;
  setScore: Pose<[number, number]>;
  setWinner: Pose<[Side | null]>;
  setReceiver: Pose<[Side]>;
  setPaddleCy: Pose<[Side, number]>;
  setPaddleVy: Pose<[Side, number]>;
  setPaddleDriven: Pose<[Side, boolean]>;
  setBallPosition: Pose<[number, number]>;
  setBallVelocity: Pose<[number, number]>;
  setBallSpin: Pose<[number]>;
  setBallHeld: Pose<[boolean]>;
  setBallHoldTimer: Pose<[number]>;
  setBallServeSign: Pose<[1 | -1]>;
  drawBallServeSign: Pose;
  setAiTracking: Pose<[boolean]>;
  setAiMovement: Pose<[boolean]>;
  setMuted: Pose<[boolean]>;
  setObstacleClock: Pose<[number]>;
  setObstacleClockRunning: Pose<[boolean]>;
  snapshot(state: State): CaromSnapshot;
  menuItemRect: typeof menuItemRect;
}
export type CaromSnapshot = Omit<CaromState, "ball" | "menuPresses"> & {
  version: number;
  ball: (BallState & { speed: number }) | null;
};
function ball(s: State, patch: Partial<BallState>): CaromState {
  if (!s.ball) throw new Error("No ball on the field");
  return { ...s, ball: { ...s.ball, ...patch } };
}
function paddle(s: State, side: Side, patch: Partial<PaddleState>): CaromState {
  return {
    ...s,
    paddles: { ...s.paddles, [side]: { ...s.paddles[side], ...patch } },
  };
}
export function createDebug(): CaromDebugApi {
  return {
    version: CAROM_DEBUG_VERSION,
    clearWorld: (s) => ({ ...s, ball: null, obstacles: [] }),
    spawnBall: (s) => ({ ...s, ball: park() }),
    spawnObstacle: (s, index) => ({
      ...s,
      obstacles: [
        ...s.obstacles.filter((o) => o.index !== index),
        obstacle(index, s.obstacleClock),
      ].sort((a, b) => a.index - b.index),
    }),
    reset: (s) => initial(s.muted),
    reconcile: (s) => poses(s),
    setScreen: (s, screen) => ({ ...s, screen }),
    setMode: (s, mode) => ({ ...s, mode }),
    setMenuIndex: (s, menuIndex) => ({ ...s, menuIndex }),
    setTitleIndex: (s, titleIndex) => ({ ...s, titleIndex }),
    setResumeScreen: (s, resumeScreen) => ({ ...s, resumeScreen }),
    setScore: (s, p1, p2) => ({ ...s, score: { p1, p2 } }),
    setWinner: (s, winner) => ({ ...s, winner }),
    setReceiver: (s, receiver) => ({ ...s, receiver }),
    setPaddleCy: (s, side, cy) => paddle(s, side, { cy }),
    setPaddleVy: (s, side, drivenVy) => paddle(s, side, { drivenVy }),
    setPaddleDriven: (s, side, driven) => paddle(s, side, { driven }),
    setBallPosition: (s, x, y) => ball(s, { x, y }),
    setBallVelocity: (s, vx, vy) => ball(s, { vx, vy }),
    setBallSpin: (s, spin) => ball(s, { spin }),
    setBallHeld: (s, held) => ball(s, { held }),
    setBallHoldTimer: (s, holdTimer) => ball(s, { holdTimer }),
    setBallServeSign: (s, serveSign) => ball(s, { serveSign }),
    drawBallServeSign: (s) => ball(s, { serveSign: drawSign() }),
    setAiTracking: (s, tracking) => ({ ...s, ai: { ...s.ai, tracking } }),
    setAiMovement: (s, movement) => ({ ...s, ai: { ...s.ai, movement } }),
    setMuted: (s, muted) => ({ ...s, muted }),
    setObstacleClock: (s, t) => poses(s, t),
    setObstacleClockRunning: (s, obstacleClockRunning) => ({
      ...s,
      obstacleClockRunning,
    }),
    snapshot: (s) =>
      structuredClone({
        version: CAROM_DEBUG_VERSION,
        screen: s.screen,
        mode: s.mode,
        menuIndex: s.menuIndex,
        titleIndex: s.titleIndex,
        resumeScreen: s.resumeScreen,
        score: s.score,
        winner: s.winner,
        muted: s.muted,
        paddles: s.paddles,
        ai: s.ai,
        receiver: s.receiver,
        obstacles: s.obstacles,
        obstacleClock: s.obstacleClock,
        obstacleClockRunning: s.obstacleClockRunning,
        simTime: s.simTime,
        ball: s.ball
          ? { ...s.ball, speed: Math.hypot(s.ball.vx, s.ball.vy) }
          : null,
      }),
    menuItemRect,
  };
}
