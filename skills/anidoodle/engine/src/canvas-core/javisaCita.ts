import { Gfx, rng, type Ctx, type Env, type Medium, type P } from "./core";
import type { Film } from "./film";
import { bounds, mix, smooth } from "./gallery";
import { line, type Piece as Score } from "./music/plan";
import { renderPiece } from "./music/render";
import { diamondPrint, dotPrint, gouache, print, shadeSide, woodPrint } from "./paperCraftKit";
import { advance, fibres, glyph, measure, onGrid, path, scissor, tear, type Face } from "./scrapbookKit";

// TU WEB, TU CITA · toy-theatre paper collage for Javisa, stop-motion on twos, 9:16.
//
// MEDIUM, physically. A card toy theatre stood upright on a kraft table: a teal proscenium in
// diamond-printed card with a JAVISA cartouche, a wood-print floor, a plain sugar-paper back wall.
// Every prop is card with a darker cut edge, standing a finger's width off the flat behind it and
// throwing a soft shadow whose spread is that gap. Three papers: printed papers (form paper for the
// Reservar ticket, the calendar and the time chips; printed glass for the phone), sugar papers (the
// torn chat bubbles, the stub URL sign, the cream drop, the green blotter) and gouache cut-outs with
// a white sticker margin (the hand, the appointment card, the check, the ring, the domain plate).
// MARK / EDGE / ORDER. Mark: the gouache stroke and the printed motif, never a drawn line; lettering
// is printed stroke type. Edge: scissor or torn, then the card edge, then the sticker margin. Order:
// the theatre is on the table from frame 0; every scene is built back to front by hand.
// STORY. The appointment card is the object. Hook: it lands in a crowded chat and slips off the
// phone into the wing; the torn bubbles flutter down and the stage is empty. Landing: a cream drop is
// flown in, a storefront with its brand and services is slid on, a Reservar ticket rises from the
// floor and a customer's finger presses its gold button. Domain: a limp stub-URL sign is lowered, yanked away, and a tudominio.cl plate on a stick
// docks on the fascia. Booking: on a blotter, a ring picks a time, the card comes back from the wing
// into a painted slot and is checked. Close: the blotter lifts, and storefront, plate and the
// checked card stand together.
// REFERENCE, from memory: Pollock's and Webb's Victorian toy theatres (proscenium, wings, flown
// drops, ground rows); a right hand holding a phone seen from the screen side (four fingertips
// wrapped over the left edge, the thumb over the right, the heel of the palm and the wrist below).
// MOTION GRAMMAR. Every pose is held two frames. A piece travels held high (shadow wide), lands, a
// damped jiggle, still; an exit accelerates away and never lands. Paint never moves. Light: upper left.

const W = 1080, H = 1920, FPS = 30, BPM = 120, N = 600;
// ---------------------------------------------------------------- the cue table: every frame number of the film
const S = [0, 120, 240, 360, 480, N];
const CUE = {
  hook: { bubbles: [0, 10, 20, 30], card: 45, slip: 60, out: 90, flutter: 5 },
  landing: { drop: 120, store: 140, services: 175, ticket: 195, tap: 220, press: 235, away: 245 },
  domain: { sign: 240, yank: 270, plate: 280 },
  agenda: { ring: 375, card: 390, check: 425, tag: 445 },
  close: { lift: 480, caption: 485, card: 500, buttons: [515, 525], still: 535 },
  caption: { in: 5 },
};

const PEN: Medium = { nib: 1, taper: 0.3, pressure: 0.3, retrace: false, wobble: 0.4, rough: 0.3 };
const WHITE = "#fbf9f2", KRAFT = "#b8905f", TEAL = "#2f6f73", GOLD = "#e1b54a", RED = "#b8302c", CREAM = "#f4ead2", INK = "#2a2320", NAVY = "#1f3550", SKIN = "#e3a57f", SKIN_SH = "#b5724f", SKIN_EDGE = "#b87a58";
const OPEN = { x0: 130, y0: 340, x1: 950, y1: 1400 }, BOX = { x0: 60, y0: 250, x1: 1020, y1: 1520 }, FLOOR = 1260;
const TXT: Face = { weight: 0.16, cap: "round", join: "round", track: 1.5 };
const PENCIL: Face = { weight: 0.09, cap: "round", join: "round", track: 1.2, slant: 0.12 };

// ---------------------------------------------------------------- shapes and printed type
const bx = (x0: number, y0: number, x1: number, y1: number): P[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const rr = (x0: number, y0: number, x1: number, y1: number, r: number): P[] => { const pts: P[] = []; ([[x1 - r, y0 + r, -Math.PI / 2], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, Math.PI / 2], [x0 + r, y0 + r, Math.PI]] as const).forEach(([cx, cy, a0]) => { for (let k = 0; k <= 6; k++) { const a = a0 + (k / 6) * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } }); return pts; };
const oval = (cx: number, cy: number, rx: number, ry: number, n = 28): P[] => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as P; });
// a ticket stub: a rectangle with a half-round notch bitten from each short side
const stub = (cx: number, cy: number, w: number, h: number, n = 16): P[] => { const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, pts: P[] = [[x0, y0], [x1, y0]]; for (let k = 0; k <= 8; k++) { const a = -Math.PI / 2 + (k / 8) * Math.PI; pts.push([x1 - Math.cos(a) * n, cy + Math.sin(a) * n]); } pts.push([x1, y1], [x0, y1]); for (let k = 0; k <= 8; k++) { const a = Math.PI / 2 + (k / 8) * Math.PI; pts.push([x0 - Math.cos(a) * n, cy + Math.sin(a) * n]); } return pts; };
const words = (c: Ctx, text: string, cx: number, cy: number, cap: number, color: string, face = TXT) => { let x = cx - measure(text, cap, face) / 2; for (const ch of text) { if (ch !== " ") glyph(c, ch, x, cy - cap / 2, cap, face, color); x += advance(ch, face) * (cap / 6); } };

