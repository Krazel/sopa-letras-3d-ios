import { Euler, Quaternion, Vector3 } from 'three';

export type CameraView = { rotation: [number, number]; distance: number };
export const HOME_VIEW: CameraView = { rotation: [-0.32, 0.52], distance: 8 };
export const MAX_DISTANCE = 14;
export const NEAR = 0.22;
const FOCAL = HOME_VIEW.distance * 17;
export const clampDistance = (distance: number) =>
  Math.max(0, Math.min(MAX_DISTANCE, distance));
export const turn = (view: CameraView, dx: number, dy: number): CameraView => ({
  ...view,
  rotation: [
    Math.max(
      -Math.PI / 2 + 0.02,
      Math.min(Math.PI / 2 - 0.02, view.rotation[0] - dy * 0.008),
    ),
    (view.rotation[1] + dx * 0.008) % (Math.PI * 2),
  ],
});
export const dolly = (view: CameraView, delta: number): CameraView => ({
  ...view,
  distance: clampDistance(view.distance + delta),
});

export function cameraPoint(p: readonly number[], view: CameraView) {
  const v = new Vector3(p[0] - 1.5, p[1] - 1.5, p[2] - 1.5).applyEuler(
    new Euler(view.rotation[0], view.rotation[1], 0, 'YXZ'),
  );
  return new Vector3(v.x, v.y, view.distance - v.z);
}

export function projectPoint(v: Vector3) {
  if (v.z < NEAR) return null;
  return {
    x: 50 + (v.x * FOCAL) / v.z,
    y: 50 + (v.y * FOCAL) / v.z,
    depth: v.z,
    scale: Math.max(0.6, Math.min(2.4, HOME_VIEW.distance / v.z)),
    fade: Math.min(1, Math.max(0, (v.z - NEAR) / 0.55)),
  };
}

// Clip in camera space before dividing by depth. A word crossing the camera
// must not flip backwards or connect to a letter behind the viewer.
export function projectSegment(start: Vector3, end: Vector3) {
  const a = start.clone(),
    b = end.clone();
  if (a.z < NEAR && b.z < NEAR) return null;
  if (a.z < NEAR) {
    a.lerp(b, (NEAR - a.z) / (b.z - a.z));
    a.z = NEAR;
  }
  if (b.z < NEAR) {
    b.lerp(a, (NEAR - b.z) / (a.z - b.z));
    b.z = NEAR;
  }
  const p = projectPoint(a)!,
    q = projectPoint(b)!;
  // Clip to the viewport as well to keep SVG geometry bounded when inside.
  let lo = 0,
    hi = 1;
  const dx = q.x - p.x,
    dy = q.y - p.y;
  for (const [den, num] of [
    [-dx, p.x],
    [dx, 100 - p.x],
    [-dy, p.y],
    [dy, 100 - p.y],
  ]) {
    if (den === 0) {
      if (num < 0) return null;
      continue;
    }
    const t = num / den;
    if (den < 0) lo = Math.max(lo, t);
    else hi = Math.min(hi, t);
    if (lo > hi) return null;
  }
  return {
    x1: p.x + lo * dx,
    y1: p.y + lo * dy,
    x2: p.x + hi * dx,
    y2: p.y + hi * dy,
  };
}

export function isInside(view: CameraView) {
  const orientation = new Quaternion().setFromEuler(
    new Euler(view.rotation[0], view.rotation[1], 0, 'YXZ'),
  );
  const position = new Vector3(0, 0, view.distance).applyQuaternion(
    orientation.invert(),
  );
  return (
    Math.max(Math.abs(position.x), Math.abs(position.y), Math.abs(position.z)) <
    1.5
  );
}

export type TouchPoint = { x: number; y: number };
export function pinch(
  view: CameraView,
  before: TouchPoint[],
  after: TouchPoint[],
) {
  const span = (p: TouchPoint[]) =>
    Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  const center = (p: TouchPoint[]) => ({
    x: (p[0].x + p[1].x) / 2,
    y: (p[0].y + p[1].y) / 2,
  });
  const a = center(before),
    b = center(after);
  return dolly(
    turn(view, b.x - a.x, b.y - a.y),
    (span(before) - span(after)) * 0.018,
  );
}
