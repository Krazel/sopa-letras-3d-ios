import { Euler, Quaternion, Vector3 } from 'three';

export type CameraView = {
  rotation: [number, number] | [number, number, number, number];
  distance: number;
};
const orientationOf = (view: CameraView) =>
  view.rotation.length === 4
    ? new Quaternion(...view.rotation)
    : new Quaternion().setFromEuler(
        new Euler(view.rotation[0], view.rotation[1], 0, 'YXZ'),
      );
export const HOME_VIEW: CameraView = {
  rotation: new Quaternion()
    .setFromEuler(new Euler(-0.32, 0.52, 0, 'YXZ'))
    .toArray(),
  distance: 8,
};
export const MAX_DISTANCE = 48;
export const homeView = (size: number, shape = 'cube'): CameraView =>
  shape === 'star'
    ? {
        rotation: new Quaternion()
          .setFromEuler(new Euler(-0.12, 0.18, 0, 'YXZ'))
          .toArray(),
        distance: size * 1.6,
      }
    : {
        ...HOME_VIEW,
        distance: size === 3 ? 6.5 : (8 * (size - 1)) / 3,
      };
export const NEAR = 0.22;
const FOCAL = HOME_VIEW.distance * 17;
export const clampDistance = (distance: number) =>
  Math.max(0, Math.min(MAX_DISTANCE, distance));
export function turn(view: CameraView, dx: number, dy: number): CameraView {
  const distance = Math.hypot(dx, dy);
  if (!distance) return view;
  // Compose in screen space: vertical dragging always tumbles toward/away
  // from the viewer, including after yaw, roll and passing the former poles.
  const delta = new Quaternion().setFromAxisAngle(
    new Vector3(-dy / distance, dx / distance, 0),
    distance * 0.008,
  );
  return {
    ...view,
    rotation: orientationOf(view).premultiply(delta).normalize().toArray(),
  };
}
export const dolly = (view: CameraView, delta: number): CameraView => ({
  ...view,
  distance: clampDistance(view.distance + delta),
});

export function cameraPoint(p: readonly number[], view: CameraView, size = 4) {
  return cameraProjector(view, size)(p);
}

// Compute the orientation once per frame, rather than once per letter.
export function cameraProjector(view: CameraView, size = 4) {
  const center = (size - 1) / 2;
  const orientation = orientationOf(view);
  return (p: readonly number[], target = new Vector3()) => {
    const v = target
      .set(p[0] - center, p[1] - center, p[2] - center)
      .applyQuaternion(orientation);
    v.z = view.distance - v.z;
    return v;
  };
}

export type ProjectedPoint = {
  x: number;
  y: number;
  depth: number;
  scale: number;
  fade: number;
};
export function projectPoint(v: Vector3, target = {} as ProjectedPoint) {
  if (v.z < NEAR) return null;
  target.x = 50 + (v.x * FOCAL) / v.z;
  target.y = 50 + (v.y * FOCAL) / v.z;
  target.depth = v.z;
  target.scale = Math.max(0.6, Math.min(2.4, HOME_VIEW.distance / v.z));
  target.fade = Math.min(1, Math.max(0, (v.z - NEAR) / 0.55));
  return target;
}

// Clip in camera space before dividing by depth. A word crossing the camera
// must not flip backwards or connect to a letter behind the viewer.
export function projectSegment(
  start: Vector3,
  end: Vector3,
  bounds = { left: 0, right: 100, top: 0, bottom: 100 },
) {
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
    [-dx, p.x - bounds.left],
    [dx, bounds.right - p.x],
    [-dy, p.y - bounds.top],
    [dy, bounds.bottom - p.y],
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

export function isInside(view: CameraView, size = 4) {
  const orientation = orientationOf(view);
  const position = new Vector3(0, 0, view.distance).applyQuaternion(
    orientation.invert(),
  );
  return (
    Math.max(Math.abs(position.x), Math.abs(position.y), Math.abs(position.z)) <
    (size - 1) / 2
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
  const next = dolly(
    turn(view, b.x - a.x, b.y - a.y),
    (span(before) - span(after)) * 0.018,
  );
  const angle =
    Math.atan2(after[1].y - after[0].y, after[1].x - after[0].x) -
    Math.atan2(before[1].y - before[0].y, before[1].x - before[0].x);
  return angle === 0
    ? next
    : {
        ...next,
        rotation: orientationOf(next)
          .premultiply(
            new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), angle),
          )
          .normalize()
          .toArray(),
      };
}