// ---------------------------------------------------------------- pieces moved by hand
// mv = [frame, frames, offset, exit]: travel from the current offset to `offset`; an exit accelerates
// and never lands. Before `show` the piece is not on the table. clip false = outside the theatre box.
type Mv = [at: number, dur: number, to: P, exit?: boolean];
// a hung piece swinging on its line about `at`; `own` = a flutter about the piece's own pivot as it travels
type Sway = { at: P; amp: number; per: number; from: number; to: number; decay?: number; own?: boolean };
type Piece = { id: string; seed: number; cut: P[][]; face: (c: Ctx) => void; edge: string; depth: number; pivot: P; border?: number; hole?: boolean; clip?: boolean; show?: number; start?: P; mv?: Mv[]; sway?: Sway[] };
type Pose = { dx: number; dy: number; rot: number; lift: number };
const twos = (f: number) => f - (f % 2);
const swayAt = (s: Sway, f: number) => { const f2 = twos(f), t = f2 - s.from; if (t < 0 || f2 >= s.to) return 0; return s.amp * (Math.sin((2 * Math.PI * t) / s.per) + 0.45 * Math.sin((2 * Math.PI * t) / (s.per * 0.37) + 1.3)) * (s.decay ? Math.exp(-t / s.decay) : 1); };
const poseAt = (pc: Piece, f: number): Pose => {
  const f2 = twos(f), sg = pc.seed % 2 ? 1 : -1; let o: P = pc.start ?? [0, 0];
  for (const [at, d, to, exit] of pc.mv ?? []) {
    if (f2 >= at + d) { o = to; continue; }
    if (f2 < at) break;
    const u = (f2 - at) / d, r = rng(pc.seed * 131 + f2), jx = (r() - 0.5) * 1.4, jy = (r() - 0.5) * 1.4;
    if (exit) { const e = u * u; return { dx: o[0] + (to[0] - o[0]) * e + jx, dy: o[1] + (to[1] - o[1]) * e + jy, rot: sg * 0.06 * e, lift: Math.min(1, u * 3) }; }
    if (u < 0.62) { const e = 1 - (1 - u / 0.62) ** 2; return { dx: o[0] + (to[0] - o[0]) * e + jx, dy: o[1] + (to[1] - o[1]) * e + jy, rot: sg * 0.04 * (1 - e), lift: 1 - 0.6 * e }; }
    const v = (u - 0.62) / 0.38, damp = Math.exp(-4 * v) * (1 - v);
    return { dx: to[0], dy: to[1] - 2.2 * Math.abs(Math.sin(v * 9)) * damp, rot: sg * 0.035 * Math.sin(v * 13 + 0.6) * damp, lift: 0.4 * (1 - v) };
  }
  return { dx: o[0], dy: o[1], rot: 0, lift: 0 };
};
const cutPath = (c: Ctx, pc: Piece, dx = 0, dy = 0) => { c.save(); c.translate(dx, dy); c.beginPath(); pc.cut.forEach((s) => { s.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); }); c.fill(pc.hole ? "evenodd" : "nonzero"); if (pc.border) { c.lineJoin = "round"; c.lineWidth = 2 * pc.border; c.strokeStyle = c.fillStyle; c.stroke(); } c.restore(); };
const drawPiece = (ctx: Ctx, env: Env, pc: Piece, f: number) => {
  if (pc.show !== undefined && f < pc.show) return;
  const q = poseAt(pc, f), b = bounds(pc.cut.flat()), clip = pc.clip !== false, R = clip ? BOX : { x0: 0, y0: 0, x1: W, y1: H };
  if (b.x1 + q.dx < R.x0 || b.x0 + q.dx > R.x1 || b.y1 + q.dy < R.y0 || b.y0 + q.dy > R.y1) return;
  let sw = 0, rot = q.rot, at: P | null = null;
  for (const s of pc.sway ?? []) { const a = swayAt(s, f); if (s.own) rot += a; else { sw += a; at = s.at; } }
  const xf = (c: Ctx) => { if (sw && at) { c.translate(at[0], at[1]); c.rotate(sw); c.translate(-at[0], -at[1]); } c.translate(pc.pivot[0] + q.dx, pc.pivot[1] + q.dy); c.rotate(rot); c.translate(-pc.pivot[0], -pc.pivot[1]); };
  const box = (c: Ctx) => { if (!clip) return; c.beginPath(); c.rect(BOX.x0, BOX.y0, BOX.x1 - BOX.x0, BOX.y1 - BOX.y0); c.clip(); };
  const g = new Gfx(ctx, env, 0, PEN), sd = pc.depth * (1 + 2.2 * q.lift);
  g.group("plain", () => { const c = g.cur; c.save(); box(c); xf(c); c.fillStyle = "#2a1c10"; cutPath(c, pc, sd * 0.6, sd); c.restore(); const m = (pc.border ?? 0) + sd * 2 + 80; g.touch(b.x0 + q.dx - m, b.y0 + q.dy - m, b.x1 + q.dx + m, b.y1 + q.dy + m); }, { blur: 2 + sd * 0.5, alpha: 0.36 - 0.1 * q.lift });
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.save(); box(ctx); xf(ctx);
  ctx.fillStyle = pc.edge; cutPath(ctx, pc, 1.2, 1.9);
  if (pc.border) { ctx.fillStyle = WHITE; cutPath(ctx, pc); }
  pc.face(ctx); ctx.restore();
};
const withClip = (c: Ctx, shape: P[], fn: () => void) => { c.save(); path(c, shape); c.clip(); fn(); c.restore(); };

// ---------------------------------------------------------------- the appointment card (gouache on card, sticker margin)
const card = (id: string, seed: number, cx: number, cy: number, s: number, show: number, start: P, mv: Mv[], checked = false, sway?: Sway[]): Piece => {
  const w = 170 * s, h = 110 * s, sh = scissor(rr(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, 10 * s), seed, 0.5), tick = oval(cx + w * 0.4, cy - h * 0.42, 17 * s, 17 * s, 20), cut = checked ? [sh, tick] : [sh];
  return { id, seed, cut, border: 5, edge: "#c9b99a", depth: 7, pivot: [cx, cy], show, start, mv, sway,
    face: (c) => { gouache(c, sh, "#f7efdd", seed + 1, { len: 20 * s, w: 7 * s, vary: 0.05 });
      withClip(c, sh, () => gouache(c, bx(cx - w / 2, cy - h / 2, cx + w / 2, cy - h / 2 + h * 0.3), RED, seed + 2, { len: 22 * s, w: 7 * s, vary: 0.14 }));
      const kx = cx - w * 0.28, ky = cy + h * 0.16; gouache(c, oval(kx, ky, h * 0.2, h * 0.2), TEAL, seed + 3, { len: 10 * s, w: 4 * s }); c.strokeStyle = CREAM; c.lineWidth = 2.4 * s; c.lineCap = "round"; c.beginPath(); c.moveTo(kx, ky); c.lineTo(kx, ky - h * 0.14); c.moveTo(kx, ky); c.lineTo(kx + w * 0.08, ky + h * 0.04); c.stroke();
      c.fillStyle = "#6e665a"; c.globalAlpha = 0.6; [0.04, 0.2, 0.34].forEach((k, i) => c.fillRect(cx - w * 0.08, cy + h * k, w * (0.46 - i * 0.1), 3.2 * s)); c.globalAlpha = 1;
      if (checked) { gouache(c, tick, "#5a9a5a", seed + 4, { len: 10 * s, w: 5 * s, vary: 0.12 }); const [x, y] = [cx + w * 0.4, cy - h * 0.42]; c.strokeStyle = WHITE; c.lineWidth = 4.5 * s; c.lineJoin = "round"; c.beginPath(); c.moveTo(x - 8 * s, y + 1 * s); c.lineTo(x - 2 * s, y + 7 * s); c.lineTo(x + 9 * s, y - 6 * s); c.stroke(); } } };
};

