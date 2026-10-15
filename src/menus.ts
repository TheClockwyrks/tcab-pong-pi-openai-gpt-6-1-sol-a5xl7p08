import type { DeepReadonly } from "ts-essentials";
import type { UpdateApi } from "@clockwyrks/simple-2d";
import type { CaromState } from "./game";
import {
  ACTIONS,
  TITLE_ITEMS,
  PAUSE_ITEMS,
  MATCHOVER_ITEMS,
} from "./constants";
import { home, start } from "./world";
export interface MenuRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export function items(s: DeepReadonly<CaromState>): readonly string[] {
  switch (s.screen) {
    case "title":
      return TITLE_ITEMS;
    case "paused":
      return PAUSE_ITEMS;
    case "matchover":
      return MATCHOVER_ITEMS;
    case "howto":
      return ["BACK TO MENU"];
    default:
      return [];
  }
}
export function menuItemRect(
  s: DeepReadonly<CaromState>,
  index: number,
): MenuRect | null {
  if (index < 0 || index >= items(s).length || !Number.isInteger(index))
    return null;
  const y = s.screen === "howto" ? 597 : s.screen === "title" ? 355 : 367;
  return {
    x: s.screen === "title" ? 110 : 440,
    y: y + index * 68,
    w: s.screen === "title" ? 380 : 400,
    h: 56,
  };
}
function confirm(s: DeepReadonly<CaromState>): CaromState {
  if (s.screen === "title") {
    const next = { ...s, titleIndex: s.menuIndex };
    return s.menuIndex === 2
      ? { ...next, screen: "howto", menuIndex: 0 }
      : start(next, s.menuIndex === 0 ? "solo" : "versus");
  }
  if (s.screen === "howto") return home(s);
  if (s.screen === "paused")
    return s.menuIndex === 0
      ? { ...s, screen: s.resumeScreen }
      : s.menuIndex === 1
        ? start(s)
        : home(s);
  if (s.screen === "matchover") return s.menuIndex === 0 ? start(s) : home(s);
  return s;
}
export function readInput(
  state: DeepReadonly<CaromState>,
  api: UpdateApi,
): CaromState {
  const edges = Object.fromEntries(
    ACTIONS.map((a) => [a, api.input.pressed(a)]),
  );
  const samples = api.input.pointerSamples();
  api.input.pointer();
  const contacts = api.input.pointerContacts();
  let s: CaromState = { ...state };
  if (edges.mute) s = { ...s, muted: !s.muted };
  api.audio.setMuted(s.muted);
  if (s.screen === "playing" || s.screen === "countdown") {
    return edges.pause
      ? {
          ...s,
          resumeScreen: s.screen,
          screen: "paused",
          menuIndex: 0,
          menuPresses: {},
        }
      : s;
  }
  if (s.screen === "paused" && (edges.pause || edges.back))
    return { ...s, screen: s.resumeScreen, menuPresses: {} };
  if ((s.screen === "howto" || s.screen === "matchover") && edges.back)
    return home(s);
  const count = items(s).length;
  const up = edges["p1-up"] || edges["p2-up"];
  const down = edges["p1-down"] || edges["p2-down"];
  const moved = (up || down) && s.screen !== "howto";
  let keyboardConfirmed = false;
  if (moved)
    s = { ...s, menuIndex: (s.menuIndex + (up ? -1 : 1) + count) % count };
  else if (edges.confirm) {
    s = confirm(s);
    keyboardConfirmed = true;
  }
  if (s.screen !== state.screen || keyboardConfirmed)
    return { ...s, menuPresses: {} };
  const hit = (x: number, y: number): number => {
    for (let i = 0; i < count; i++) {
      const r = menuItemRect(s, i);
      if (r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)
        return i;
    }
    return -1;
  };
  const presses = { ...s.menuPresses };
  let activate = false;
  for (const p of samples) {
    const index = hit(p.x, p.y);
    if (index >= 0) s = { ...s, menuIndex: index };
    if (p.type === "down") presses[p.id] = index;
    if (p.type === "up") {
      if (index >= 0 && presses[p.id] === index) activate = true;
      delete presses[p.id];
    }
  }
  for (const p of contacts) {
    const index = hit(p.x, p.y);
    if (index >= 0) s = { ...s, menuIndex: index };
  }
  s = { ...s, menuPresses: presses };
  return activate ? { ...confirm(s), menuPresses: {} } : s;
}
