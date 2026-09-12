import { Vector3 } from 'three';
import { cameraProjector, projectPoint, type CameraView } from './camera.ts';
import { dieLetters, type GameState, type Point } from './game.ts';
import type { Frame } from './motion';

type XY = { x: number; y: number };
export type DieFace = {
  id: number;
  face: number;
  letter: string;
  polygon: XY[];
  depth: number;
  center: XY;
  u: XY;
  v: XY;
};
const half = 0.2;
const quads: Point[][] = [
  [
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1],
  ],
  [
    [1, -1, -1],
    [-1, -1, -1],
    [-1, 1, -1],
    [1, 1, -1],
  ],
  [
    [1, -1, 1],
    [1, -1, -1],
    [1, 1, -1],
    [1, 1, 1],
  ],
  [
    [-1, -1, -1],
    [-1, -1, 1],
    [-1, 1, 1],
    [-1, 1, -1],
  ],
  [
    [-1, -1, -1],
    [1, -1, -1],
    [1, -1, 1],
    [-1, -1, 1],
  ],
  [
    [-1, 1, 1],
    [1, 1, 1],
    [1, 1, -1],
    [-1, 1, -1],
  ],
];
function clipped(points: Vector3[]) {
  const result: Vector3[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    if (a.z >= 0.22) result.push(a);
    if (a.z >= 0.22 !== b.z >= 0.22)
      result.push(a.clone().lerp(b, (0.22 - a.z) / (b.z - a.z)));
  }
  return result;
}
function area(p: XY[]) {
  return p.reduce((sum, a, i) => {
    const b = p[(i + 1) % p.length];
    return sum + a.x * b.y - b.x * a.y;
  }, 0);
}
export function pointInFace(p: XY, polygon: XY[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
export function pickDie(faces: DieFace[], x: number, y: number) {
  for (let i = faces.length - 1; i >= 0; i--)
    if (pointInFace({ x, y }, faces[i].polygon)) return faces[i];
  return null;
}
// All positions and face labels belong to the puzzle, not the viewing angle.
// Near-plane clipping keeps zooming inside the lattice usable.
export function projectDice(
  game: GameState,
  view: CameraView,
  frame: Frame,
): DieFace[] {
  const project = cameraProjector(view, game.puzzle.size);
  const width = frame.width ?? frame.size,
    height = frame.height ?? frame.size;
  const ox = (width - frame.size) / 2,
    oy = (height - frame.size) / 2;
  const screen = (v: Vector3): XY | null => {
    const p = projectPoint(v);
    return p
      ? { x: ox + (p.x * frame.size) / 100, y: oy + (p.y * frame.size) / 100 }
      : null;
  };
  const result: DieFace[] = [];
  for (const cell of game.puzzle.cells) {
    const labels = dieLetters(cell, game.puzzle.seed);
    for (let face = 0; face < 6; face++) {
      const world = quads[face].map(
        (q) => q.map((v, i) => cell.position[i] + v * half) as Point,
      );
      const corners = world.map((p) => project(p));
      const polygon = clipped(corners)
        .map(screen)
        .filter((p): p is XY => !!p);
      if (polygon.length < 3 || area(polygon) < 0.5) continue;
      if (
        polygon.every((p) => p.x < 0) ||
        polygon.every((p) => p.x > width) ||
        polygon.every((p) => p.y < 0) ||
        polygon.every((p) => p.y > height)
      )
        continue;
      const middle = world[0].map(
        (_, i) => (world[0][i] + world[2][i]) / 2,
      ) as Point;
      const center = screen(project(middle));
      const u = screen(
        project(
          middle.map((v, i) => v + (world[1][i] - world[0][i]) * 0.32) as Point,
        ),
      );
      const v = screen(
        project(
          middle.map((v, i) => v + (world[3][i] - world[0][i]) * 0.32) as Point,
        ),
      );
      // A face crossing the camera may have no visible glyph center.
      result.push({
        id: cell.id,
        face,
        letter: labels[face],
        polygon,
        depth: corners.reduce((s, p) => s + p.z, 0) / 4,
        center: center ?? { x: 0, y: 0 },
        u: u ?? center ?? { x: 0, y: 0 },
        v: v ?? center ?? { x: 0, y: 0 },
      });
    }
  }
  return result.sort((a, b) => b.depth - a.depth);
}
const facesByCanvas = new WeakMap<HTMLCanvasElement, DieFace[]>();
export function dieGlyphTransform(
  f: DieFace,
  facingViewer: boolean,
): [number, number, number, number, number, number] {
  if (!facingViewer)
    return [
      (f.u.x - f.center.x) / 48,
      (f.u.y - f.center.y) / 48,
      (f.v.x - f.center.x) / 48,
      (f.v.y - f.center.y) / 48,
      f.center.x,
      f.center.y,
    ];
  // Fit an upright square inside the real face so its letter cannot suggest
  // a different tap target. Edge-on faces naturally become smaller.
  let radius = 0;
  if (pointInFace(f.center, f.polygon)) {
    radius = Infinity;
    for (let i = 0; i < f.polygon.length; i++) {
      const a = f.polygon[i],
        b = f.polygon[(i + 1) % f.polygon.length];
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const span = Math.abs(dx) + Math.abs(dy);
      if (span > 0)
        radius = Math.min(
          radius,
          Math.abs(dx * (f.center.y - a.y) - dy * (f.center.x - a.x)) / span,
        );
    }
  }
  const scale = Number.isFinite(radius) ? (radius * 0.8) / 48 : 0;
  return [scale, 0, 0, scale, f.center.x, f.center.y];
}
const glyphs = new Map<string, HTMLCanvasElement>();
export function hitDie(canvas: HTMLCanvasElement, x: number, y: number) {
  return pickDie(facesByCanvas.get(canvas) ?? [], x, y);
}
export function diceFaces(canvas: HTMLCanvasElement) {
  return facesByCanvas.get(canvas) ?? [];
}
export function drawSameDieLink(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  id: number,
  a: number,
  b: number,
  color: string,
) {
  const faces = diceFaces(canvas);
  const first = faces.find((f) => f.id === id && f.face === a);
  const second = faces.find((f) => f.id === id && f.face === b);
  if (!first || !second) return;
  const edge = first.polygon.filter((p) =>
    second.polygon.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < 0.01),
  );
  if (edge.length !== 2) return;
  // The shared edge connects the chosen faces without crossing either glyph.
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(edge[0].x, edge[0].y);
  ctx.lineTo(edge[1].x, edge[1].y);
  ctx.stroke();
}
function trace(ctx: CanvasRenderingContext2D, p: XY[]) {
  ctx.moveTo(p[0].x, p[0].y);
  for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
  ctx.closePath();
}
export function excludeDie(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  id: number,
  width: number,
  height: number,
) {
  for (const face of diceFaces(canvas))
    if (face.id === id) {
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      trace(ctx, face.polygon);
      ctx.clip('evenodd');
    }
}
export function drawDice(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  game: GameState,
  view: CameraView,
  frame: Frame,
  colors: Record<string, string>,
  facingViewer = false,
) {
  const faces = projectDice(game, view, frame);
  const selected = new Set(
    game.selection.map((id, i) => `${id}:${game.selectionFaces?.[i] ?? 0}`),
  );
  const found = new Set(
    game.puzzle.words
      .filter((w) => game.found.includes(w.text))
      .flatMap((w) => w.path.map((id, i) => `${id}:${w.faces?.[i] ?? 0}`)),
  );
  facesByCanvas.set(canvas, faces);
  for (const f of faces) {
    const keyFace = `${f.id}:${f.face}`;
    const kind = selected.has(keyFace)
      ? 'selected'
      : found.has(keyFace)
        ? 'found'
        : 'normal';
    ctx.globalAlpha = 1;
    ctx.beginPath();
    trace(ctx, f.polygon);
    ctx.fillStyle = colors[kind === 'normal' ? 'tile' : kind];
    ctx.fill();
    ctx.fillStyle = `rgba(30,25,18,${[0, 0.16, 0.09, 0.18, 0.02, 0.2][f.face]})`;
    ctx.fill();
    ctx.strokeStyle =
      colors[kind === 'normal' ? 'tile-border' : kind + '-border'];
    ctx.lineWidth = kind === 'selected' ? 2 : 0.8;
    ctx.stroke();
    const ink = colors[kind === 'normal' ? 'foreground' : kind + '-text'];
    const key = f.letter + ink;
    let glyph = glyphs.get(key);
    if (!glyph) {
      glyph = document.createElement('canvas');
      glyph.width = glyph.height = 96;
      const g = glyph.getContext('2d')!;
      g.fillStyle = ink;
      g.font = '72px Georgia';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(f.letter, 48, 51);
      glyphs.set(key, glyph);
    }
    ctx.save();
    ctx.clip();
    ctx.transform(...dieGlyphTransform(f, facingViewer));
    ctx.drawImage(glyph, -48, -48);
    ctx.restore();
  }
}