// ---------------------------------------------------------------- 1 · hook: the phone, the crowded chat, the card that never arrives
const PH = { x0: 370, y0: 500, x1: 710, y1: 1160 }, OUT1: Mv = [CUE.hook.out, 15, [0, 1300], true];
const TREMOR: Sway = { at: [640, 1560], amp: 0.012, per: 44, from: 0, to: CUE.hook.out };
const PHONE = scissor(rr(PH.x0, PH.y0, PH.x1, PH.y1, 46), 41, 0.5), SCREEN = rr(PH.x0 + 18, PH.y0 + 42, PH.x1 - 18, PH.y1 - 60, 14);
const phone: Piece = { id: "phone", seed: 41, cut: [PHONE], edge: "#0f1216", depth: 6, pivot: [540, 830], mv: [OUT1], sway: [TREMOR],
  face: (c) => { gouache(c, PHONE, "#22282f", 42, { dir: Math.PI / 2, len: 60, w: 14, vary: 0.12 }); gouache(c, SCREEN, "#3a4a58", 43, { dir: -0.6, len: 70, w: 16, vary: 0.06 }); dotPrint(c, SCREEN, "#51667c", 12, 1.4);
    print(c, SCREEN, (b) => { c.fillStyle = "#ffffff"; c.globalAlpha = 0.07; c.beginPath(); c.moveTo(b.x0, b.y0 + 240); c.lineTo(b.x0 + 200, b.y0); c.lineTo(b.x0 + 290, b.y0); c.lineTo(b.x0, b.y0 + 360); c.fill(); });
    c.fillStyle = "#11151a"; c.beginPath(); c.roundRect(505, PH.y0 + 16, 70, 9, 4); c.fill(); c.beginPath(); c.roundRect(500, PH.y1 - 38, 80, 16, 8); c.fill(); } };
// the heel of the palm and the wrist, behind the phone; the thumb over the right edge; four fingertips over the left
const PALM: P[] = smooth([[392, 900], [420, 870], [690, 885], [742, 940], [770, 1120], [850, 1540], [470, 1540], [430, 1300], [392, 1170], [386, 1060]], true, 6);
const palm: Piece = { id: "palm", seed: 51, cut: [PALM], border: 6, edge: SKIN_EDGE, depth: 6, pivot: [540, 1000], mv: [OUT1], sway: [TREMOR],
  face: (c) => { gouache(c, PALM, SKIN, 52, { dir: -1.2, len: 40, w: 12, vary: 0.1 }); shadeSide(c, PALM, SKIN_SH, 53, [1, 0], 70, -1.2);
    const cuff = bx(420, 1400, 900, 1560); withClip(c, PALM, () => { gouache(c, cuff, "#3d6f9e", 54, { len: 30, w: 10 }); dotPrint(c, cuff, "#dfe9f2", 16, 2.2); }); } };
const TIPS: P[][] = [720, 805, 890, 970].map((y, i) => smooth([[398, y - 21], [404, y], [398, y + 21], [346 + i * 4, y + 27], [328 + i * 6, y + 2], [346 + i * 4, y - 26]], true, 5));
const fingers: Piece = { id: "fingers", seed: 55, cut: TIPS, border: 5, edge: SKIN_EDGE, depth: 5, pivot: [370, 850], mv: [OUT1], sway: [TREMOR],
  face: (c) => TIPS.forEach((t, i) => { gouache(c, t, "#e8ad88", 56 + i, { dir: 0, len: 22, w: 8, vary: 0.1 }); shadeSide(c, t, SKIN_SH, 60 + i, [0, 1], 12, 0); }) };
const THUMB: P[] = smooth([[772, 1010], [750, 960], [712, 930], [676, 922], [658, 938], [670, 962], [706, 988], [728, 1032]], true, 6);
const thumb: Piece = { id: "thumb", seed: 65, cut: [THUMB], border: 6, edge: SKIN_EDGE, depth: 5, pivot: [720, 970], mv: [OUT1], sway: [TREMOR],
  face: (c) => { gouache(c, THUMB, "#e8ad88", 66, { dir: -0.6, len: 26, w: 9, vary: 0.1 }); shadeSide(c, THUMB, SKIN_SH, 67, [0, 1], 18, -0.6); c.fillStyle = "#f4d2bc"; c.beginPath(); c.ellipse(675, 940, 12, 8, -0.5, 0, 6.28); c.fill(); } };
