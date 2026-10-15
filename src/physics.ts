import type { DeepReadonly } from "ts-essentials";
import type { BallState, CaromState, ObstacleState, PaddleState } from "./game";
import * as C from "./constants";
import { clamp } from "./world";
type MovingBall = { -readonly [K in keyof BallState]: BallState[K] };
type Events = Set<C.CueName>;

function paddleContact(
  b: MovingBall,
  p: DeepReadonly<PaddleState>,
  left: boolean,
  events: Events,
): void {
  const x0 = left ? C.P1_X0 : C.P2_X0;
  const x1 = left ? C.P1_X1 : C.P2_X1;
  const y0 = p.cy - C.PADDLE_HALF,
    y1 = p.cy + C.PADDLE_HALF;
  if (
    b.x <= x0 - C.BALL_R ||
    b.x >= x1 + C.BALL_R ||
    b.y <= y0 - C.BALL_R ||
    b.y >= y1 + C.BALL_R
  )
    return;
  const depths = [
    b.x - (x0 - C.BALL_R),
    x1 + C.BALL_R - b.x,
    b.y - (y0 - C.BALL_R),
    y1 + C.BALL_R - b.y,
  ];
  const face = depths.indexOf(Math.min(...depths));
  if (face >= 2) {
    b.y = face === 2 ? y0 - C.BALL_R : y1 + C.BALL_R;
    if ((face === 2 && b.vy > 0) || (face === 3 && b.vy < 0)) {
      b.vy = -b.vy;
      events.add(C.CUES.wallBounce);
    }
    return;
  }
  const theta = clamp((b.y - p.cy) / C.PADDLE_HALF, -1, 1) * C.MAX_BOUNCE_ANGLE;
  const speed = Math.min(Math.hypot(b.vx, b.vy) * C.SPEED_MULT, C.SPEED_CAP);
  b.vx = (left ? 1 : -1) * speed * Math.cos(theta);
  b.vy = speed * Math.sin(theta);
  b.spin = clamp(
    b.spin + p.vy * C.SPIN_FROM_PADDLE,
    -C.SPIN_CLAMP,
    C.SPIN_CLAMP,
  );
  b.x = left ? C.P1_X1 + C.BALL_R : C.P2_X0 - C.BALL_R;
  events.add(C.CUES.paddleHit);
}
function obstacleContact(
  b: MovingBall,
  o: DeepReadonly<ObstacleState>,
  events: Events,
): void {
  const c = Math.cos(o.theta),
    s = Math.sin(o.theta);
  const dx = b.x - o.cx,
    dy = b.y - o.cy;
  const lx = dx * c + dy * s,
    ly = -dx * s + dy * c;
  const qx = clamp(lx, -C.OBSTACLE_HW, C.OBSTACLE_HW),
    qy = clamp(ly, -C.OBSTACLE_HH, C.OBSTACLE_HH);
  const dist = Math.hypot(lx - qx, ly - qy);
  if (dist >= C.BALL_R) return;
  let nlx: number, nly: number, push: number;
  if (dist > 0) {
    nlx = (lx - qx) / dist;
    nly = (ly - qy) / dist;
    push = C.BALL_R - dist;
  } else {
    const px = C.OBSTACLE_HW - Math.abs(lx),
      py = C.OBSTACLE_HH - Math.abs(ly);
    nlx = px <= py ? (lx < 0 ? -1 : 1) : 0;
    nly = px > py ? (ly < 0 ? -1 : 1) : 0;
    push = C.BALL_R + Math.min(px, py);
  }
  const nx = nlx * c - nly * s,
    ny = nlx * s + nly * c;
  const dot = b.vx * nx + b.vy * ny;
  if (dot < 0) {
    b.vx -= 2 * dot * nx;
    b.vy -= 2 * dot * ny;
    events.add(C.CUES.obstacleBounce);
  }
  b.x += nx * push;
  b.y += ny * push;
}
/** All contacts in a frame face the same obstacle pose. Only this local copy is mutable. */
export function fly(
  ball: DeepReadonly<BallState>,
  state: DeepReadonly<CaromState>,
  dt: number,
  events: Events,
): BallState {
  const b: MovingBall = { ...ball };
  const n = Math.max(
    1,
    Math.ceil((Math.hypot(b.vx, b.vy) * dt) / C.MAX_SUBSTEP),
  );
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const speed = Math.hypot(b.vx, b.vy);
    if (speed > 0) {
      const angle = (b.spin / speed) * h,
        c = Math.cos(angle),
        s = Math.sin(angle);
      const vx = b.vx * c - b.vy * s;
      b.vy = b.vx * s + b.vy * c;
      b.vx = vx;
    }
    b.spin *= Math.pow(0.5, h / C.SPIN_HALFLIFE);
    b.x += b.vx * h;
    b.y += b.vy * h;
    if (b.y - C.BALL_R < 0 && b.vy < 0) {
      b.y = C.BALL_R;
      b.vy = -b.vy;
      events.add(C.CUES.wallBounce);
    } else if (b.y + C.BALL_R > C.FIELD_H && b.vy > 0) {
      b.y = C.FIELD_H - C.BALL_R;
      b.vy = -b.vy;
      events.add(C.CUES.wallBounce);
    }
    paddleContact(b, state.paddles.left, true, events);
    paddleContact(b, state.paddles.right, false, events);
    for (const o of state.obstacles) obstacleContact(b, o, events);
  }
  return b;
}
