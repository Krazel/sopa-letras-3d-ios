'use client';

// The 3D board is a keyboard-operated application containing letter buttons;
// a button or slider wrapper would give it incorrect nested-control semantics.
/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */

import {
  useEffect,
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
} from 'react';
import { applyTheme } from '@/lib/theme';
import { drawMotion, motionPoints, hitMotion } from '@/lib/motion';
import { hitDie } from '@/lib/dice';
import {
  startPuzzle,
  PUZZLES,
  DEFAULT_PUZZLE,
  isWon,
  selectCell,
  selectDie,
  dieLetters,
  selectionText,
  type GameState,
  type Cell,
} from '@/lib/game';
import {
  HOME_VIEW,
  homeView,
  isInside,
  turn,
  dolly,
  pinch,
  type CameraView,
  type TouchPoint,
} from '@/lib/camera';

let fallbackTheme: 'dark' | 'light' = 'light';
function readTheme(): 'dark' | 'light' {
  try {
    return localStorage.getItem('sopa-theme') === 'dark' ? 'dark' : 'light';
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

const Letter = memo(function Letter({
  cell,
  selected,
  found,
  register,
  choose,
  faces,
}: {
  cell: Cell;
  selected: boolean;
  found: boolean;
  register: (id: number, node: HTMLButtonElement | null) => void;
  choose: (id: number) => void;
  faces?: string[];
}) {
  const attach = useCallback(
    (node: HTMLButtonElement | null) => register(cell.id, node),
    [cell.id, register],
  );
  return (
    <button
      ref={attach}
      data-cell={cell.id}
      className={`letter ${selected ? 'selected' : ''} ${found ? 'found' : ''}`}
      onClick={(e) => {
        if (e.detail === 0) {
          e.stopPropagation();
          choose(cell.id);
        }
      }}
      aria-pressed={selected}
      aria-label={`${faces ? `Dado ${faces.join(', ')}` : cell.letter}, columna ${cell.position[0] + 1}, fila ${cell.position[1] + 1}, capa ${cell.position[2] + 1}${selected ? ', seleccionada' : ''}${found ? ', encontrada' : ''}`}
    ></button>
  );
});

export default function Game({
  initial,
  title,
  onExit,
  onProgress,
  onNext,
  nextLabel,
  dice = false,
  pageNumber,
}: {
  initial?: GameState;
  title?: string;
  onExit?: () => void;
  onProgress?: (game: GameState) => void;
  onNext?: () => void;
  nextLabel?: string;
  dice?: boolean;
  pageNumber?: number;
} = {}) {
  const [puzzleId, setPuzzleId] = useState(DEFAULT_PUZZLE);
  const [game, setGame] = useState(
    () => initial ?? startPuzzle(DEFAULT_PUZZLE),
  );
  const games = useRef(new Map<string, GameState>());
  const [controlsHidden, setControlsHidden] = useState(false);
  const [dieFocus, setDieFocus] = useState<number | null>(null);
  const theme = useSyncExternalStore<'dark' | 'light'>(
    subscribeTheme,
    readTheme,
    () => 'light',
  );
  useLayoutEffect(() => {
    applyTheme(theme);
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
  const viewRef = useRef<CameraView>(
    initial ? homeView(initial.puzzle.size, initial.puzzle.shape) : HOME_VIEW,
  );
  useEffect(() => {
    onProgress?.(game);
  }, [game, onProgress]);
  const letterNodes = useRef<(HTMLButtonElement | null)[]>([]);
  const targetFrame = useRef<number | null>(null);
  const targetSync = useRef<() => void>(() => {});
  const registerLetter = useCallback(
    (id: number, node: HTMLButtonElement | null) => {
      letterNodes.current[id] = node;
    },
    [],
  );
  const chooseLetter = useCallback(
    (id: number) =>
      dice ? setDieFocus(id) : setGame((s) => selectCell(s, id)),
    [dice],
  );
  const cameraFrame = useRef<number | null>(null);
  const settleFrame = useRef<ReturnType<typeof setTimeout> | null>(null);
  const motionCanvas = useRef<HTMLCanvasElement>(null);
  const motionRenderer = useRef<((view: CameraView) => void) | null>(null);
  useEffect(
    () => () => {
      if (targetFrame.current !== null)
        cancelAnimationFrame(targetFrame.current);
      if (cameraFrame.current !== null)
        cancelAnimationFrame(cameraFrame.current);
      if (settleFrame.current !== null) clearTimeout(settleFrame.current);
    },
    [],
  );
  const [frame, setFrame] = useState({
    size: 0,
    width: 0,
    height: 0,
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
    if (targetFrame.current !== null) cancelAnimationFrame(targetFrame.current);
    targetFrame.current = null;
    if (settleFrame.current !== null) clearTimeout(settleFrame.current);
    settleFrame.current =
      pointers.current.size === 0 ? setTimeout(commitCamera, 140) : null;
    if (cameraFrame.current === null)
      cameraFrame.current = requestAnimationFrame(() => {
        cameraFrame.current = null;
        if (motionRenderer.current) {
          motionRenderer.current(viewRef.current);
          const stage = stageRef.current;
          if (stage && !stage.classList.contains('moving'))
            stage.classList.add('moving');
        }
      });
  }
  function commitCamera() {
    if (cameraFrame.current !== null) cancelAnimationFrame(cameraFrame.current);
    cameraFrame.current = null;
    if (settleFrame.current !== null) clearTimeout(settleFrame.current);
    settleFrame.current = null;
    motionRenderer.current?.(viewRef.current);
    targetSync.current();
  }
  function syncTargets() {
    if (targetFrame.current !== null) cancelAnimationFrame(targetFrame.current);
    const stage = stageRef.current,
      canvas = motionCanvas.current;
    if (!stage || !canvas) return;
    const g = motionPoints(canvas);
    if (!g) return;
    stage.dataset.distance = viewRef.current.distance.toFixed(3);
    stage.dataset.rotation = viewRef.current.rotation.join(',');
    stage.dataset.inside = String(isInside(viewRef.current, game.puzzle.size));
    stage.dataset.ready = 'false';
    stage.classList.remove('moving');
    const ox = (frame.width - frame.size) / 2,
      oy = (frame.height - frame.size) / 2;
    let index = 0;
    const update = () => {
      const end = Math.min(index + 32, g.points.length);
      for (; index < end; index++) {
        const node = letterNodes.current[index];
        if (!node) continue;
        const hidden = !g.valid[index];
        if (node.hidden !== hidden) node.hidden = hidden;
        if (hidden) continue;
        const p = g.points[index];
        const transform = `translate(${(ox + (p.x * frame.size) / 100).toFixed(2)}px, ${(oy + (p.y * frame.size) / 100).toFixed(2)}px) translate(-50%, -50%) scale(${p.scale.toFixed(4)})`;
        if (node.style.transform !== transform)
          node.style.transform = transform;
        const depth = String(Math.max(1, Math.round(100000 - p.depth * 1000)));
        if (node.style.zIndex !== depth) node.style.zIndex = depth;
      }
      if (index < g.points.length)
        targetFrame.current = requestAnimationFrame(update);
      else {
        targetFrame.current = null;
        stage.dataset.ready = 'true';
      }
    };
    update();
  }
  targetSync.current = syncTargets;
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
    moveCamera(homeView(next.puzzle.size, next.puzzle.shape));
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
        width: bounds.width,
        height: bounds.height,
        tile: parseFloat(css.getPropertyValue('--letter-size')),
        radius: parseFloat(css.getPropertyValue('--letter-radius')),
        font: parseFloat(css.getPropertyValue('--letter-font-size')),
      };
      setFrame((old) =>
        old.size === next.size &&
        old.width === next.width &&
        old.height === next.height &&
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
  const foundCells = useMemo(
    () =>
      new Set(
        game.puzzle.words
          .filter((w) => game.found.includes(w.text))
          .flatMap((w) => w.path),
      ),
    [game],
  );
  const edges = game.puzzle.edges;
  const paintColors = useRef<Record<string, string>>({});
  useLayoutEffect(() => {
    const css = getComputedStyle(document.documentElement);
    paintColors.current = Object.fromEntries(
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
  }, [theme]);
  useLayoutEffect(() => {
    motionRenderer.current = (next) => {
      if (motionCanvas.current && frame.size) {
        drawMotion(
          motionCanvas.current,
          game,
          next,
          frame,
          edges,
          paintColors.current,
          dice,
        );
        const stage = stageRef.current;
        if (stage && !stage.classList.contains('canvas-ready'))
          stage.classList.add('canvas-ready');
      }
    };
    motionRenderer.current(viewRef.current);
    targetSync.current();
  }, [game, size, frame, edges, theme, dice]);
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
    if (pointers.current.size === 0) commitCamera();
  }
  return (
    <main
      className="game-shell book-page"
      data-mode={dice ? 'dice' : 'letters'}
      data-controls-hidden={controlsHidden}
      aria-label="Sopa de letras 3D"
    >
      <button
        type="button"
        className="controls-toggle"
        aria-controls="game-controls"
        aria-expanded={!controlsHidden}
        aria-label={controlsHidden ? 'Mostrar controles' : 'Ocultar controles'}
        onClick={() => setControlsHidden((v) => !v)}
      >
        <span aria-hidden="true">{controlsHidden ? '⌄' : '⌃'}</span>
      </button>
      <div id="game-controls" className="game-controls" hidden={controlsHidden}>
        <div className="book-game-heading">
          {onExit && (
            <button
              className="book-back"
              onClick={onExit}
              aria-label="Volver al menú"
            >
              ‹
            </button>
          )}
          <h1>{title ?? 'Mi sopa de letras'}</h1>
          <span className="book-ribbon" aria-hidden="true">
            {dice ? '⚄' : '≋'}
          </span>
        </div>
        <p className="game-help">
          <span>
            {`Une letras vecinas y encuentra las ${game.puzzle.words.length} palabras.`}
          </span>
          <span>
            {dice ? 'Toca una cara' : 'Toca letras'} · Arrastra para girar ·
            Pellizca para acercar
          </span>
        </p>
        <div className="game-options">
          {!initial && (
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
              <optgroup label="Otras formas">
                <option value="estrella">Estrella 3D</option>
              </optgroup>
            </select>
          )}
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Cambiar a tema ${theme === 'dark' ? 'claro' : 'oscuro'}`}
          >
            {theme === 'dark' ? '◐ Claro' : '◑ Oscuro'}
          </button>
        </div>
      </div>
      <p id="gesture-help" className="sr-only">
        Toca y suelta letras vecinas para formar palabras. Arrastra para girar
        sin límites; pellizca o usa la rueda para acercarte y alejarte. Toca la
        última letra para deshacer. Con la figura enfocada, usa las flechas para
        girar y más o menos para el zoom. Tocar una letra no vecina borra la
        selección.
      </p>
      <div className="game-board">
        <div
          ref={stageRef}
          className="cube-stage"
          role="application"
          aria-label={
            game.puzzle.shape === 'star'
              ? 'Estrella de letras'
              : 'Cubo de letras'
          }
          aria-describedby="gesture-help"
          tabIndex={0}
          data-size={size}
          data-shape={game.puzzle.shape}
          data-dice={dice}
          onClick={(e) => {
            if (e.detail === 0 || suppressPick.current || !motionCanvas.current)
              return;
            const rect = e.currentTarget.getBoundingClientRect();
            if (dice) {
              const face = hitDie(
                motionCanvas.current,
                e.clientX - rect.left,
                e.clientY - rect.top,
              );
              if (face) setGame((s) => selectDie(s, face.id, face.face));
              return;
            }
            const id = hitMotion(
              motionCanvas.current,
              e.clientX - rect.left,
              e.clientY - rect.top,
              frame,
            );
            if (id !== null) chooseLetter(id);
          }}
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
          <div className="cube-volume">
            <canvas
              ref={motionCanvas}
              className="motion-canvas"
              aria-hidden="true"
            />
            {game.puzzle.cells.map((cell) => (
              <Letter
                key={cell.id}
                cell={cell}
                selected={game.selection.includes(cell.id)}
                found={foundCells.has(cell.id)}
                register={registerLetter}
                choose={chooseLetter}
                faces={dice ? dieLetters(cell, game.puzzle.seed) : undefined}
              />
            ))}
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
      {dice && game.selection.length > 0 && (
        <output className="dice-selection" aria-live="polite">
          {selectionText(game)}
        </output>
      )}
      {dice && dieFocus !== null && (
        <fieldset
          className="die-face-picker"
          aria-label="Elige una cara del dado"
        >
          <legend>Elige una cara</legend>
          {dieLetters(game.puzzle.cells[dieFocus], game.puzzle.seed).map(
            (letter, face) => (
              <button
                key={face}
                aria-label={`Cara ${face + 1}: ${letter}`}
                onClick={() => {
                  setGame((s) => selectDie(s, dieFocus, face));
                  setDieFocus(null);
                }}
              >
                {letter}
              </button>
            ),
          )}
          <button aria-label="Cerrar caras" onClick={() => setDieFocus(null)}>
            ×
          </button>
        </fieldset>
      )}
      {pageNumber && (
        <footer className="book-game-footer">
          <span>— &nbsp; {pageNumber} / 15 &nbsp; —</span>
          <button disabled={!won} onClick={onNext} aria-label={nextLabel}>
            {won
              ? pageNumber === 15
                ? 'Cerrar el libro'
                : 'Pasar página'
              : 'Completa la sopa'}{' '}
            <span aria-hidden="true">›</span>
          </button>
          {won && <output className="sr-only">¡Sopa completada!</output>}
          <span className="book-corner" aria-hidden="true" />
        </footer>
      )}
      {won && !pageNumber && (
        <output className="victory">
          <span>¡Sopa completada!</span>
          <button
            onClick={() =>
              initial
                ? setGame({
                    ...initial,
                    found: [],
                    selection: [],
                    message: 'Empieza de nuevo.',
                  })
                : changePuzzle(puzzleId, true)
            }
          >
            Volver a jugar
          </button>
          <button
            onClick={
              onNext ??
              (() =>
                changePuzzle(
                  PUZZLES[
                    (PUZZLES.findIndex((p) => p.id === puzzleId) + 1) %
                      PUZZLES.length
                  ].id,
                ))
            }
          >
            {nextLabel ?? 'Otra sopa'}
          </button>
        </output>
      )}
      <output className="sr-only" aria-live="polite">
        {game.message}
      </output>
    </main>
  );
}