// torn sugar-paper bubbles: glued on the glass, then they peel off and flutter down when the phone drops
const bubble = (i: number, x0: number, y0: number, x1: number, y1: number, color: string): Piece => {
  const seed = 71 + i * 3, s = tear(rr(x0, y0, x1, y1, 22), 3.2, seed), show = CUE.hook.bubbles[i], off = CUE.hook.out + i * CUE.hook.flutter;
  return { id: `bubble${i}`, seed, cut: [s], edge: mix(color, "#3a2e22", 0.35), depth: 4, pivot: [(x0 + x1) / 2, (y0 + y1) / 2], show, start: [0, -30], mv: [[show, 10, [0, 0]], [off, 20, [i % 2 ? 90 : -80, 1000], true]],
    sway: [TREMOR, { at: [0, 0], amp: 0.14, per: 16, from: off, to: off + 20, own: true }],
    face: (c) => { c.fillStyle = color; path(c, s); c.fill(); fibres(c, s, color, seed + 1, 0.8, 0.2); c.fillStyle = "#6c665d"; c.globalAlpha = 0.45; const rows = Math.min(3, Math.max(1, Math.floor((y1 - y0 - 24) / 22))); for (let k = 0; k < rows; k++) c.fillRect(x0 + 20, y0 + 22 + k * 22, (x1 - x0) * (k ? 0.5 : 0.72), 5); c.globalAlpha = 1; } };
};
const BUBBLES = [bubble(0, 400, 580, 610, 655, "#f4efe4"), bubble(1, 475, 680, 690, 755, "#bcd9a6"), bubble(2, 400, 780, 640, 880, "#f4efe4"), bubble(3, 470, 905, 690, 975, "#bcd9a6")];
const card1 = card("card1", 81, 540, 1048, 0.9, CUE.hook.card, [0, -40], [[CUE.hook.card, 10, [0, 0]], [CUE.hook.slip, 25, [700, 30], true]], false, [TREMOR]);

// ---------------------------------------------------------------- 2 · landing: the drop, the storefront with brand and services, the Reservar ticket
const DROP: P[] = scissor(bx(OPEN.x0 - 10, OPEN.y0 - 30, OPEN.x1 + 10, FLOOR + 4), 91, 0.6);
const drop: Piece = { id: "drop", seed: 91, cut: [DROP], edge: "#bfae8a", depth: 3, pivot: [540, 800], show: CUE.landing.drop, start: [0, -1200], mv: [[CUE.landing.drop, 20, [0, 0]]], sway: [{ at: [540, 250], amp: 0.004, per: 70, from: CUE.landing.drop + 20, to: S[3] }],
  face: (c) => { gouache(c, DROP, "#efe4cc", 92, { dir: 0.05, len: 90, w: 22, vary: 0.05, dens: 0.8 }); fibres(c, DROP, "#efe4cc", 93, 0.8, 0.2); } };
const SF: P[] = scissor([[230, 700], [850, 700], [850, 764], [830, 764], [830, FLOOR + 2], [250, FLOOR + 2], [250, 764], [230, 764]], 101, 0.6);
const AWN: P[] = (() => { const pts: P[] = [[240, 852], [840, 852]], n = 8, w = 600 / n; for (let i = n; i >= 1; i--) { const x1 = 240 + i * w; for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI; pts.push([x1 - w / 2 + Math.cos(a) * w / 2, 918 + Math.sin(a) * 22]); } } return pts; })();
const WIN = bx(290, 985, 560, 1190), DOOR = bx(610, 975, 785, FLOOR + 2);
const storefront: Piece = { id: "storefront", seed: 101, cut: [SF], edge: "#8e6a44", depth: 7, pivot: [540, FLOOR], show: CUE.landing.store, start: [-900, 0], mv: [[CUE.landing.store, 30, [0, 0]]],
  face: (c) => { gouache(c, SF, "#e8c79b", 102, { dir: Math.PI / 2, len: 70, w: 18, vary: 0.07 }); fibres(c, SF, "#e8c79b", 103, 0.6, 0.18); shadeSide(c, SF, "#c09a6c", 104, [1, 0], 60);
    gouache(c, bx(230, 700, 850, 764), RED, 105, { len: 50, w: 12, vary: 0.14 }); c.fillStyle = GOLD; c.fillRect(230, 758, 620, 6); words(c, "TU MARCA", 540, 730, 34, CREAM);
    c.fillStyle = WHITE; path(c, AWN); c.fill(); print(c, AWN, (b) => { c.fillStyle = RED; c.globalAlpha = 0.85; for (let x = b.x0; x < b.x1; x += 75) c.fillRect(x, b.y0, 37.5, b.y1 - b.y0); }); shadeSide(c, AWN, "#7a1f1c", 106, [0, 1], 16, 0);
    gouache(c, WIN, "#9cc9cf", 107, { dir: -0.7, len: 40, w: 12, vary: 0.12 }); shadeSide(c, WIN, "#5f8e98", 108, [-1, -1], 40, -0.7); c.fillStyle = "#8e6a44"; c.fillRect(280, 1190, 290, 14);
    gouache(c, DOOR, TEAL, 109, { dir: Math.PI / 2, len: 50, w: 12, vary: 0.12 }); gouache(c, bx(640, 1005, 755, 1100), "#9cc9cf", 110, { len: 20, w: 8 }); c.fillStyle = GOLD; c.beginPath(); c.arc(760, 1140, 8, 0, 6.28); c.fill(); } };
// the services card stood in the window: three gouache dots and printed lines
const SVC: P[] = scissor(bx(318, 1004, 532, 1172), 111, 0.5);
const services: Piece = { id: "services", seed: 111, cut: [SVC], border: 5, edge: "#c9b99a", depth: 5, pivot: [425, 1088], show: CUE.landing.services, start: [-700, 0], mv: [[CUE.landing.services, 20, [0, 0]]],
  face: (c) => { c.fillStyle = "#f7f0de"; path(c, SVC); c.fill(); fibres(c, SVC, "#f7f0de", 112, 0.5, 0.12); words(c, "SERVICIOS", 425, 1032, 20, TEAL);
    [RED, GOLD, TEAL].forEach((col, i) => { const y = 1070 + i * 34; gouache(c, oval(348, y, 10, 10, 16), col, 113 + i, { len: 8, w: 4 }); c.fillStyle = "#6e665a"; c.globalAlpha = 0.6; c.fillRect(368, y - 3, 130 - i * 22, 5); c.globalAlpha = 1; }); } };
