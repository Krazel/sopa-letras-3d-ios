import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import {
  HOME_VIEW,
  homeView,
  MAX_DISTANCE,
  NEAR,
  cameraPoint,
  projectPoint,
  projectSegment,
  dolly,
  turn,
  pinch,
  isInside,
} from '../lib/camera.ts';
void test('all six sizes are centered and framed with navigable interiors', () => {
  for (const size of [3, 4, 5, 6, 8, 10]) {
    const center = (size - 1) / 2;
    const view = homeView(size);
    assert.equal(cameraPoint([center, center, center], view, size).x, 0);
    assert(isInside({ ...view, distance: 0 }, size));
    for (let x = 0; x < size; x++)
      for (let y = 0; y < size; y++)
        for (let z = 0; z < size; z++) {
          const p = projectPoint(cameraPoint([x, y, z], view, size));
          assert(p && p.x > 0 && p.x < 100 && p.y > 0 && p.y < 100);
        }
  }
});

void test('dolly changes perspective and can travel inside, with no mirrored letters behind camera', () => {
  const outside = { rotation: [0, 0] as [number, number], distance: 8 };
  const closer = dolly(outside, -4);
  const a = projectPoint(cameraPoint([2.5, 1.5, 1.5], outside))!;
  const b = projectPoint(cameraPoint([2.5, 1.5, 1.5], closer))!;
  assert.equal(b.x - 50, 2 * (a.x - 50));
  const inside = dolly(outside, -8);
  assert.ok(isInside(inside));
  assert.equal(projectPoint(cameraPoint([1.5, 1.5, 3], inside)), null);
  assert.ok(projectPoint(cameraPoint([1.5, 1.5, 0], inside)));
  assert.equal(dolly(inside, -100).distance, 0);
  assert.equal(dolly(outside, 100).distance, MAX_DISTANCE);
});

void test('turning at the center reveals the opposite side and preserves a stable camera', () => {
  const center = { rotation: [0, 0] as [number, number], distance: 0 };
  const turned = turn(center, Math.PI / 0.008, 0);
  assert.ok(projectPoint(cameraPoint([1.5, 1.5, 3], turned)));
  assert.equal(projectPoint(cameraPoint([1.5, 1.5, 0], turned)), null);
  assert.ok(isInside(turned));
  assert.ok(!isInside(HOME_VIEW));
});

void test('vertical and horizontal drags can complete repeated revolutions without a pole stop', () => {
  const original = cameraPoint([0, 0, 0], HOME_VIEW);
  for (const axis of ['vertical', 'horizontal']) {
    for (const direction of [-1, 1]) {
      let view = HOME_VIEW;
      let previous = original;
      const pixels = (direction * Math.PI) / 180 / 0.008;
      for (let step = 0; step < 1080; step++) {
        view = turn(
          view,
          axis === 'horizontal' ? pixels : 0,
          axis === 'vertical' ? pixels : 0,
        );
        const point = cameraPoint([0, 0, 0], view);
        assert.ok(
          point.distanceTo(previous) > 0.001,
          `${axis} stalled at step ${step}`,
        );
        assert.ok(
          view.rotation.every(
            (value) => Number.isFinite(value) && Math.abs(value) <= Math.PI * 2,
          ),
        );
        previous = point;
      }
      assert.ok(
        previous.distanceTo(original) < 1e-9,
        'three full turns return to the same view',
      );
      assert.equal(view.distance, HOME_VIEW.distance);
    }
  }
});

void test('pinching works in both directions including when already at the center', () => {
  const before = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ];
  const after = [
    { x: -50, y: 0 },
    { x: 150, y: 0 },
  ];
  const closer = pinch(HOME_VIEW, before, after);
  assert.ok(closer.distance < HOME_VIEW.distance);
  assert.deepEqual(closer.rotation, HOME_VIEW.rotation);
  assert.ok(pinch({ ...HOME_VIEW, distance: 0 }, after, before).distance > 0);
});

void test('near-plane crossing and viewport clipping keep word lines finite and correctly oriented', () => {
  assert.equal(
    projectSegment(new Vector3(0, 0, -2), new Vector3(1, 1, 0)),
    null,
  );
  const segment = projectSegment(
    new Vector3(0, 0, -2),
    new Vector3(0.2, 0, 2),
  )!;
  assert.ok(segment);
  for (const v of Object.values(segment))
    assert.ok(Number.isFinite(v) && v >= -0.00001 && v <= 100.00001);
  assert.ok(projectPoint(new Vector3(0, 0, NEAR)));
  assert.equal(projectPoint(new Vector3(0, 0, NEAR - 0.001)), null);
});

void test('all home letters fit the view and sampled navigation never yields invalid geometry', () => {
  for (let x = 0; x < 4; x++)
    for (let y = 0; y < 4; y++)
      for (let z = 0; z < 4; z++) {
        const p = projectPoint(cameraPoint([x, y, z], HOME_VIEW))!;
        assert.ok(p && p.x > 0 && p.x < 100 && p.y > 0 && p.y < 100);
        for (const distance of [0, 0.22, 0.8, 2, 8, 14])
          for (const yaw of [0, 1, 2, 3, 4, 5]) {
            const q = projectPoint(
              cameraPoint([x, y, z], { rotation: [0.8, yaw], distance }),
            );
            if (q)
              for (const value of Object.values(q))
                assert.ok(Number.isFinite(value));
          }
      }
});
