'use client';

// The 3D board is a keyboard-operated application containing letter buttons;
// a button or slider wrapper would give it incorrect nested-control semantics.
/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */

import {
  useEffect,
  useLayoutEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
} from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { drawMotion } from '@/lib/motion';
import {
  startPuzzle,
  PUZZLES,
  DEFAULT_PUZZLE,
  isWon,
  selectCell,
  areNeighbors,
  type GameState,
} from '@/lib/game';
import {
  HOME_VIEW,
  homeView,
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

let fallbackTheme: 'dark' | 'light' = 'dark';
function readTheme(): 'dark' | 'light' {
  try {
    return localStorage.getItem('sopa-theme') === 'light' ? 'light' : 'dark';
  } catch {
    return fallbackTheme;
  }
}
function subscribeTheme(update: () => void) {
  window.addEventListener('storage', update);
  window.addEventListener('sopa-theme', update);
  return () => {
    window.removeEventListener('storage', update);
    window.removeEventListener('sopa-theme', update);
  };
}

export default function Game() {
  const [puzzleId, setPuzzleId] = useState(DEFAULT_PUZZLE);
  const [game, setGame] = useState(() => startPuzzle(DEFAULT_PUZZLE));
  const games = useRef(new Map<string, GameState>());
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => 'dark');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'light' ? '#ffffff' : '#0b1120');
    if (Capacitor.isNativePlatform())
      void StatusBar.setStyle({
        style: theme === 'light' ? Style.Light : Style.Dark,
      });
  }, [theme]);
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    fallbackTheme = next;
    try {
      localStorage.setItem('sopa-theme', next);
    } catch {
      /* Keep the current session usable. */
    }
    window.dispatchEvent(new Event('sopa-theme'));
  }
  const [view, setView] = useState<CameraView>(HOME_VIEW);
  const viewRef = useRef(view);
  const cameraFrame = useRef<number | null>(null);
  const settleFrame = useRef<ReturnType<typeof setTimeout> | null>(null);
  const motionCanvas = useRef<HTMLCanvasElement>(null);
  const motionRenderer = useRef<((view: CameraView) => void) | null>(null);
  useEffect(
    () => () => {
      if (cameraFrame.current !== null)
        cancelAnimationFrame(cameraFrame.current);
      if (settleFrame.current !== null) clearTimeout(settleFrame.current);
    },
    [],
  );
  const connectionMaskId = useId();
  const [frame, setFrame] = useState({
    size: 0,
    tile: 38,
    radius: 9,
    font: 21,
  });
  const stageRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, TouchPoint>());
  const pressOrigin = useRef<TouchPoint | null>(null);
  const suppressPick = useRef(false);
  function moveCamera(next: CameraView) {
    viewRef.current = next;
    if (settleFrame.current !== null) clearTimeout(settleFrame.current);
    settleFrame.current = setTimeout(commitCamera, 140);
    if (cameraFrame.current === null)
      cameraFrame.current = requestAnimationFrame(() => {
        cameraFrame.current = null;
        if (motionRenderer.current) {
          motionRenderer.current(viewRef.current);
          stageRef.current?.classList.add('moving');
        } else setView(viewRef.current);
      });
  }
  function commitCamera() {
    if (cameraFrame.current !== null) cancelAnimationFrame(cameraFrame.current);
    cameraFrame.current = null;
    if (settleFrame.current !== null) clearTimeout(settleFrame.current);
    settleFrame.current = null;
    setView(viewRef.current);
  }
  useLayoutEffect(() => {
    stageRef.current?.classList.remove('moving');
  }, [view, game, frame]);
  function changePuzzle(id: string, replay = false) {
    games.current.set(puzzleId, game);
    const next = replay
      ? startPuzzle(id)
      : (games.current.get(id) ?? startPuzzle(id));
    setPuzzleId(id);
    setGame(next);
    pointers.current.clear();
    pressOrigin.current = null;
    suppressPick.current = true;
    moveCamera(homeView(next.puzzle.size));
    commitCamera();
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
      commitCamera();
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
        font: parseFloat(css.getPropertyValue('--letter-font-size')),
      };
      setFrame((old) =>
        old.size === next.size &&
        old.tile === next.tile &&
        old.radius === next.radius &&
        old.font === next.font
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
  const size = game.puzzle.size;
  const lastSelected = game.selection.at(-1);
  const neighbors = useMemo(
    () =>
      new Set(
        lastSelected === undefined
          ? []
          : game.puzzle.cells
              .filter(
                (c) =>
                  areNeighbors(lastSelected, c.id, size) &&
                  !game.selection.includes(c.id),
              )
              .map((c) => c.id),
      ),
    [game, lastSelected, size],
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
  const cameraPoints = useMemo(
    () => game.puzzle.cells.map((c) => cameraPoint(c.position, view, size)),
    [game.puzzle.cells, view, size],
  );
  const points = cameraPoints.map(projectPoint);
  const edges = useMemo(() => {
    const edges: [number, number][] = [];
    const far = size * size - 1,
      row = size * (size - 1);
    for (let z = 0; z < size; z++) {
      const base = z * size * size;
      edges.push(
        [base, base + size - 1],
        [base + size - 1, base + far],
        [base + far, base + row],
        [base + row, base],
      );
    }
    for (const corner of [0, size - 1, row, far])
      edges.push([corner, corner + size * size * (size - 1)]);
    return edges;
  }, [size]);
  useEffect(() => {
    if (size < 8) {
      motionRenderer.current = null;
      return;
    }
    const css = getComputedStyle(document.documentElement);
    const colors = Object.fromEntries(
      [
        'foreground',
        'tile',
        'tile-border',
        'selected',
        'selected-text',
        'selected-border',
        'found',
        'found-text',
        'found-border',
        'halo',
        'connection',
        'primary',
      ].map((key) => [key, css.getPropertyValue(`--${key}`).trim()]),
    );
    motionRenderer.current = (next) => {
      if (motionCanvas.current)
        drawMotion(motionCanvas.current, game, next, frame, edges, colors);
    };
  }, [game, size, frame, edges, theme]);
  function connection(a: number, b: number, key: string, kind: string) {
    const segment = projectSegment(cameraPoints[a], cameraPoints[b]);
    if (!segment || frame.size <= 0) return null;
    const maskId = `${connectionMaskId}-${key}`;
    return (
      <g key={key}>
        <defs>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            maskContentUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="100"
            height="100"
            style={{ maskType: 'luminance' }}
          >
            <rect width="100" height="100" fill="white" />
            {/* Only this connection's endpoints interrupt it. Other letters
              remain underneath the translucent foreground stroke. */}
            {[a, b].map((id) => {
              const p = points[id];
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
          mask={`url(#${maskId})`}
          className={`connection ${kind === 'selection-line' ? 'active-connection' : ''}`}
        >
          <line {...segment} className="connection-halo" />
          <line {...segment} className={kind} />
        </g>
      </g>
    );
  }
  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (pointers.current.size === 0) {
      suppressPick.current =
        stageRef.current?.classList.contains('moving') ?? false;
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
    if (pointers.current.size === 0) commitCamera();
  }
  return (
    <main className="game-shell" aria-label="Sopa de letras 3D">
      <p className="game-help">
        <span>
          {`Une letras vecinas y encuentra las ${game.puzzle.words.length} palabras.`}
        </span>
        <span>
          Toca para elegir · Arrastra para girar · Pellizca o usa la rueda para
          el zoom.
        </span>
      </p>
      <div className="game-options">
        <select
          aria-label="Sopa"
          value={puzzleId}
          onChange={(e) => changePuzzle(e.target.value)}
        >
          {[3, 4, 5, 6, 8, 10].map((n) => (
            <optgroup key={n} label={`${n}×${n}×${n} · ${n ** 3} letras`}>
              {PUZZLES.filter((p) => p.size === n).map((p) => (
                <option key={p.id} value={p.id}>
                  {n}×{n}×{n} · {p.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Cambiar a tema ${theme === 'dark' ? 'claro' : 'oscuro'}`}
        >
          {theme === 'dark' ? '◐ Claro' : '◑ Oscuro'}
        </button>
      </div>
      <p id="gesture-help" className="sr-only">
        Toca y suelta letras vecinas para formar palabras. Arrastra para girar
        sin límites; pellizca o usa la rueda para acercarte y alejarte. Toca la
        última letra para deshacer. Con el cubo enfocado, usa las flechas para
        girar y más o menos para el zoom. Tocar una letra no vecina borra la
        selección.
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
          data-inside={isInside(view, size)}
          data-size={size}
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
            {size >= 8 && (
              <canvas
                ref={motionCanvas}
                className="motion-canvas"
                aria-hidden="true"
              />
            )}
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
              {lastSelected !== undefined &&
                [...neighbors].map((id) =>
                  connection(
                    lastSelected,
                    id,
                    `neighbor-${id}`,
                    'neighbor-line',
                  ),
                )}
              {[
                ...game.puzzle.words
                  .filter((w) => game.found.includes(w.text))
                  .map((w) => ({
                    key: w.text,
                    path: w.path,
                    kind: 'word-line',
                  })),
                {
                  key: 'selection',
                  path: game.selection,
                  kind: 'selection-line',
                },
              ].flatMap((trace) =>
                trace.path
                  .slice(1)
                  .map((id, index) =>
                    connection(
                      trace.path[index],
                      id,
                      `${trace.key}-${index}`,
                      trace.kind,
                    ),
                  ),
              )}
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
                  className={`letter ${selected ? 'selected' : ''} ${found ? 'found' : ''}`}
                  style={
                    {
                      '--x': `${(p.x * frame.size) / 100}px`,
                      '--y': `${(p.y * frame.size) / 100}px`,
                      zIndex: Math.max(1, Math.round(95 - p.depth * 4)),
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
          data-long={size >= 8}
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
      {won && (
        <output className="victory">
          <span>¡Sopa completada!</span>
          <button onClick={() => changePuzzle(puzzleId, true)}>
            Volver a jugar
          </button>
          <button
            onClick={() =>
              changePuzzle(
                PUZZLES[
                  (PUZZLES.findIndex((p) => p.id === puzzleId) + 1) %
                    PUZZLES.length
                ].id,
              )
            }
          >
            Otra sopa
          </button>
        </output>
      )}
      <output className="sr-only" aria-live="polite">
        {game.message}
      </output>
    </main>
  );
}