const TICKET: P[] = scissor(stub(540, 1312, 450, 112), 121, 0.5);
const ticket: Piece = { id: "ticket", seed: 121, cut: [TICKET], border: 6, edge: "#c9b99a", depth: 8, pivot: [540, 1312], show: CUE.landing.ticket, start: [0, 150], mv: [[CUE.landing.ticket, 25, [0, 0]], [CUE.landing.press, 5, [0, 6]], [CUE.landing.press + 5, 5, [0, 0]]],
  face: (c) => { c.fillStyle = "#f6ecd6"; path(c, TICKET); c.fill(); print(c, TICKET, (b) => { c.strokeStyle = "#8fb3c9"; c.globalAlpha = 0.35; c.lineWidth = 1; for (let y = b.y0 + 10; y < b.y1; y += 12) { c.beginPath(); c.moveTo(b.x0, y); c.lineTo(b.x1, y); c.stroke(); } c.globalAlpha = 0.8; c.strokeStyle = RED; c.lineWidth = 2.4; c.setLineDash([7, 6]); c.beginPath(); c.moveTo(680, b.y0 + 8); c.lineTo(680, b.y1 - 8); c.stroke(); c.setLineDash([]); });
    words(c, "RESERVAR", 508, 1312, 40, RED); gouache(c, oval(722, 1312, 20, 20), GOLD, 122, { len: 12, w: 5 }); } };
// a customer's hand comes in from the right wing and presses the ticket's gold button: index finger out, curled fist, wrist in the wing
const TAP: P[] = smooth([[716, 1306], [730, 1298], [800, 1304], [846, 1288], [900, 1298], [1040, 1318], [1040, 1418], [900, 1418], [850, 1400], [812, 1372], [800, 1338], [730, 1330], [714, 1318]], true, 6);
const tapHand: Piece = { id: "tapHand", seed: 125, cut: [TAP], border: 6, edge: SKIN_EDGE, depth: 9, pivot: [880, 1350], show: CUE.landing.tap, start: [280, 0], mv: [[CUE.landing.tap, 15, [0, 0]], [CUE.landing.away, 15, [400, 0], true]],
  face: (c) => { gouache(c, TAP, SKIN, 126, { dir: 0.1, len: 34, w: 11, vary: 0.1 }); shadeSide(c, TAP, SKIN_SH, 127, [0, 1], 34, 0.1); c.fillStyle = "#f4d2bc"; c.beginPath(); c.ellipse(730, 1308, 11, 7, 0, 0, 6.28); c.fill();
    c.strokeStyle = SKIN_SH; c.lineWidth = 4; c.lineCap = "round"; [[826, 1352], [846, 1378], [868, 1398]].forEach(([x, y]) => { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 18, y - 4); c.stroke(); });
    const cuff = bx(960, 1300, 1050, 1430); withClip(c, TAP, () => { gouache(c, cuff, GOLD, 128, { dir: Math.PI / 2, len: 26, w: 9 }); dotPrint(c, cuff, "#fbf1d6", 14, 2); }); } };

// ---------------------------------------------------------------- 3 · domain: the stub URL sign on threads, then the tudominio.cl plate on a stick
const SIGN: P[] = tear(bx(330, 776, 750, 840), 2.2, 131), THREADS: P[][] = [bx(372, 300, 375, 780), bx(705, 300, 708, 780)];
const sign: Piece = { id: "sign", seed: 131, cut: [...THREADS, SIGN], edge: "#8a857c", depth: 4, pivot: [540, 808], show: CUE.domain.sign, start: [0, -700], mv: [[CUE.domain.sign, 15, [0, 0]], [CUE.domain.yank, 15, [0, -900], true]], sway: [{ at: [540, 300], amp: 0.02, per: 34, from: CUE.domain.sign + 10, to: CUE.domain.yank, decay: 40 }],
  face: (c) => { c.fillStyle = "#d9d2c4"; THREADS.forEach((t) => { path(c, t); c.fill(); }); c.fillStyle = "#b9b4aa"; path(c, SIGN); c.fill(); fibres(c, SIGN, "#b9b4aa", 132, 1, 0.2); words(c, "WEB-XYZ.COM/?ID=8341", 540, 808, 22, "#5f5a52", PENCIL); } };
const PLATE: P[] = scissor(bx(290, 766, 790, 848), 141, 0.5), STICK: P[] = bx(535, 300, 545, 770);
const plate: Piece = { id: "plate", seed: 141, cut: [STICK, PLATE], border: 6, edge: "#9c7a3c", depth: 8, pivot: [540, 807], show: CUE.domain.plate, start: [0, -560], mv: [[CUE.domain.plate, 30, [0, 0]]], sway: [{ at: [540, 300], amp: 0.025, per: 36, from: CUE.domain.plate + 30, to: CUE.close.lift, decay: 45 }],
  face: (c) => { c.fillStyle = "#d8b37a"; path(c, STICK); c.fill(); c.fillStyle = "#b88c52"; c.fillRect(541, 300, 3, 470);
    gouache(c, PLATE, "#fbf1d6", 142, { len: 40, w: 12, vary: 0.04 }); c.strokeStyle = GOLD; c.lineWidth = 7; c.strokeRect(302, 778, 476, 58); words(c, "TUDOMINIO.CL", 540, 807, 38, NAVY); } };

