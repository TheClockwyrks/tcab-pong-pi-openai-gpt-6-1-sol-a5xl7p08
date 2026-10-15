import type { DeepReadonly } from "ts-essentials";
import type { RenderApi } from "@clockwyrks/simple-2d";
import type { CaromState } from "./game";
import * as C from "./constants";
import { items, menuItemRect } from "./menus";
const INK = "#edf3e9",
  DIM = "#73878e",
  LINE = "#23343c";
const LIME = "#d5f879",
  CORAL = "#ff8e78",
  BLUE = "#79c8dc";
type Context = CanvasRenderingContext2D;
function text(
  ctx: Context,
  value: string,
  x: number,
  y: number,
  size = 14,
  color = INK,
  align: CanvasTextAlign = "left",
  weight = 500,
): void {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${size <= 15 ? "monospace" : "Arial, sans-serif"}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(value, x, y);
}
function line(
  ctx: Context,
  x: number,
  y: number,
  x1: number,
  y1: number,
  color = LINE,
  width = 1,
): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}
function bar(
  ctx: Context,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  r = 7,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}
function dot(
  ctx: Context,
  x: number,
  y: number,
  r: number,
  color: string,
): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}
function background(ctx: Context): void {
  ctx.fillStyle = "#0b1219";
  ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
  for (let x = 30; x < C.FIELD_W; x += 40)
    for (let y = 30; y < C.FIELD_H; y += 40) dot(ctx, x, y, 0.7, "#1c2931");
}
function mark(ctx: Context, x: number, y: number): void {
  line(ctx, x - 6, y, x + 6, y, "#3b535d");
  line(ctx, x, y - 6, x, y + 6, "#3b535d");
}
function footer(ctx: Context, s: DeepReadonly<CaromState>): void {
  line(ctx, 64, 665, 1216, 665);
  text(ctx, "CAROM  /  PADDLE DUEL", 64, 691, 11, DIM);
  text(ctx, "W S / ↑ ↓   MOVE     ENTER   SELECT", 640, 691, 11, DIM, "center");
  text(
    ctx,
    s.muted ? "M  SOUND OFF" : "M  SOUND ON",
    1216,
    691,
    11,
    s.muted ? CORAL : DIM,
    "right",
  );
}
function menu(ctx: Context, s: DeepReadonly<CaromState>): void {
  items(s).forEach((label, i) => {
    const r = menuItemRect(s, i);
    if (!r) return;
    const active = i === s.menuIndex;
    bar(ctx, r.x, r.y, r.w, r.h, active ? LIME : "#111e26", 5);
    if (!active) {
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    }
    text(
      ctx,
      `0${i + 1}`,
      r.x + 20,
      r.y + r.h / 2,
      11,
      active ? "#46552e" : DIM,
    );
    text(
      ctx,
      label,
      r.x + 62,
      r.y + r.h / 2,
      18,
      active ? "#14201c" : INK,
      "left",
      700,
    );
    text(
      ctx,
      active ? "↗" : "→",
      r.x + r.w - 25,
      r.y + r.h / 2,
      24,
      active ? "#14201c" : DIM,
      "center",
    );
  });
}
function hero(ctx: Context): void {
  const x = 620,
    y = 146,
    w = 584,
    h = 444;
  bar(ctx, x, y, w, h, "#0f1c24", 16);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 18, y + 18, w - 36, h - 36);
  ctx.setLineDash([5, 10]);
  line(ctx, x + w / 2, y + 18, x + w / 2, y + h - 18, LINE);
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2, 68, 0, Math.PI * 2);
  ctx.strokeStyle = LINE;
  ctx.stroke();
  for (const [px, py, a] of [
    [813, 285, -0.45],
    [1012, 452, -0.45],
  ]) {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a);
    bar(ctx, -7, -51, 14, 102, BLUE, 5);
    ctx.restore();
    dot(ctx, px, py, 3, "#0b1219");
  }
  bar(ctx, x + 32, y + 224, 12, 83, LIME, 6);
  bar(ctx, x + w - 44, y + 136, 12, 83, CORAL, 6);
  ctx.beginPath();
  ctx.moveTo(669, 398);
  ctx.bezierCurveTo(750, 432, 800, 413, 862, 371);
  ctx.bezierCurveTo(905, 338, 935, 299, 1019, 311);
  ctx.strokeStyle = "#607344";
  ctx.lineWidth = 3;
  ctx.setLineDash([5, 7]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(889, 350);
  ctx.bezierCurveTo(934, 307, 977, 302, 1019, 311);
  ctx.strokeStyle = LIME;
  ctx.lineWidth = 4;
  ctx.stroke();
  dot(ctx, 1019, 311, 21, "#d5f87915");
  dot(ctx, 1019, 311, 10, INK);
  text(ctx, "+ SPIN", 974, 271, 11, LIME);
  text(ctx, "01", x + 31, y + 40, 12, LIME);
  text(ctx, "02", x + w - 31, y + h - 40, 12, CORAL, "right");
  text(
    ctx,
    "DEFLECT. CURVE. REPEAT.",
    x + w / 2,
    y + h + 31,
    12,
    DIM,
    "center",
  );
  mark(ctx, x - 12, y - 12);
  mark(ctx, x + w + 12, y + h + 12);
}
function title(ctx: Context, s: DeepReadonly<CaromState>): void {
  text(ctx, "C /", 64, 57, 23, LIME, "left", 800);
  text(ctx, "AN EXERCISE IN ANGLES", 1216, 57, 12, DIM, "right");
  line(ctx, 64, 86, 1216, 86);
  text(ctx, "NOT A STRAIGHT SHOT.", 110, 168, 12, LIME);
  text(ctx, C.TITLE_TEXT, 102, 245, 105, INK, "left", 900);
  text(ctx, "A little motion. A different trajectory.", 110, 316, 18, DIM);
  menu(ctx, s);
  hero(ctx);
  text(ctx, "01 HUMAN vs MACHINE     02 LOCAL DUEL", 110, 594, 11, DIM);
  footer(ctx, s);
}
function field(ctx: Context, s: DeepReadonly<CaromState>): void {
  ctx.setLineDash([7, 12]);
  line(ctx, C.NET_X, 110, C.NET_X, C.FIELD_H - 38, LINE, 2);
  ctx.setLineDash([]);
  line(ctx, 0, 2, C.FIELD_W, 2, "#39505b", 3);
  line(ctx, 0, C.FIELD_H - 2, C.FIELD_W, C.FIELD_H - 2, "#39505b", 3);
  for (const x of [C.P1_X1 + 23, C.P2_X0 - 23]) {
    line(ctx, x, 17, x, 37, LINE);
    line(ctx, x, C.FIELD_H - 17, x, C.FIELD_H - 37, LINE);
  }
  text(
    ctx,
    s.mode === "solo" ? "01 / YOU" : "01 / PLAYER ONE",
    100,
    43,
    12,
    LIME,
  );
  text(
    ctx,
    s.mode === "solo" ? "CPU / MACHINE" : "02 / PLAYER TWO",
    1180,
    43,
    12,
    CORAL,
    "right",
  );
  text(
    ctx,
    String(s.score.p1).padStart(2, "0"),
    542,
    62,
    62,
    LIME,
    "center",
    700,
  );
  text(
    ctx,
    String(s.score.p2).padStart(2, "0"),
    738,
    62,
    62,
    CORAL,
    "center",
    700,
  );
  text(
    ctx,
    s.mode === "solo" ? "SOLO" : "VERSUS",
    C.FIELD_CX,
    34,
    10,
    DIM,
    "center",
  );
  text(ctx, `FIRST TO ${C.WIN_SCORE}`, C.FIELD_CX, 80, 9, DIM, "center");
  for (const side of ["left", "right"] as const) {
    const p = s.paddles[side],
      x = side === "left" ? C.P1_X0 : C.P2_X0,
      color = side === "left" ? LIME : CORAL;
    bar(
      ctx,
      x - 5,
      p.cy - C.PADDLE_HALF - 4,
      C.PADDLE_W + 10,
      C.PADDLE_H + 8,
      `${color}0a`,
    );
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 13;
    bar(ctx, x, p.cy - C.PADDLE_HALF, C.PADDLE_W, C.PADDLE_H, color);
    ctx.restore();
    line(ctx, x + 5, p.cy - 12, x + 5, p.cy + 12, "#ffffff70", 2);
  }
  for (const o of s.obstacles) {
    ctx.save();
    ctx.translate(o.cx, o.cy);
    ctx.rotate(o.theta);
    bar(
      ctx,
      -C.OBSTACLE_HW - 5,
      -C.OBSTACLE_HH - 5,
      C.OBSTACLE_W + 10,
      C.OBSTACLE_H + 10,
      "#79c8dc0a",
    );
    bar(
      ctx,
      -C.OBSTACLE_HW,
      -C.OBSTACLE_HH,
      C.OBSTACLE_W,
      C.OBSTACLE_H,
      BLUE,
      6,
    );
    dot(ctx, 0, 0, 3, "#263d48");
    line(ctx, -4, -C.OBSTACLE_HH + 11, 4, -C.OBSTACLE_HH + 11, "#e3faff", 2);
    ctx.restore();
  }
  const b = s.ball;
  if (b) {
    const trail = b.trail;
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1],
        p = trail[i];
      const alpha = Math.max(0, 1 - (s.simTime - p.t) / C.TRAIL_TIME);
      ctx.globalAlpha = alpha * 0.5;
      ctx.lineCap = "round";
      line(ctx, a.x, a.y, p.x, p.y, INK, 2 + alpha * C.BALL_R);
      ctx.globalAlpha = 1;
    }
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#e9f5d9";
    dot(ctx, b.x, b.y, C.BALL_R, INK);
    ctx.restore();
    if (s.screen === "countdown") {
      text(ctx, "GET READY", C.FIELD_CX, 253, 12, LIME, "center");
      text(
        ctx,
        `${s.receiver === "left" ? "←" : "→"}  SERVING ${s.receiver === "left" ? "LEFT" : "RIGHT"}`,
        C.FIELD_CX,
        280,
        11,
        DIM,
        "center",
      );
      ctx.beginPath();
      ctx.arc(
        b.x,
        b.y,
        27,
        -Math.PI / 2,
        -Math.PI / 2 + (Math.PI * 2 * Math.max(0, b.holdTimer)) / C.HOLD_TIME,
      );
      ctx.strokeStyle = LIME;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  text(ctx, "P / ESC  PAUSE", 100, 690, 10, DIM);
  text(
    ctx,
    s.muted ? "M  SOUND OFF" : "M  SOUND ON",
    1180,
    690,
    10,
    DIM,
    "right",
  );
  text(ctx, "C / CAROM", C.FIELD_CX, 690, 10, DIM, "center");
}
function howto(ctx: Context, s: DeepReadonly<CaromState>): void {
  text(ctx, "C / FIELD NOTES", 64, 57, 16, LIME, "left", 700);
  text(
    ctx,
    "THE RULES ARE SIMPLE. THE ANGLES AREN’T.",
    1216,
    57,
    11,
    DIM,
    "right",
  );
  line(ctx, 64, 86, 1216, 86);
  text(ctx, "Make your own angle.", 85, 153, 44, INK, "left", 800);
  text(
    ctx,
    `First to ${C.WIN_SCORE}. Win by ${C.WIN_LEAD}. Put the ball past the other paddle.`,
    85,
    210,
    18,
    DIM,
  );
  const cards = [
    {
      x: 85,
      n: "01",
      title: "TAKE CONTROL",
      color: LIME,
      lines: [
        "SOLO   W / S or ↑ / ↓",
        "VERSUS   Left: W / S",
        "         Right: ↑ / ↓",
        "Touch: use the side sliders.",
      ],
    },
    {
      x: 462,
      n: "02",
      title: "BEND THE RALLY",
      color: CORAL,
      lines: [
        "Move your paddle at contact",
        "to put spin on the ball.",
        "Hit near an edge for an angle.",
        "Keep moving. Keep them guessing.",
      ],
    },
    {
      x: 839,
      n: "03",
      title: "PLAY THE BANK",
      color: BLUE,
      lines: [
        "The blue bars sway and rotate.",
        "Their tilted faces reflect",
        "your shot into new directions.",
        "Use the walls. Find a way through.",
      ],
    },
  ];
  for (const card of cards) {
    bar(ctx, card.x, 266, 356, 258, "#111e26", 8);
    text(ctx, card.n, card.x + 23, 300, 13, card.color);
    text(ctx, card.title, card.x + 23, 344, 20, INK, "left", 700);
    card.lines.forEach((v, i) =>
      text(ctx, v, card.x + 23, 391 + i * 30, 13, DIM),
    );
  }
  text(
    ctx,
    "P / ESC  Pause & resume     M  Toggle sound     ENTER / SPACE  Confirm",
    C.FIELD_CX,
    559,
    12,
    DIM,
    "center",
  );
  menu(ctx, s);
}
export function render(s: DeepReadonly<CaromState>, api: RenderApi): void {
  const ctx = api.ctx;
  background(ctx);
  if (s.screen === "title") {
    title(ctx, s);
    return;
  }
  if (s.screen === "howto") {
    howto(ctx, s);
    return;
  }
  field(ctx, s);
  if (s.screen === "paused" || s.screen === "matchover") {
    ctx.fillStyle = "#070d14d9";
    ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
    bar(ctx, 390, 160, 500, 440, "#101c24", 12);
    text(
      ctx,
      s.screen === "paused" ? "TIME OUT" : "MATCH COMPLETE",
      C.FIELD_CX,
      203,
      12,
      LIME,
      "center",
    );
    text(
      ctx,
      s.screen === "paused"
        ? "Paused."
        : s.winner === "left"
          ? "LEFT WINS."
          : "RIGHT WINS.",
      C.FIELD_CX,
      267,
      48,
      INK,
      "center",
      800,
    );
    text(
      ctx,
      s.screen === "paused"
        ? "Take a breath. Find your next angle."
        : `${s.score.p1}  —  ${s.score.p2}   /   ${s.mode === "solo" ? "SOLO" : "VERSUS"}`,
      C.FIELD_CX,
      321,
      16,
      DIM,
      "center",
    );
    menu(ctx, s);
    footer(ctx, s);
  }
}
