import {
  cameraProjector,
  projectPoint,
  projectSegment,
  type CameraView,
  type ProjectedPoint,
} from './camera';
import { type GameState } from './game';
import { Vector3 } from 'three';

export type Frame = {
  size: number;
  tile: number;
  radius: number;
  font: number;
  width?: number;
  height?: number;
};
type Geometry = {
  camera: Vector3[];
  points: ProjectedPoint[];
  visible: number[];
  valid: Uint8Array;
};
const geometry = new WeakMap<HTMLCanvasElement, Geometry>();
export function motionPoints(canvas: HTMLCanvasElement) {
  return geometry.get(canvas);
}
export function hitMotion(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  frame: Frame,
) {
  const g = geometry.get(canvas);
  if (!g) return null;
  const ox = ((frame.width ?? frame.size) - frame.size) / 2,
    oy = ((frame.height ?? frame.size) - frame.size) / 2;
  for (let i = g.visible.length - 1; i >= 0; i--) {
    const id = g.visible[i],
      p = g.points[id],
      half = (frame.tile * p.scale) / 2;
    const dx = Math.abs(x - ox - (p.x * frame.size) / 100),
      dy = Math.abs(y - oy - (p.y * frame.size) / 100);
    const r = frame.radius * p.scale;
    if (
      dx <= half &&
      dy <= half &&
      (dx <= half - r ||
        dy <= half - r ||
        Math.hypot(dx - half + r, dy - half + r) <= r)
    )
      return id;
  }
  return null;
}
type Sprite = { image: HTMLCanvasElement; pad: number };
const sprites = new WeakMap<
  HTMLCanvasElement,
  { key: string; tiles: Map<string, Sprite> }
>();
const states = new WeakMap<
  GameState,
  {
    found: Set<number>;
    selected: Set<number>;
    traces: { path: number[]; kind: string }[];
  }
>();
function drawingState(game: GameState) {
  const cached = states.get(game);
  if (cached) return cached;
  const words = game.puzzle.words.filter((w) => game.found.includes(w.text));
  const found = new Set(words.flatMap((w) => w.path)),
    selected = new Set(game.selection);
  const traces = words.map((w) => ({ path: w.path, kind: 'word' }));
  traces.push({ path: game.selection, kind: 'selection' });
  const last = game.selection.at(-1);
  if (last !== undefined) {
    for (const id of game.puzzle.neighbors[last]) {
      if (!selected.has(id))
        traces.push({ path: [last, id], kind: 'neighbor' });
    }
  }
  const result = { found, selected, traces };
  states.set(game, result);
  return result;
}

