import type { DeepReadonly } from "ts-essentials";
import type { UpdateApi } from "@clockwyrks/simple-2d";
import type { CaromState, PaddleState, Side } from "./game";
import * as C from "./constants";
import { clamp, park, poses } from "./world";
import { readInput } from "./menus";
import { fly } from "./physics";

function move(
  p: DeepReadonly<PaddleState>,
  vy: number,
  dt: number,
): PaddleState {
  const raw = p.cy + vy * dt;
  const cy = clamp(raw, C.PADDLE_MIN_CY, C.PADDLE_MAX_CY);
  return { ...p, cy, vy: cy !== raw && dt > 0 ? (cy - p.cy) / dt : vy };
}
function paddles(
  s: DeepReadonly<CaromState>,
  api: UpdateApi,
  dt: number,
): CaromState["paddles"] {
  const held = (name: C.ActionName): boolean => api.input.value(name) > 0;
  const up = held("p1-up") || (s.mode === "solo" && held("p2-up"));
  const down = held("p1-down") || (s.mode === "solo" && held("p2-down"));
  const left = s.paddles.left,
    right = s.paddles.right;
  let rvy = (Number(held("p2-down")) - Number(held("p2-up"))) * C.PADDLE_SPEED;
  if (s.mode === "solo") {
    const defending =
      s.ai.tracking && s.screen === "playing" && s.ball && s.ball.vx > 0;
    const target =
      defending && s.ball ? s.ball.y - s.ball.vy * C.AI_REACT : C.AI_HOME_Y;
    const diff = target - right.cy;
    const deadzone = defending ? C.AI_DEADZONE : C.AI_HOME_DEADZONE;
    rvy =
      !s.ai.movement || Math.abs(diff) <= deadzone || dt === 0
        ? 0
        : Math.sign(diff) * Math.min(C.AI_SPEED, Math.abs(diff) / dt);
  }
  return {
    left: move(
      left,
      left.driven
        ? left.drivenVy
        : (Number(down) - Number(up)) * C.PADDLE_SPEED,
      dt,
    ),
    right: move(right, right.driven ? right.drivenVy : rvy, dt),
  };
}
export function update(
  state: DeepReadonly<CaromState>,
  api: UpdateApi,
  dt: number,
): CaromState {
  let s = readInput(state, api);
  s = { ...s, simTime: state.simTime + dt, muted: api.audio.muted() };
  if (s.screen !== "countdown" && s.screen !== "playing") return s;
  s = { ...s, paddles: paddles(s, api, dt) };
  const events = new Set<C.CueName>();
  let ball = s.ball;
  if (ball) {
    if (s.screen === "countdown") {
      const holdTimer = Math.max(0, ball.holdTimer - dt);
      ball = { ...ball, holdTimer };
      if (holdTimer <= 0) {
        ball = {
          ...ball,
          held: false,
          vx:
            (s.receiver === "left" ? -1 : 1) *
            C.SERVE_SPEED *
            Math.cos(C.SERVE_ANGLE),
          vy: ball.serveSign * C.SERVE_SPEED * Math.sin(C.SERVE_ANGLE),
          trail: [],
        };
        s = { ...s, screen: "playing" };
      }
    } else if (!ball.held) ball = fly(ball, s, dt, events);
    ball = {
      ...ball,
      trail: [
        ...ball.trail.filter((p) => s.simTime - p.t <= C.TRAIL_TIME),
        { x: ball.x, y: ball.y, t: s.simTime },
      ],
    };
    s = { ...s, ball };
    const scorer: Side | null =
      ball.x - C.BALL_R > C.FIELD_W
        ? "left"
        : ball.x + C.BALL_R < 0
          ? "right"
          : null;
    if (scorer) {
      const score = {
        ...s.score,
        [scorer === "left" ? "p1" : "p2"]:
          s.score[scorer === "left" ? "p1" : "p2"] + 1,
      };
      const won =
        (score.p1 >= C.WIN_SCORE && score.p1 - score.p2 >= C.WIN_LEAD) ||
        (score.p2 >= C.WIN_SCORE && score.p2 - score.p1 >= C.WIN_LEAD);
      s = {
        ...s,
        score,
        ...(won
          ? { screen: "matchover" as const, winner: scorer, menuIndex: 0 }
          : {
              screen: "countdown" as const,
              receiver:
                scorer === "left" ? ("right" as const) : ("left" as const),
              ball: park(),
            }),
      };
      events.add(C.CUES.score);
    }
  }
  if (s.obstacleClockRunning) s = poses(s, s.obstacleClock + dt);
  for (const cue of events) api.audio.play(cue);
  return s;
}
