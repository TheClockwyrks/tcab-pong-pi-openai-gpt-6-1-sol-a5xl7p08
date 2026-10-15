import type { InitApi } from "@clockwyrks/simple-2d";
import type { CaromState } from "./game";
import { createDebug } from "./debug";
import type { CaromDebugApi } from "./debug";
import * as C from "./constants";
import { initial } from "./world";
export function initialize(
  api: InitApi<CaromState>,
): [CaromState, CaromDebugApi] {
  for (const name of C.ACTIONS)
    api.input.register(name, { keys: [...C.BINDINGS[name]] });
  api.audio.define(C.CUES.paddleHit, {
    wave: "triangle",
    freq: 540,
    freqTo: 290,
    durationMs: 85,
    gain: 0.23,
  });
  api.audio.define(C.CUES.wallBounce, {
    wave: "sine",
    freq: 270,
    freqTo: 170,
    durationMs: 65,
    gain: 0.18,
  });
  api.audio.define(C.CUES.obstacleBounce, {
    wave: "sine",
    freq: 880,
    freqTo: 460,
    durationMs: 110,
    gain: 0.2,
  });
  api.audio.define(C.CUES.score, {
    wave: "triangle",
    freq: 330,
    freqTo: 660,
    durationMs: 240,
    gain: 0.24,
  });
  api.diagnostics.register("screen", (s) => s.screen);
  api.diagnostics.register("mode", (s) => s.mode);
  api.diagnostics.register("score", (s) => `${s.score.p1} : ${s.score.p2}`);
  api.diagnostics.register("ball position", (s) =>
    s.ball ? `${s.ball.x.toFixed(1)}, ${s.ball.y.toFixed(1)}` : "none",
  );
  api.diagnostics.register("ball velocity", (s) =>
    s.ball ? `${s.ball.vx.toFixed(1)}, ${s.ball.vy.toFixed(1)}` : "none",
  );
  api.diagnostics.register("ball speed", (s) =>
    s.ball ? Math.hypot(s.ball.vx, s.ball.vy) : "none",
  );
  api.diagnostics.register("spin", (s) => s.ball?.spin ?? "none");
  for (const side of ["left", "right"] as const) {
    api.diagnostics.register(`${side} cy`, (s) => s.paddles[side].cy);
    api.diagnostics.register(`${side} vy`, (s) => s.paddles[side].vy);
  }
  return [initial(), createDebug()];
}