// ---------------------------------------------------------------- 4 · booking: blotter with the printed calendar and time chips, the ring, the card into the slot, the check, the tag
const OUT4: Mv = [CUE.close.lift, 20, [0, -1300], true], HANG4: Sway = { at: [540, 250], amp: 0.004, per: 60, from: S[3], to: CUE.close.lift };
const BLOT: P[] = scissor(bx(OPEN.x0 - 10, OPEN.y0 - 30, OPEN.x1 + 10, OPEN.y1 + 4), 151, 0.6);
const CAL = { x0: 250, y0: 520, x1: 830, y1: 1120 }, GRID0 = 630, CELL: P = [116, 117.5], SLOT = { r: 2, c: 2 };
const slotC: P = [CAL.x0 + (SLOT.c + 0.5) * CELL[0], GRID0 + (SLOT.r + 0.5) * CELL[1]];
const CHIPS = ["10:00", "11:30", "16:00"].map((t, i) => ({ t, cx: 330 + i * 210, cy: 1225 }));
const blotter: Piece = { id: "blotter", seed: 151, cut: [BLOT], edge: "#23402f", depth: 4, pivot: [540, 800], show: S[3], mv: [OUT4], sway: [HANG4],
  face: (c) => { gouache(c, BLOT, "#3f6b55", 152, { dir: 0.1, len: 80, w: 20, vary: 0.08, dens: 0.8 }); fibres(c, BLOT, "#3f6b55", 153, 0.8, 0.2);
    const cal = scissor(bx(CAL.x0, CAL.y0, CAL.x1, CAL.y1), 154, 0.5); c.fillStyle = "rgba(20,30,22,0.35)"; path(c, cal.map(([x, y]) => [x + 8, y + 12] as P)); c.fill();
    c.fillStyle = "#f7f0de"; path(c, cal); c.fill(); fibres(c, cal, "#f7f0de", 155, 0.5, 0.12);
    gouache(c, bx(CAL.x0, CAL.y0, CAL.x1, GRID0 - 20), RED, 156, { len: 40, w: 12, vary: 0.14 }); words(c, "OCTUBRE", 540, (CAL.y0 + GRID0 - 20) / 2, 40, CREAM);
    gouache(c, bx(slotC[0] - 56, slotC[1] - 56, slotC[0] + 56, slotC[1] + 56), "#f2d27a", 157, { len: 22, w: 9, vary: 0.1 });
    c.strokeStyle = "#8fa3b0"; c.globalAlpha = 0.8; c.lineWidth = 2; for (let i = 0; i <= 5; i++) { c.beginPath(); c.moveTo(CAL.x0 + i * CELL[0], GRID0); c.lineTo(CAL.x0 + i * CELL[0], CAL.y1 - 20); c.stroke(); } for (let j = 0; j <= 4; j++) { c.beginPath(); c.moveTo(CAL.x0, GRID0 + j * CELL[1]); c.lineTo(CAL.x1, GRID0 + j * CELL[1]); c.stroke(); } c.globalAlpha = 1;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) words(c, String(j * 5 + i + 6), CAL.x0 + i * CELL[0] + 26, GRID0 + j * CELL[1] + 22, 18, "#5d5a54", PENCIL);
    CHIPS.forEach(({ t, cx, cy }, i) => { const ch = scissor(stub(cx, cy, 170, 64, 10), 158 + i, 0.5); c.fillStyle = "rgba(20,30,22,0.35)"; path(c, ch.map(([x, y]) => [x + 5, y + 8] as P)); c.fill(); c.fillStyle = "#f6ecd6"; path(c, ch); c.fill(); words(c, t, cx, cy, 28, NAVY); }); } };
const RING_C = CHIPS[1], RING: P[][] = [oval(RING_C.cx, RING_C.cy, 104, 46, 36), oval(RING_C.cx, RING_C.cy, 92, 36, 36).reverse()];
const ring: Piece = { id: "ring", seed: 161, cut: RING, hole: true, edge: "#9c7a3c", depth: 5, pivot: [RING_C.cx, RING_C.cy], show: CUE.agenda.ring, start: [0, -40], mv: [[CUE.agenda.ring, 10, [0, 0]], OUT4], sway: [HANG4],
  face: (c) => { c.save(); c.beginPath(); RING.forEach((s) => { s.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); }); c.clip("evenodd"); gouache(c, bx(RING_C.cx - 110, RING_C.cy - 50, RING_C.cx + 110, RING_C.cy + 50), GOLD, 162, { len: 16, w: 6, vary: 0.14 }); c.restore(); } };
const card2 = card("card2", 171, slotC[0], slotC[1] + 8, 0.6, CUE.agenda.card, [720, 0], [[CUE.agenda.card, 30, [0, 0]], OUT4], false, [HANG4]);
const CHECK = oval(slotC[0] + 46, slotC[1] - 44, 28, 28);
const check: Piece = { id: "check", seed: 181, cut: [CHECK], border: 5, edge: "#2e5a33", depth: 6, pivot: [slotC[0] + 46, slotC[1] - 44], show: CUE.agenda.check, start: [0, -40], mv: [[CUE.agenda.check, 10, [0, 0]], OUT4], sway: [HANG4],
  face: (c) => { gouache(c, CHECK, "#5a9a5a", 182, { len: 16, w: 7, vary: 0.12 }); const [x, y] = [slotC[0] + 46, slotC[1] - 44]; c.strokeStyle = WHITE; c.lineWidth = 7; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath(); c.moveTo(x - 13, y + 1); c.lineTo(x - 3, y + 11); c.lineTo(x + 14, y - 10); c.stroke(); } };
const TAG_Y = slotC[1] + 82, TAG: P[] = scissor(stub(slotC[0], TAG_Y, 150, 44, 9), 191, 0.5);
const tag: Piece = { id: "tag", seed: 191, cut: [TAG], border: 4, edge: "#7a1f1c", depth: 6, pivot: [slotC[0], TAG_Y], show: CUE.agenda.tag, start: [0, 60], mv: [[CUE.agenda.tag, 15, [0, 0]], OUT4], sway: [HANG4],
  face: (c) => { gouache(c, TAG, RED, 192, { len: 18, w: 7, vary: 0.12 }); words(c, "LISTA", slotC[0], TAG_Y, 22, CREAM); } };

// ---------------------------------------------------------------- 5 · close: the card, checked, comes home beside the door
const card3 = card("card3", 201, 836, 1214, 0.85, CUE.close.card, [200, 0], [[CUE.close.card, 25, [0, 0]]], true);

// ---------------------------------------------------------------- captions and the call to action: printed paper strips under the stage
const caption = (id: string, seed: number, text: string, cap: number, cy: number, arrive: number | null, exit: number | null): Piece => {
  const w = measure(text, cap, TXT) + 90, h = cap + 70, s = scissor(bx(540 - w / 2, cy - h / 2, 540 + w / 2, cy + h / 2), seed, 0.6), mv: Mv[] = [];
  if (arrive !== null) mv.push([arrive, 15, [0, 0]]); if (exit !== null) mv.push([exit, 10, [0, 420], true]);
  return { id, seed, cut: [s], edge: "#b7a47c", depth: 7, pivot: [540, cy], clip: false, show: arrive ?? 0, start: arrive === null ? [0, 0] : [0, 420], mv,
    face: (c) => { c.fillStyle = CREAM; path(c, s); c.fill(); fibres(c, s, CREAM, seed + 1, 0.7, 0.18); c.fillStyle = RED; c.fillRect(540 - w / 2 + 30, cy + h / 2 - 22, w - 60, 5); words(c, text, 540, cy - 4, cap, INK); } };
};
const button = (id: string, seed: number, text: string, cx: number, cy: number, fill: string, ink: string, show: number): Piece => {
  const w = measure(text, 30, TXT) + 80, s = scissor(stub(cx, cy, w, 84, 12), seed, 0.5);
  return { id, seed, cut: [s], border: 5, edge: mix(fill, "#000000", 0.35), depth: 7, pivot: [cx, cy], clip: false, show, start: [0, 200], mv: [[show, 15, [0, 0]]],
    face: (c) => { gouache(c, s, fill, seed + 1, { len: 30, w: 10, vary: 0.08 }); words(c, text, cx, cy, 30, ink); } };
};
const ci = CUE.caption.in;
const CAPS = [caption("capHook", 211, "¿DÓNDE RESERVAN?", 58, 1650, null, S[1]), caption("capLanding", 213, "TU LANDING", 64, 1650, S[1] + ci, S[2]), caption("capDomain", 215, "TUDOMINIO.CL", 64, 1650, S[2] + ci, S[3]),
  caption("capAgenda", 217, "AGENDA DESDE TU WEB", 54, 1650, S[3] + ci, S[4]), caption("capClose", 219, "PRUEBA JAVISA", 60, 1625, CUE.close.caption, null)];