function letterSprite(
  cache: Map<string, Sprite>,
  letter: string,
  kind: string,
  frame: Frame,
  colors: Record<string, string>,
): Sprite {
  const key = letter + kind,
    hit = cache.get(key);
  if (hit) return hit;
  const image = document.createElement('canvas'),
    pad = kind === 'selected' ? 12 : 1,
    scale = 4;
  image.width = image.height = Math.ceil((frame.tile + pad * 2) * scale);
  const ctx = image.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.fillStyle = colors[kind === 'normal' ? 'tile' : kind];
  ctx.strokeStyle =
    colors[kind === 'normal' ? 'tile-border' : kind + '-border'];
  ctx.lineWidth = kind === 'selected' ? 2 : 1;
  if (kind === 'selected') {
    ctx.shadowColor = '#cafa7533';
    ctx.shadowBlur = 12;
  }
  ctx.beginPath();
  ctx.roundRect(pad, pad, frame.tile, frame.tile, frame.radius);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = colors[kind === 'normal' ? 'foreground' : kind + '-text'];
  ctx.font = `600 ${frame.font}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    letter,
    pad + frame.tile / 2,
    pad + frame.tile / 2 + frame.font * 0.04,
  );
  const sprite = { image, pad };
  cache.set(key, sprite);
  return sprite;
}

// One demand-driven canvas draws both moving and resting boards. Cached letter
// images avoid rebuilding font glyphs and rounded paths for every camera frame.
export function drawMotion(
  canvas: HTMLCanvasElement,
  game: GameState,
  view: CameraView,
  frame: Frame,
  edges: [number, number][],
  colors: Record<string, string>,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx || !frame.size) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1),
    width = frame.width ?? frame.size,
    height = frame.height ?? frame.size,
    ox = (width - frame.size) / 2,
    oy = (height - frame.size) / 2;
  const bounds = {
    left: (-ox / frame.size) * 100,
    right: 100 + (ox / frame.size) * 100,
    top: (-oy / frame.size) * 100,
    bottom: 100 + (oy / frame.size) * 100,
  };
  if (
    canvas.width !== Math.round(width * dpr) ||
    canvas.height !== Math.round(height * dpr)
  ) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const projector = cameraProjector(view, game.puzzle.size);
  let g = geometry.get(canvas);
  if (!g || g.camera.length !== game.puzzle.cells.length) {
    const n = game.puzzle.cells.length;
    g = {
      camera: Array.from({ length: n }, () => new Vector3()),
      points: Array.from({ length: n }, () => ({
        x: 0,
        y: 0,
        depth: 0,
        scale: 0,
        fade: 0,
      })),
      valid: new Uint8Array(n),
      visible: [],
    };
    geometry.set(canvas, g);
  }
  const camera = g.camera,
    projected = g.points,
    visible = g.visible;
  visible.length = 0;
  for (let id = 0; id < camera.length; id++) {
    projector(game.puzzle.cells[id].position, camera[id]);
    const p = projectPoint(camera[id], projected[id]);
    g.valid[id] =
      p &&
      p.fade >= 0.05 &&
      p.x >= bounds.left - 12 &&
      p.x <= bounds.right + 12 &&
      p.y >= bounds.top - 12 &&
      p.y <= bounds.bottom + 12
        ? 1
        : 0;
    if (g.valid[id]) visible.push(id);
  }
  visible.sort((a, b) => camera[b].z - camera[a].z);
  const cacheKey = JSON.stringify([
    frame.tile,
    frame.radius,
    frame.font,
    colors,
  ]);
  let cache = sprites.get(canvas);
  if (!cache || cache.key !== cacheKey) {
    cache = { key: cacheKey, tiles: new Map() };
    sprites.set(canvas, cache);
  }
  const line = (
    a: number,
    b: number,
    color: string,
    weight: number,
    alpha: number,
  ) => {
    const p = projectSegment(camera[a], camera[b], bounds);
    if (!p) return;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = weight;
    ctx.beginPath();
    ctx.moveTo(ox + (p.x1 * frame.size) / 100, oy + (p.y1 * frame.size) / 100);
    ctx.lineTo(ox + (p.x2 * frame.size) / 100, oy + (p.y2 * frame.size) / 100);
    ctx.stroke();
  };
  for (const [a, b] of edges) line(a, b, '#668ab1', frame.size * 0.002, 0.24);
  const { found, selected: selection, traces } = drawingState(game);
  for (const id of visible) {
    const p = projected[id],
      selected = selection.has(id),
      hit = found.has(id);
    const x = ox + (p.x * frame.size) / 100,
      y = oy + (p.y * frame.size) / 100,
      side = frame.tile * p.scale;
    ctx.globalAlpha =
      selected || hit
        ? p.fade
        : (0.72 + Math.max(0, Math.min(1, 1 - p.depth / 15)) * 0.28) * p.fade;
    const sprite = letterSprite(
      cache.tiles,
      game.puzzle.cells[id].letter,
      selected ? 'selected' : hit ? 'found' : 'normal',
      frame,
      colors,
    );
    const pad = sprite.pad * p.scale;
    ctx.drawImage(
      sprite.image,
      x - side / 2 - pad,
      y - side / 2 - pad,
      side + pad * 2,
      side + pad * 2,
    );
  }
  ctx.lineCap = 'round';
  for (const trace of traces)
    for (let i = 1; i < trace.path.length; i++) {
      const a = trace.path[i - 1],
        b = trace.path[i];
      ctx.save();
      for (const id of [a, b]) {
        const p = projected[id];
        if (camera[id].z < 0.22 || p.fade < 0.05) continue;
        const side = frame.tile * p.scale;
        // Intersect the two exclusions separately: a single even-odd path
        // would incorrectly reveal the overlap between the endpoint holes.
        ctx.beginPath();
        ctx.rect(0, 0, width, height);
        ctx.roundRect(
          ox + (p.x * frame.size) / 100 - side / 2,
          oy + (p.y * frame.size) / 100 - side / 2,
          side,
          side,
          frame.radius * p.scale,
        );
        ctx.clip('evenodd');
      }
      const active = trace.kind === 'selection',
        alpha = active ? 0.58 : 0.38;
      line(a, b, colors.halo, active ? 5 : 4, alpha * 0.4);
      line(
        a,
        b,
        colors[trace.kind === 'neighbor' ? 'connection' : 'primary'],
        active ? 3.5 : trace.kind === 'neighbor' ? 2.2 : 2.5,
        alpha,
      );
      ctx.restore();
    }
  ctx.globalAlpha = 1;
}
