'use client';

// The 3D board is a keyboard-operated application containing letter buttons;
// a button or slider wrapper would give it incorrect nested-control semantics.
/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from 'react';
import { initialState, isWon, selectCell, areNeighbors } from '@/lib/game';
import {
  HOME_VIEW,
  cameraPoint,
  projectPoint,
  projectSegment,
  isInside,
  turn,
  dolly,
  pinch,
  type CameraView,
  type TouchPoint,
} from '@/lib/camera';

export default function Game() {
  const [game, setGame] = useState(() => initialState());
  const [view, setView] = useState<CameraView>(HOME_VIEW);
  const viewRef = useRef(view);
  const connectionMaskId = useId();
  const [frame, setFrame] = useState({ size: 0, tile: 38, radius: 9 });
  const stageRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, TouchPoint>());
  const pressOrigin = useRef<TouchPoint | null>(null);
  const suppressPick = useRef(false);
  function moveCamera(next: CameraView) {
    viewRef.current = next;
    setView(next);
  }
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? stage.clientHeight
            : 1;
      moveCamera(
        dolly(
          viewRef.current,
          Math.max(-150, Math.min(150, event.deltaY * unit)) * 0.008,
        ),
      );
    };
    const cancel = () => {
      pointers.current.clear();
      pressOrigin.current = null;
      suppressPick.current = true;
    };
    // A selection gesture can leave the board before release. Clear it even
    // outside the stage so the next press cannot become a phantom pinch.
    const releaseOutside = (event: globalThis.PointerEvent) => {
      pointers.current.delete(event.pointerId);
      if (event.type === 'pointercancel') suppressPick.current = true;
    };
    // Use the same CSS dimensions as the letter buttons, including mobile
    // sizes. The mask stays aligned with their scaled, rounded borders.
    const measure = () => {
      const bounds = stage.getBoundingClientRect();
      const css = getComputedStyle(stage);
      const next = {
        size: Math.max(0, Math.min(bounds.width, bounds.height, 800)),
        tile: parseFloat(css.getPropertyValue('--letter-size')),
        radius: parseFloat(css.getPropertyValue('--letter-radius')),
      };
      setFrame((old) =>
        old.size === next.size &&
        old.tile === next.tile &&
        old.radius === next.radius
          ? old
          : next,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    window.addEventListener('resize', measure);
    measure();
    stage.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('blur', cancel);
    window.addEventListener('pointerup', releaseOutside);
    window.addEventListener('pointercancel', releaseOutside);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      stage.removeEventListener('wheel', wheel);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('pointerup', releaseOutside);
      window.removeEventListener('pointercancel', releaseOutside);
    };
  }, []);
  const won = isWon(game);
  const lastSelected = game.selection.at(-1);
  const neighbors = new Set(
    lastSelected === undefined
      ? []
      : game.puzzle.cells
          .filter(
            (c) =>
              areNeighbors(lastSelected, c.id) &&
              !game.selection.includes(c.id),
          )
          .map((c) => c.id),
  );
  const foundCells = useMemo(
    () =>
      new Set(
        game.puzzle.words
          .filter((w) => game.found.includes(w.text))
          .flatMap((w) => w.path),
      ),
    [game],
  );
  // Move the viewpoint through the volume, rather than magnifying a flat board.
  const cameraPoints = game.puzzle.cells.map((c) =>
    cameraPoint(c.position, view),
  );
  const points = cameraPoints.map(projectPoint);
  const edges: [number, number][] = [];
  for (let z = 0; z < 4; z++) {
    const base = z * 16;
    edges.push(
      [base, base + 3],
      [base + 3, base + 15],
      [base + 15, base + 12],
      [base + 12, base],
    );
  }
  for (const corner of [0, 3, 12, 15]) edges.push([corner, corner + 48]);
  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (pointers.current.size === 0) {
      suppressPick.current = false;
      pressOrigin.current = { x: e.clientX, y: e.clientY };
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size > 1) {
      suppressPick.current = true;
      for (const id of pointers.current.keys())
        e.currentTarget.setPointerCapture(id);
    }
  }
  function onMove(e: PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(e.pointerId);
    if (!previous) return;
    const before = [...pointers.current.values()];
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2) {
      suppressPick.current = true;
      moveCamera(
        pinch(viewRef.current, before, [...pointers.current.values()]),
      );
    } else {
      const origin = pressOrigin.current;
      if (origin && Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > 6)
        suppressPick.current = true;
      if (suppressPick.current) {
        e.currentTarget.setPointerCapture(e.pointerId);
        moveCamera(
          turn(viewRef.current, e.clientX - previous.x, e.clientY - previous.y),
        );
      }
    }
  }
  function onUp(e: PointerEvent<HTMLDivElement>) {
    const origin = pressOrigin.current;
    if (origin && Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > 6)
      suppressPick.current = true;
    pointers.current.delete(e.pointerId);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    if (e.type === 'pointercancel') suppressPick.current = true;
    pressOrigin.current = pointers.current.values().next().value ?? null;
  }
  return (
    <main className="game-shell" aria-label="Sopa de letras 3D">
      <p className="game-help">
        <span>Une letras vecinas y encuentra las 6 palabras.</span>
        <span>
          Toca para elegir · Arrastra para girar · Pellizca o usa la rueda para
          el zoom.
        </span>
      </p>
      <p id="gesture-help" className="sr-only">
        Toca y suelta letras vecinas para formar palabras. Arrastra para girar
        sin límites; pellizca o usa la rueda para acercarte y alejarte. Toca la
        última letra para deshacer. Con el cubo enfocado, usa las flechas para
        girar y más o menos para el zoom.
      </p>
      <div className="game-board">
        <div
          ref={stageRef}
          className="cube-stage"
          role="application"
          aria-label="Cubo de letras"
          aria-describedby="gesture-help"
          tabIndex={0}
          data-distance={view.distance.toFixed(3)}
          data-rotation={view.rotation.join(',')}
          data-inside={isInside(view)}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onLostPointerCapture={(e) => {
            if (
              e.target === e.currentTarget &&
              pointers.current.has(e.pointerId)
            ) {
              suppressPick.current = true;
              onUp(e);
            }
          }}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            const directions: Record<string, [number, number]> = {
              ArrowLeft: [-30, 0],
              ArrowRight: [30, 0],
              ArrowUp: [0, 30],
              ArrowDown: [0, -30],
            };
            if (directions[e.key]) {
              e.preventDefault();
              moveCamera(turn(viewRef.current, ...directions[e.key]));
            } else if (['+', '=', '-'].includes(e.key)) {
              e.preventDefault();
              moveCamera(dolly(viewRef.current, e.key === '-' ? 0.65 : -0.65));
            }
          }}
        >
          <div
            className="cube-volume"
            style={frame.size ? { width: frame.size } : undefined}
          >
            <svg
              className="cube-lines"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {edges.map(([a, b], i) => {
                const segment = projectSegment(
                  cameraPoints[a],
                  cameraPoints[b],
                );
                return (
                  segment && <line key={i} {...segment} className="cage-line" />
                );
              })}
            </svg>
            <svg
              className="cube-lines connection-overlay"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <mask
                  id={connectionMaskId}
                  maskUnits="userSpaceOnUse"
                  maskContentUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width="100"
                  height="100"
                  style={{ maskType: 'luminance' }}
                >
                  <rect width="100" height="100" fill="white" />
                  {frame.size > 0 &&
                    points.map((p, id) => {
                      if (
                        !p ||
                        p.fade < 0.05 ||
                        p.x < -5 ||
                        p.x > 105 ||
                        p.y < -5 ||
                        p.y > 105
                      )
                        return null;
                      const side = (frame.tile * p.scale * 100) / frame.size;
                      return (
                        <rect
                          key={id}
                          x={p.x - side / 2}
                          y={p.y - side / 2}
                          width={side}
                          height={side}
                          rx={(frame.radius * p.scale * 100) / frame.size}
                          fill="black"
                        />
                      );
                    })}
                </mask>
              </defs>
              <g
                mask={`url(#${connectionMaskId})`}
                visibility={frame.size > 0 ? 'visible' : 'hidden'}
              >
                {lastSelected !== undefined &&
                  [...neighbors].map((id) => {
                    const segment = projectSegment(
                      cameraPoints[lastSelected],
                      cameraPoints[id],
                    );
                    return (
                      segment && (
                        <g key={`neighbor-${id}`}>
                          <line {...segment} className="connection-halo" />
                          <line {...segment} className="neighbor-line" />
                        </g>
                      )
                    );
                  })}
                {[
                  ...game.puzzle.words
                    .filter((w) => game.found.includes(w.text))
                    .map((w) => ({ key: w.text, path: w.path, active: false })),
                  { key: 'selection', path: game.selection, active: true },
                ].flatMap((trace) =>
                  trace.path.slice(1).map((id, index) => {
                    const segment = projectSegment(
                      cameraPoints[trace.path[index]],
                      cameraPoints[id],
                    );
                    return (
                      segment && (
                        <g key={`${trace.key}-${index}`}>
                          <line
                            {...segment}
                            className={`connection-halo ${trace.active ? 'active-halo' : ''}`}
                          />
                          <line
                            {...segment}
                            className={
                              trace.active ? 'selection-line' : 'word-line'
                            }
                          />
                        </g>
                      )
                    );
                  }),
                )}
              </g>
            </svg>

            {game.puzzle.cells.map((cell, i) => {
              const p = points[i];
              if (
                !p ||
                p.fade < 0.05 ||
                p.x < -5 ||
                p.x > 105 ||
                p.y < -5 ||
                p.y > 105
              )
                return null;
              const selected = game.selection.includes(i);
              const found = foundCells.has(i);
              return (
                <button
                  key={i}
                  data-cell={i}
                  className={`letter ${selected ? 'selected' : ''} ${found ? 'found' : ''} ${neighbors.has(i) ? 'neighbor' : ''}`}
                  style={
                    {
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      zIndex: Math.round(95 - p.depth * 4),
                      '--depth': Math.max(0, Math.min(1, 1 - p.depth / 15)),
                      '--scale': p.scale,
                      '--fade': p.fade,
                    } as React.CSSProperties
                  }
                  onClick={(e) => {
                    if (e.detail === 0 || !suppressPick.current)
                      setGame((s) => selectCell(s, i));
                  }}
                  aria-pressed={selected}
                  aria-label={`${cell.letter}, columna ${cell.position[0] + 1}, fila ${cell.position[1] + 1}, capa ${cell.position[2] + 1}${selected ? ', seleccionada' : ''}${found ? ', encontrada' : ''}`}
                >
                  {cell.letter}
                </button>
              );
            })}
          </div>
        </div>
        <ul
          className={`word-list ${won ? 'solved' : ''}`}
          aria-label="Palabras por encontrar"
        >
          {game.puzzle.words.map((word) => (
            <li
              key={word.text}
              className={game.found.includes(word.text) ? 'complete' : ''}
              aria-label={`${word.text}${game.found.includes(word.text) ? ', encontrada' : ''}`}
            >
              {word.text}
            </li>
          ))}
        </ul>
      </div>
      <output className="sr-only" aria-live="polite">
        {game.message}
      </output>
    </main>
  );
}
