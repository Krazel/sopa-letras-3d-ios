import {
  cameraPoint,
  projectPoint,
  projectSegment,
  type CameraView,
} from './camera';
import type { GameState } from './game';

// Large cubes use one canvas while the camera moves. Letter buttons remain
// available at rest for touch, keyboard and VoiceOver; the game state is shared.
export function drawMotion(
  canvas: HTMLCanvasElement,
  game: GameState,
  view: CameraView,
  frame: { size: number; tile: number; radius: number; font: number },
  edges: [number, number][],
  colors: Record<string, string>,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx || !frame.size) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1),
    width = Math.round(frame.size * dpr);
  if (canvas.width !== width) {
    canvas.width = width;
    canvas.height = width;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, frame.size, frame.size);
  const camera = game.puzzle.cells.map((c) =>
    cameraPoint(c.position, view, game.puzzle.size),
  );
  const projected = camera.map(projectPoint);
  const line = (
    a: number,
    b: number,
    color: string,
    weight: number,
    alpha: number,
  ) => {
    const p = projectSegment(camera[a], camera[b]);
    if (!p) return;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = weight;
    ctx.beginPath();
    ctx.moveTo((p.x1 * frame.size) / 100, (p.y1 * frame.size) / 100);
    ctx.lineTo((p.x2 * frame.size) / 100, (p.y2 * frame.size) / 100);
    ctx.stroke();
  };
  for (const [a, b] of edges) line(a, b, '#668ab1', frame.size * 0.002, 0.24);
  const found = new Set(
    game.puzzle.words
      .filter((w) => game.found.includes(w.text))
      .flatMap((w) => w.path),
  );
  const visible = projected
    .map((p, id) => ({ p, id }))
    .filter(
      ({ p }) =>
        p &&
        p.fade >= 0.05 &&
        p.x >= -5 &&
        p.x <= 105 &&
        p.y >= -5 &&
        p.y <= 105,
    )
    .sort((a, b) => b.p!.depth - a.p!.depth);
  for (const { p: point, id } of visible) {
    const p = point!,
      selected = game.selection.includes(id),
      hit = found.has(id);
    const x = (p.x * frame.size) / 100,
      y = (p.y * frame.size) / 100,
      side = frame.tile * p.scale;
    ctx.globalAlpha =
      selected || hit
        ? p.fade
        : (0.72 + Math.max(0, Math.min(1, 1 - p.depth / 15)) * 0.28) * p.fade;
    ctx.fillStyle = colors[selected ? 'selected' : hit ? 'found' : 'tile'];
    ctx.strokeStyle =
      colors[
        selected ? 'selected-border' : hit ? 'found-border' : 'tile-border'
      ];
    ctx.lineWidth = (selected ? 2 : 1) * p.scale;
    ctx.beginPath();
    ctx.roundRect(
      x - side / 2,
      y - side / 2,
      side,
      side,
      frame.radius * p.scale,
    );
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle =
      colors[selected ? 'selected-text' : hit ? 'found-text' : 'foreground'];
    ctx.font = `600 ${frame.font * p.scale}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      game.puzzle.cells[id].letter,
      x,
      y + frame.font * p.scale * 0.04,
    );
  }
  const traces = game.puzzle.words
    .filter((w) => game.found.includes(w.text))
    .map((w) => ({ path: w.path, kind: 'word' }));
  traces.push({ path: game.selection, kind: 'selection' });
  const last = game.selection.at(-1);
  // Neighbor list derives from coordinates directly, avoiding an all-pairs graph.
  if (last !== undefined) {
    const origin = game.puzzle.cells[last].position;
    for (const c of game.puzzle.cells)
      if (
        !game.selection.includes(c.id) &&
        c.position.every((v, axis) => Math.abs(v - origin[axis]) <= 1)
      )
        traces.push({ path: [last, c.id], kind: 'neighbor' });
  }
  ctx.lineCap = 'round';
  for (const trace of traces)
    for (let i = 1; i < trace.path.length; i++) {
      const a = trace.path[i - 1],
        b = trace.path[i];
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, frame.size, frame.size);
      for (const id of [a, b]) {
        const p = projected[id];
        if (!p || p.fade < 0.05) continue;
        const side = frame.tile * p.scale;
        ctx.roundRect(
          (p.x * frame.size) / 100 - side / 2,
          (p.y * frame.size) / 100 - side / 2,
          side,
          side,
          frame.radius * p.scale,
        );
      }
      ctx.clip('evenodd');
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