const B1W = measure("MÁS INFORMACIÓN", 30, TXT) + 80, B2W = measure("PROBAR", 30, TXT) + 80, BX0 = 540 - (B1W + 36 + B2W) / 2;
const BUTTONS = [button("btnInfo", 221, "MÁS INFORMACIÓN", BX0 + B1W / 2, 1790, "#f6ecd6", TEAL, CUE.close.buttons[0]), button("btnTry", 223, "PROBAR", BX0 + B1W + 36 + B2W / 2, 1790, RED, CREAM, CUE.close.buttons[1])];

// ---------------------------------------------------------------- the theatre (on the table from frame 0)
const PRO_OUT: P[] = smooth([[60, 1520], [60, 300], [380, 300], [460, 268], [540, 226], [620, 268], [700, 300], [1020, 300], [1020, 1520]], false, 5);
const PRO_IN: P[] = [[OPEN.x0, OPEN.y1], [OPEN.x0, OPEN.y0 + 30], ...smooth([[OPEN.x0, OPEN.y0 + 30], [540, OPEN.y0 - 8], [OPEN.x1, OPEN.y0 + 30]], false, 10).slice(1, -1), [OPEN.x1, OPEN.y0 + 30], [OPEN.x1, OPEN.y1]];
const proscenium: Piece = { id: "pros", seed: 231, cut: [PRO_OUT, PRO_IN], hole: true, clip: false, edge: "#173b3e", depth: 5, pivot: [540, 1520],
  face: (c) => {
    c.save(); path(c, PRO_IN); c.clip(); c.fillStyle = "rgba(20,14,8,0.28)"; c.beginPath(); c.rect(OPEN.x0 - 40, OPEN.y0 - 60, OPEN.x1 - OPEN.x0 + 80, OPEN.y1 - OPEN.y0 + 100); path(c, PRO_IN.map(([x, y]) => [x + 16, y + 22] as P)); c.fill("evenodd"); c.restore();
    const ringPath = () => { c.beginPath(); [PRO_OUT, PRO_IN].forEach((s) => { s.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); }); };
    c.fillStyle = TEAL; ringPath(); c.fill("evenodd"); c.save(); ringPath(); c.clip("evenodd"); diamondPrint(c, PRO_OUT, "#e6c56a", 26); fibres(c, PRO_OUT, TEAL, 232, 0.4, 0.15); c.restore();
    c.strokeStyle = "#d9ae4a"; c.lineWidth = 14; c.lineJoin = "round"; path(c, PRO_IN.map(([x, y]) => [x + (x < 540 ? -7 : 7), y + (y > 1000 ? 7 : -7)] as P), false); c.stroke();
    c.strokeStyle = "#f2d78a"; c.lineWidth = 3; path(c, PRO_IN.map(([x, y]) => [x + (x < 540 ? -10 : 10), y + (y > 1000 ? 10 : -10)] as P), false); c.stroke();
    const apron = bx(OPEN.x0 - 30, OPEN.y1 + 18, OPEN.x1 + 30, 1500); c.fillStyle = RED; path(c, apron); c.fill(); fibres(c, apron, RED, 233, 0.5, 0.2); print(c, apron, (b) => { c.fillStyle = "#f0dcb0"; c.globalAlpha = 0.5; for (let x = b.x0 + 8; x < b.x1; x += 16) c.fillRect(x, b.y0 + 12, 3, b.y1 - b.y0 - 24); }); c.fillStyle = GOLD; c.fillRect(OPEN.x0 - 30, OPEN.y1 + 18, OPEN.x1 - OPEN.x0 + 60, 6); c.fillRect(OPEN.x0 - 30, 1494, OPEN.x1 - OPEN.x0 + 60, 6);
    const cart = oval(540, 292, 118, 44, 36); c.fillStyle = WHITE; path(c, cart); c.lineWidth = 10; c.strokeStyle = WHITE; c.stroke(); c.fill(); gouache(c, cart, "#f1e2c2", 234, { len: 16, w: 6, vary: 0.06 }); words(c, "JAVISA", 540, 292, 30, TEAL);
  } };
const WALL = bx(OPEN.x0, OPEN.y0 - 30, OPEN.x1, FLOOR + 4), FLOOR_S = bx(OPEN.x0, FLOOR, OPEN.x1, OPEN.y1 + 10);
const stage = (ctx: Ctx, env: Env) => {
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = KRAFT; ctx.fillRect(0, 0, W, H); fibres(ctx, bx(0, 0, W, H), KRAFT, 241, 1.2, 0.3);
  ctx.fillStyle = "#d9a08f"; path(ctx, WALL); ctx.fill(); fibres(ctx, WALL, "#d9a08f", 242, 0.9, 0.22);
  ctx.fillStyle = "#c9a36f"; path(ctx, FLOOR_S); ctx.fill(); woodPrint(ctx, FLOOR_S, "#7a5a34", 243); ctx.fillStyle = "rgba(40,24,10,0.22)"; ctx.fillRect(OPEN.x0, FLOOR, OPEN.x1 - OPEN.x0, 10);
};
// painter order, back to front
const PAINTER: Piece[] = [drop, storefront, services, sign, plate, ticket, tapHand, card3, palm, phone, ...BUBBLES, card1, fingers, thumb, blotter, ring, card2, check, tag];
const OVER: Piece[] = [proscenium, ...CAPS, ...BUTTONS];
const ALL = [...PAINTER, ...OVER];
onGrid("javisaCita", [...S, ...Object.values(CUE).flatMap((g) => Object.values(g).flat()), ...ALL.flatMap((p) => (p.mv ?? []).flatMap(([a, d]) => [a, a + d]))], N);

