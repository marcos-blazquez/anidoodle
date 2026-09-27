import { rng, type Ctx, type P } from "./core";
import { bounds, mix } from "./gallery";
import { path } from "./scrapbookKit";

// PAPER CRAFT KIT · the toy-theatre marks shared by paperCraft and the pieces built on it:
// the gouache brush stroke, the painted shade side, and the printed motifs, all clipped to the piece.

export const gouache = (c: Ctx, shape: P[], color: string, seed: number, o: { dir?: number; len?: number; w?: number; vary?: number; dens?: number } = {}) => {
  const { dir = 0, len = 44, w = 13, vary = 0.1, dens = 1 } = o, r = rng(seed), b = bounds(shape), area = (b.x1 - b.x0) * (b.y1 - b.y0);
  c.fillStyle = color; path(c, shape); c.fill();
  c.save(); path(c, shape); c.clip(); c.lineCap = "round";
  const n = Math.max(6, Math.round((area / (len * w)) * 1.6 * dens));
  for (let i = 0; i < n; i++) { const x = b.x0 + r() * (b.x1 - b.x0), y = b.y0 + r() * (b.y1 - b.y0), a = dir + (r() - 0.5) * 0.35, l = len * (0.6 + r() * 0.7), k = r(); c.strokeStyle = k < 0.5 ? mix(color, "#ffffff", vary * (0.5 + r())) : mix(color, "#1d2430", vary * (0.4 + r())); c.globalAlpha = 0.28 + r() * 0.25; c.lineWidth = w * (0.6 + r() * 0.6); c.beginPath(); c.moveTo(x - Math.cos(a) * l / 2, y - Math.sin(a) * l / 2); c.quadraticCurveTo(x + (r() - 0.5) * 6, y + (r() - 0.5) * 6, x + Math.cos(a) * l / 2, y + Math.sin(a) * l / 2); c.stroke(); }
  c.restore(); c.globalAlpha = 1;
};
// painted shade: darker strokes laid along one side of a shape (the side away from the sun)
export const shadeSide = (c: Ctx, shape: P[], color: string, seed: number, side: P, depth: number, dir = Math.PI / 2) => {
  const b = bounds(shape), r = rng(seed); c.save(); path(c, shape); c.clip(); c.lineCap = "round";
  for (let i = 0; i < 16; i++) { const u = r(), x = side[0] > 0 ? b.x1 - r() * depth : side[0] < 0 ? b.x0 + r() * depth : b.x0 + u * (b.x1 - b.x0), y = side[1] > 0 ? b.y1 - r() * depth : side[1] < 0 ? b.y0 + r() * depth : b.y0 + u * (b.y1 - b.y0), l = 16 + r() * 26; c.strokeStyle = color; c.globalAlpha = 0.3 + r() * 0.25; c.lineWidth = 5 + r() * 7; c.beginPath(); c.moveTo(x - Math.cos(dir) * l / 2, y - Math.sin(dir) * l / 2); c.lineTo(x + Math.cos(dir) * l / 2, y + Math.sin(dir) * l / 2); c.stroke(); }
  c.restore(); c.globalAlpha = 1;
};
export const print = (c: Ctx, shape: P[], fn: (b: { x0: number; y0: number; x1: number; y1: number }) => void) => { c.save(); path(c, shape); c.clip(); fn(bounds(shape)); c.restore(); c.globalAlpha = 1; };
// a printed wave motif in rows: rows of small arcs, a little misregistered like cheap printing
export const wavePrint = (c: Ctx, shape: P[], col: string, gap = 22, sw = 2) => print(c, shape, (b) => { c.strokeStyle = col; c.lineWidth = sw; c.globalAlpha = 0.55; for (let y = b.y0 + 8, row = 0; y < b.y1 + 10; y += gap, row++) { c.beginPath(); for (let x = b.x0 - 30 + (row % 2) * 15; x < b.x1 + 30; x += 30) { c.moveTo(x, y); c.quadraticCurveTo(x + 7.5, y - 7, x + 15, y); } c.stroke(); } });
export const dotPrint = (c: Ctx, shape: P[], col: string, gap = 14, rad = 2.2) => print(c, shape, (b) => { c.fillStyle = col; c.globalAlpha = 0.8; for (let y = b.y0, row = 0; y < b.y1 + gap; y += gap * 0.87, row++) for (let x = b.x0 + (row % 2) * gap * 0.5; x < b.x1 + gap; x += gap) { c.beginPath(); c.arc(x, y, rad, 0, 6.28); c.fill(); } });
export const diamondPrint = (c: Ctx, shape: P[], col: string, gap = 26) => print(c, shape, (b) => { c.fillStyle = col; c.globalAlpha = 0.5; for (let y = b.y0, row = 0; y < b.y1 + gap; y += gap / 2, row++) for (let x = b.x0 + (row % 2) * gap / 2; x < b.x1 + gap; x += gap) { c.beginPath(); c.moveTo(x, y - 4); c.lineTo(x + 3, y); c.lineTo(x, y + 4); c.lineTo(x - 3, y); c.closePath(); c.fill(); } c.globalAlpha = 0.18; c.strokeStyle = col; c.lineWidth = 0.8; for (let d = b.x0 - (b.y1 - b.y0); d < b.x1; d += gap) { c.beginPath(); c.moveTo(d, b.y0); c.lineTo(d + (b.y1 - b.y0), b.y1); c.stroke(); c.beginPath(); c.moveTo(d + (b.y1 - b.y0), b.y0); c.lineTo(d, b.y1); c.stroke(); } });
export const stonePrint = (c: Ctx, shape: P[], base: string, seed: number) => print(c, shape, (b) => { const r = rng(seed); for (let y = b.y0, row = 0; y < b.y1; y += 17, row++) for (let x = b.x0 - (row % 2) * 16; x < b.x1; ) { const w = 26 + r() * 16; c.fillStyle = mix(base, r() < 0.5 ? "#ffffff" : "#3b3226", 0.06 + r() * 0.14); c.globalAlpha = 1; c.beginPath(); c.roundRect(x + 1.5, y + 1.5, w - 3, 14, 4); c.fill(); x += w; } });
export const newsPrint = (c: Ctx, shape: P[], seed: number) => print(c, shape, (b) => { const r = rng(seed); c.fillStyle = "#4a4640"; c.globalAlpha = 0.5; for (let col = b.x0 + 4; col < b.x1; col += 36) for (let y = b.y0 + 4; y < b.y1; y += 4.2) { if (r() < 0.06) { y += 6; continue; } const l = 20 + r() * 12; c.fillRect(col, y, l, 1.3); } c.globalAlpha = 0.7; c.fillRect(b.x0 + 16, b.y0 + 30, 60, 5); });
export const woodPrint = (c: Ctx, shape: P[], col: string, seed: number) => print(c, shape, (b) => { const r = rng(seed); c.strokeStyle = col; c.lineWidth = 1; c.globalAlpha = 0.35; for (let y = b.y0; y < b.y1; y += 3 + r() * 4) { c.beginPath(); c.moveTo(b.x0, y); for (let x = b.x0; x <= b.x1; x += 40) c.lineTo(x, y + Math.sin(x * 0.013 + y) * 1.6); c.stroke(); } c.globalAlpha = 0.5; c.strokeStyle = mix(col, "#000000", 0.2); for (let x = b.x0 + 60 + r() * 60; x < b.x1; x += 90 + r() * 90) { c.beginPath(); c.moveTo(x, b.y0); c.lineTo(x, b.y1); c.stroke(); } });