const scene = (ctx: Ctx, f: number, env: Env) => {
  stage(ctx, env);
  for (const pc of ALL) drawPiece(ctx, env, pc, f);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  const g = new Gfx(ctx, env, 0, PEN); g.paper("paper", 0.12); g.vignette("rgba(60,36,14,0.3)");
};

// ---------------------------------------------------------------- score: marimba in C major, I-IV-V-I in every two-bar shot, locked to picture
// 4/4 at 120 bpm: one bar = 2 s = 60 frames, one shot = 2 bars. The hook's phrase ends on V (the
// question: where do they book?); every later phrase answers on I. Parts on the grid so the beat
// stays on the frame. VO windows (record to these, ~3.5 s each): 0.3-3.8 s hook, 4.3-7.8 landing,
// 8.3-11.8 domain, 12.3-15.8 booking, 16.3-19.8 close. The mix ducks 6 dB inside each window.
const CHORDS: [number, "C" | "F" | "G"][] = [[0, "C"], [2, "F"], [4, "G"], [8, "C"], [10, "F"], [12, "G"], [14, "C"], [16, "C"], [18, "F"], [20, "G"], [22, "C"], [24, "F"], [26, "G"], [28, "C"], [32, "C"], [34, "F"], [35, "G"], [36, "C"]];
const TONES = { C: ["C4", "G4", "E5"], F: ["F4", "C5", "A4"], G: ["G4", "D5", "B4"] } as const;
const ostinato = () => { const eighths: string[] = []; for (let i = 0; i < CHORDS.length - 1; i++) { const [t, ch] = CHORDS[i], n = (CHORDS[i + 1][0] - t) * 2, [r, f5, th] = TONES[ch]; for (let k = 0; k < n; k++) eighths.push(`${[r, f5, th, f5][k % 4]}:.5`); } const bars: string[] = []; for (let i = 0; i < eighths.length; i += 8) bars.push(eighths.slice(i, i + 8).join(" ")); return [...bars, "[C4 G4 E5]:4"].join(" | "); };
const MELODY = "C5:.5 E5:.5 G5:1 A5:.5 G5:.5 F5:1 | D5:.5 G5:.5 B5:1 D6:1 r:1 | C5:.5 E5:.5 G5:1 A5:.5 C6:.5 A5:1 | B5:.5 A5:.5 G5:1 E5:1 C5:1 | E5:.5 G5:.5 C6:1 C6:.5 A5:.5 F5:1 | G5:.5 B5:.5 D6:1 C6:2 | A5:.5 C6:.5 A5:1 B5:.5 D6:.5 B5:1 | C6:1 G5:.5 E5:.5 C5:2 | C5:.5 E5:.5 G5:1 A5:.5 C6:.5 B5:.5 D6:.5 | C6:4";
const BASS = "C3:2 F2:2 | G2:2 D3:2 | C3:2 F2:2 | G2:2 C3:2 | C3:2 F2:2 | G2:2 C3:2 | F2:2 G2:2 | C3:2 G2:2 | C3:2 F2:1 G2:1 | C3:4";
export const javisaScore = (): Score => ({
  title: "Tu web, tu cita: marimba in C", seed: 505, tail: 2,
  harmony: CHORDS.map(([t, name]) => ({ t, name })),
  plan: { style: "minimalist", tempo: BPM, meter: "4/4", rubato: 0, ritard: 1, sections: [{ id: "a", bars: 10, mood: "playful", key: "C", mode: "major", melody: ["hook", "ostinato"], dyn: [0.7, 0.8], ending: "button" }] },
  parts: [
    { id: "hook", inst: "marimba", role: "melody", opts: { grid: true }, gainDb: 1, notes: line(0, MELODY, { role: "melody", v: 0.8, bpb: 4 }) },
    { id: "ostinato", inst: "marimba", role: "accomp", opts: { grid: true }, gainDb: -7, notes: line(0, ostinato(), { role: "accomp", v: 0.5, bpb: 4 }) },
    { id: "bass", inst: "marimba", role: "bass", opts: { grid: true }, gainDb: -2, notes: line(0, BASS, { role: "bass", v: 0.7, bpb: 4 }) },
  ],
});
export const VO_WINDOWS: [number, number][] = S.slice(0, 5).map((s) => [s / FPS + 0.3, s / FPS + 3.8]);
// a dry tap of card on card at every landing: the moment the jiggle starts
const LANDS = ALL.flatMap((p) => (p.mv ?? []).filter(([, , , exit]) => !exit).map(([a, d]) => (a + d * 0.62) / FPS));
const audio = (sr: number): [Float32Array, Float32Array] => {
  const { L, R } = renderPiece(javisaScore(), sr, { seconds: N / FPS, tempo: BPM }), n = L.length, ramp = 0.2;
  for (let i = 0; i < n; i++) { const t = i / sr; let g = 1; for (const [a, b] of VO_WINDOWS) { const k = Math.min(1, Math.max(0, Math.min(t - a + ramp, b + ramp - t) / ramp)); g = Math.min(g, 1 - 0.5 * k); } L[i] *= g; R[i] *= g; }
  LANDS.forEach((t0, j) => { const r = rng(900 + j), i0 = Math.floor(t0 * sr), len = Math.floor(sr * 0.07); let lp = 0; for (let i = 0; i < len && i0 + i < n; i++) { lp += 0.35 * ((r() * 2 - 1) - lp); const v = lp * 0.22 * Math.exp(-(i / sr) * 60); L[i0 + i] += v * 0.9; R[i0 + i] += v; } });
  let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); if (pk > 0.89) { const g = 0.89 / pk; for (let i = 0; i < n; i++) { L[i] *= g; R[i] *= g; } }
  return [L, R];
};

export const javisaCita: Film = {
  meta: { title: "Javisa · Tu web, tu cita · toy-theatre paper collage on twos", W, H, fps: FPS, bpm: BPM, durationFrames: N, raster: "cpu", kind: "explainer", onTwos: true, step: 2, holds: [[CUE.close.still, N]] },
  assets: { images: {} },
  shots: ["hook", "landing", "domain", "agenda", "close"].map((id, i) => ({ id, start: S[i], end: S[i + 1], draw: (ctx: Ctx, l: number, env: Env) => scene(ctx, S[i] + l, env) })),
  audio,
};
