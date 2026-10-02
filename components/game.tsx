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
import { translator } from '@/lib/i18n';
import type { Language } from '@/lib/preferences';
import {
  Pause,
  Play,
  Home,
  Trophy,
  ChevronRight,
  CircleHelp,
  Check,
  RotateCcw,
  X,
} from 'lucide-react';
import GameDialog from './game-dialog';
import { levelsFor, campaignFor } from '@/lib/player';
import { playSound } from '@/lib/audio';
import { selectionSound } from '@/lib/sound-events';
import { AD_COPY } from '@/lib/ad-copy';
import {
  hintKey,
  readHints,
  nextHint,
  hintedPath,
  type HintCounts,
  type HintOffer,
} from '@/lib/hints';
import {
  beginAdSession,
  prepareAds,
  recoverRewards,
  requestHint,
  transitionAd,
  nativeAdsAvailable,
  showAdPrivacy,
} from '@/lib/ads';
import { drawMotion, motionPoints, hitMotion } from '@/lib/motion';
import { hitDie } from '@/lib/dice';
import {
  startPuzzle,
  DEFAULT_PUZZLE,
  isWon,
  selectCell,
  selectDie,
  dieLetters,
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

function readTheme(): 'dark' | 'light' {
  try {
    return localStorage.getItem('sopa-theme') === 'dark' ? 'dark' : 'light';
  } catch {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
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
  language,
}: {
  cell: Cell;
  selected: boolean;
  found: boolean;
  register: (id: number, node: HTMLButtonElement | null) => void;
  choose: (id: number) => void;
  faces?: string[];
  language: Language;
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
      aria-label={`${faces ? `${translator(language)('Dado')} ${faces.join(', ')}` : cell.letter}, ${translator(language)('columna')} ${cell.position[0] + 1}, ${translator(language)('fila')} ${cell.position[1] + 1}, ${translator(language)('capa')} ${cell.position[2] + 1}${selected ? ', ' + translator(language)('seleccionada') : ''}${found ? ', ' + translator(language)('encontrada') : ''}`}
    ></button>
  );
});

export default function Game({
  initial,
  title,
  onExit,
  onProgress,
  onNext,
  dice = false,
  pageNumber,
  hasNextLevel,
  language = 'es',
}: {
  initial?: GameState;
  title?: string;
  onExit?: () => void;
  onProgress?: (game: GameState) => void;
  onNext?: () => void;
  nextLabel?: string;
  dice?: boolean;
  pageNumber?: number;
  hasNextLevel?: boolean;
  language?: Language;
} = {}) {
  const t = translator(language);
  const LEVELS = campaignFor(language);
  const PUZZLES = levelsFor(language)
    .slice()
    .sort((a, b) => a.size - b.size);
  const [puzzleId, setPuzzleId] = useState(DEFAULT_PUZZLE);
  const [game, setGame] = useState(
    () => initial ?? startPuzzle(DEFAULT_PUZZLE, language),
  );
  const games = useRef(new Map<string, GameState>());
  const gameRef = useRef(game);
  const adLock = useRef(false);
  useLayoutEffect(() => {
    gameRef.current = game;
  }, [game]);
  const chooseCell = useCallback((id: number, face?: number) => {
    if (adLock.current) return;
    const previous = gameRef.current;
    const next =
      face === undefined
        ? selectCell(previous, id)
        : selectDie(previous, id, face);
    const cue = selectionSound(previous, next, id, face);
    gameRef.current = next;
    setGame(next);
    if (cue) void playSound(cue);
  }, []);
  const [helpOpen, setHelpOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [winDismissed, setWinDismissed] = useState(false);
  const [dieFocus, setDieFocus] = useState<number | null>(null);
  const copy = AD_COPY[language];
  const ledgerKey = hintKey(game, language, dice);
  const [hints, setHints] = useState<HintCounts>({});
  const [hintOffer, setHintOffer] = useState<HintOffer | null>(null);
  const [adBusy, setAdBusy] = useState(false);
  const [adNotice, setAdNotice] = useState('');
  const [privacyRequired, setPrivacyRequired] = useState(false);
  const [nativeAds, setNativeAds] = useState(false);
  const freshCompletion = useRef(!isWon(initial ?? game));
  const completionID = useRef('');
  const offer = nextHint(game, hints, ledgerKey);
  const cluePath = hintedPath(game, hints);
  const renderedGame = useMemo(
    () => ({ ...game, hintPath: hintedPath(game, hints) }),
    [game, hints],
  );
  useEffect(() => {
    let live = true;
    beginAdSession();
    completionID.current = crypto.randomUUID();
    const refresh = async () => {
      try {
        await recoverRewards();
        const saved = readHints(localStorage, ledgerKey);
        if (live) setHints(saved);
      } catch {
        if (live) setAdNotice(copy.storage);
      }
    };
    void refresh();
    void prepareAds().then((s) => {
      if (live) {
        setNativeAds(nativeAdsAvailable());
        setPrivacyRequired(s.privacyRequired);
      }
    });
    return () => {
      live = false;
    };
  }, [ledgerKey, copy.storage]);
  async function watchHint() {
    if (!hintOffer || adLock.current) return;
    const frozenOffer = hintOffer;
    setHintOffer(null);
    adLock.current = true;
    setAdBusy(true);
    try {
      const result = await requestHint(frozenOffer);
      setHints(readHints(localStorage, ledgerKey));
      setAdNotice(copy[result]);
    } catch {
      setAdNotice(copy.storage);
    } finally {
      adLock.current = false;
      setAdBusy(false);
    }
  }
  async function leaveResult(action?: () => void) {
    if (adLock.current) return;
    adLock.current = true;
    setAdBusy(true);
    try {
      await transitionAd(
        completionID.current,
        !!pageNumber && freshCompletion.current && isWon(gameRef.current),
      );
    } finally {
      adLock.current = false;
      setAdBusy(false);
      action?.();
    }
  }
  async function privacyOptions() {
    if (adLock.current) return;
    adLock.current = true;
    setAdBusy(true);
    try {
      const s = await showAdPrivacy();
      setPrivacyRequired(s.privacyRequired);
    } catch {
      setAdNotice(copy.unavailable);
    } finally {
      adLock.current = false;
      setAdBusy(false);
    }
  }
  const facingViewer = false;
  const theme = useSyncExternalStore<'dark' | 'light'>(
    subscribeTheme,
    readTheme,
    () => 'light',
  );
  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);
  const viewRef = useRef<CameraView>(
    initial ? homeView(initial.puzzle.size) : HOME_VIEW,
  );
  useLayoutEffect(() => {
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
    (id: number) => (dice ? setDieFocus(id) : chooseCell(id)),
    [dice, chooseCell],
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
    setWinDismissed(false);
    games.current.set(puzzleId, game);
    const next = replay
      ? startPuzzle(id, language)
      : (games.current.get(id) ?? startPuzzle(id, language));
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
          renderedGame,
          next,
          frame,
          edges,
          paintColors.current,
          dice,
          facingViewer,
        );
        const stage = stageRef.current;
        if (stage && !stage.classList.contains('canvas-ready'))
          stage.classList.add('canvas-ready');
      }
    };
    motionRenderer.current(viewRef.current);
    targetSync.current();
  }, [renderedGame, size, frame, edges, theme, dice, facingViewer]);
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
    // Mobile click synthesis can shift a tap toward a nearby DOM button.
    // Dice letters must use the actual release point, including enlarged glyphs.
    if (
      dice &&
      origin &&
      e.type === 'pointerup' &&
      !suppressPick.current &&
      pointers.current.size === 0 &&
      motionCanvas.current
    ) {
      const rect = e.currentTarget.getBoundingClientRect();
      const face = hitDie(
        motionCanvas.current,
        e.clientX - rect.left,
        e.clientY - rect.top,
      );
      if (face) chooseCell(face.id, face.face);
    }
  }
  return (
    <main
      className="game-shell paper-game"
      data-mode={dice ? 'dice' : 'letters'}
      aria-label={t('Sopa de letras 3D')}
      aria-busy={adBusy}
    >
      <header className="play-header" inert={adBusy}>
        <button
          className="icon-button pause-art-button"
          onClick={() => setPaused(true)}
          aria-label={t('Pausar partida')}
        >
          <span className="pause-art" aria-hidden="true" />
        </button>
        <div>
          <h1>{title ?? t('Mi sopa de letras')}</h1>
          <span>
            {dice ? t('Dados · Experimental') : `${size} × ${size} × ${size}`} ·{' '}
            {game.found.length}/{game.puzzle.words.length} {t('palabras')}{' '}
          </span>
        </div>
        <button
          type="button"
          className="icon-button game-help-button"
          aria-haspopup="dialog"
          aria-expanded={helpOpen}
          aria-label={t('Abrir ayuda')}
          onClick={(event) => {
            event.currentTarget.focus();
            setHelpOpen(true);
          }}
        >
          <CircleHelp size={22} />
        </button>
      </header>
      {!initial && (
        <div className="game-controls puzzle-picker">
          <div className="game-options">
            {!initial && (
              <select
                aria-label={t('Sopa')}
                value={puzzleId}
                onChange={(e) => changePuzzle(e.target.value)}
              >
                {[3, 4, 5, 6, 8, 10].map((n) => (
                  <optgroup
                    key={n}
                    label={`${n}×${n}×${n} · ${n ** 3} ${t('letras')}`}
                  >
                    {PUZZLES.filter((p) => p.size === n).map((p) => (
                      <option key={p.id} value={p.id}>
                        {n}×{n}×{n} · {p.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
          </div>
        </div>
      )}
      <p id="gesture-help" className="sr-only">
        {t(
          'Toca y suelta letras vecinas para formar palabras. Arrastra para girar sin límites; pellizca o usa la rueda para acercarte y alejarte. Toca la última letra para deshacer. Con la figura enfocada, usa las flechas para girar y más o menos para el zoom. Tocar una letra no vecina borra la selección.',
        )}{' '}
      </p>
      <div className="game-board" inert={adBusy}>
        <div
          ref={stageRef}
          className="cube-stage"
          role="application"
          aria-label={t('Cubo de letras')}
          aria-describedby="gesture-help"
          tabIndex={0}
          data-size={size}
          data-shape={game.puzzle.shape}
          data-dice={dice}
          data-letter-orientation={
            dice ? (facingViewer ? 'viewer' : 'face') : undefined
          }
          onClick={(e) => {
            if (
              dice ||
              e.detail === 0 ||
              suppressPick.current ||
              !motionCanvas.current
            )
              return;
            const rect = e.currentTarget.getBoundingClientRect();
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
                language={language}
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
          aria-label={t('Palabras por encontrar')}
        >
          {game.puzzle.words.map((word) => (
            <li
              key={word.text}
              className={game.found.includes(word.text) ? 'complete' : ''}
              aria-label={`${word.text}${game.found.includes(word.text) ? `, ${t('encontrada')}` : ''}`}
            >
              {game.found.includes(word.text) && (
                <Check size={13} aria-hidden="true" />
              )}
              {word.text}
            </li>
          ))}
        </ul>
      </div>
      {dice && (
        <output className="dice-selection" aria-live="polite">
          {game.selection.map((id, i) => (
            <span
              key={`${id}:${game.selectionFaces?.[i]}`}
              data-die={id}
              data-face={game.selectionFaces?.[i]}
            >
              {game.selectionLetters?.[i]}
            </span>
          ))}
        </output>
      )}
      {dice && dieFocus !== null && (
        <fieldset
          disabled={adBusy}
          className="die-face-picker"
          aria-label={t('Elige una cara del dado')}
        >
          <legend>{t('Elige una cara')}</legend>
          {dieLetters(game.puzzle.cells[dieFocus], game.puzzle.seed).map(
            (letter, face) => (
              <button
                key={face}
                aria-pressed={game.selection.some(
                  (id, i) =>
                    id === dieFocus && game.selectionFaces?.[i] === face,
                )}
                aria-label={t(`Cara ${face + 1}: ${letter}`)}
                onClick={() => {
                  chooseCell(dieFocus, face);
                  setDieFocus(null);
                }}
              >
                {letter}
              </button>
            ),
          )}
          <button
            aria-label={t('Cerrar caras')}
            data-sound="ui"
            onClick={() => setDieFocus(null)}
          >
            ×
          </button>
        </fieldset>
      )}
      <section className="hint-controls" aria-label={copy.hint}>
        {!won && (
          <button
            className="hint-button"
            disabled={adBusy || (!offer && nativeAds)}
            data-sound="none"
            onClick={() => {
              if (!nativeAds) {
                setAdNotice(copy.web);
                return;
              }
              if (offer) {
                setHintOffer(offer);
                setAdNotice('');
              }
            }}
          >
            {nativeAds ? copy.watch : copy.hint}
          </button>
        )}
        {nativeAds && !won && <small>{copy.test}</small>}
        {cluePath.length > 0 && (
          <output aria-label={copy.path} dir="ltr">
            {cluePath.map((id, i) => (
              <span key={id}>
                {i + 1}: {game.puzzle.cells[id].letter}
              </span>
            ))}
          </output>
        )}
        {!offer && cluePath.length > 0 && <small>{copy.complete}</small>}
        <output className="ad-notice" aria-live="polite">
          {adBusy ? copy.busy : adNotice}
        </output>
      </section>
      <footer className="play-footer" inert={adBusy}>
        <span>
          {pageNumber
            ? t(`Nivel ${pageNumber} de ${LEVELS.length}`)
            : dice
              ? t('Prueba de dados')
              : t('A tu ritmo')}
        </span>
        <progress
          value={game.found.length}
          max={game.puzzle.words.length}
          aria-label={t('Palabras encontradas')}
        />
        <span>
          {game.found.length}/{game.puzzle.words.length}
        </span>
        {won && (
          <button
            className="icon-button"
            aria-label={t('Ver resultado')}
            onClick={() => setWinDismissed(false)}
          >
            <Trophy size={19} />
          </button>
        )}
      </footer>
      <GameDialog
        open={helpOpen && !adBusy}
        onClose={() => setHelpOpen(false)}
        title={t('Cómo jugar')}
      >
        <button
          className="dialog-close icon-button"
          aria-label={t('Cerrar ayuda')}
          onClick={() => setHelpOpen(false)}
        >
          <X size={21} />
        </button>
        <div className="dialog-symbol">
          <CircleHelp size={30} />
        </div>
        <h2>{t('Cómo jugar')}</h2>
        <div className="game-help-content">
          <p>
            {dice
              ? t(
                  'Las palabras pueden compartir caras, aunque ya estén marcadas. En una misma palabra cada cara se usa una sola vez.',
                )
              : t(
                  'Las palabras pueden compartir casillas, aunque ya estén marcadas. En una misma palabra cada casilla se usa una sola vez.',
                )}
          </p>
          <p>
            {dice
              ? t(
                  'Une caras del mismo dado que compartan borde, o letras de dados vecinos.',
                )
              : t(
                  `Une letras vecinas y encuentra las ${game.puzzle.words.length} palabras.`,
                )}
          </p>
          <p>
            {t('Arrastra')}{' '}
            {t(
              'para girar libremente. Pellizca o usa la rueda para acercarte, incluso al interior.',
            )}
          </p>
          <p>
            {t('Deshaz')}{' '}
            {t(
              'tocando una letra ya elegida. Si tocas una que no es vecina, se borra la selección.',
            )}
          </p>
          <details className="hint-help">
            <summary>{copy.hint}</summary>
            <p>{copy.help}</p>
            <p>{nativeAds ? copy.transitions : copy.web}</p>
            {nativeAds && <p>{copy.report}</p>}
          </details>
          {privacyRequired && (
            <button
              className="dialog-action"
              onClick={() => void privacyOptions()}
            >
              {copy.privacy}
            </button>
          )}
        </div>
        <button className="primary-action" onClick={() => setHelpOpen(false)}>
          {t('Entendido')}
        </button>
      </GameDialog>
      <GameDialog
        open={hintOffer !== null && !adBusy}
        onClose={() => setHintOffer(null)}
        title={copy.hint}
      >
        <h2>{copy.hint}</h2>
        <p>{copy.offer}</p>
        <strong dir="auto">{hintOffer?.word}</strong>
        <p>{copy.test}</p>
        <button
          className="primary-action"
          data-sound="none"
          onClick={() => void watchHint()}
        >
          {copy.watch}
        </button>
        <button className="dialog-action" onClick={() => setHintOffer(null)}>
          {copy.later}
        </button>
      </GameDialog>
      <GameDialog
        open={paused && !adBusy}
        onClose={() => setPaused(false)}
        title={t('Partida en pausa')}
      >
        <div className="dialog-symbol">
          <Pause size={32} />
        </div>
        <h2>{t('Un pequeño descanso')}</h2>
        <p>{t('Todo sigue donde lo dejaste.')}</p>
        <button className="primary-action" onClick={() => setPaused(false)}>
          <Play size={19} />
          {t('Seguir jugando')}{' '}
        </button>
        <button
          className="dialog-action"
          onClick={() => void leaveResult(onExit)}
        >
          <Home size={19} />
          {t('Volver al menú')}{' '}
        </button>
      </GameDialog>
      <GameDialog
        open={won && !winDismissed && !paused && !adBusy}
        onClose={() => setWinDismissed(true)}
        title={t('Sopa completada')}
      >
        <button
          className="dialog-close icon-button"
          aria-label={t('Ver sopa completada')}
          onClick={() => setWinDismissed(true)}
        >
          <X size={21} />
        </button>
        <div className="dialog-symbol trophy" aria-hidden="true" />
        <span className="eyebrow">{t('¡BIEN ENCONTRADO!')}</span>
        <h2>{pageNumber ? t('¡Nivel completado!') : t('¡Sopa completada!')}</h2>
        <p>{title ?? t('Has encontrado todas las palabras.')}</p>
        <div className="victory-fact">
          <span>{t('Palabras encontradas')}</span>
          <strong>
            {game.found.length}/{game.puzzle.words.length}
          </strong>
        </div>
        {pageNumber && (hasNextLevel ?? pageNumber < LEVELS.length) ? (
          <button
            className="primary-action"
            onClick={() => void leaveResult(onNext)}
            aria-label={t('Siguiente nivel')}
          >
            {t('Siguiente nivel')} <ChevronRight size={20} />
          </button>
        ) : (
          <button
            className="primary-action"
            onClick={() =>
              void leaveResult(() => {
                setWinDismissed(false);
                if (initial)
                  setGame({
                    ...initial,
                    found: [],
                    selection: [],
                    selectionLetters: [],
                    selectionFaces: [],
                    message: t('Empieza de nuevo.'),
                  });
                else changePuzzle(puzzleId, true);
                freshCompletion.current = true;
                completionID.current = crypto.randomUUID();
              })
            }
          >
            <RotateCcw size={19} />
            {t('Volver a jugar')}{' '}
          </button>
        )}
        <button
          className="dialog-action"
          onClick={() => void leaveResult(onExit)}
        >
          <Home size={19} />
          {t('Volver al menú')}{' '}
        </button>
      </GameDialog>
      <output className="sr-only" aria-live="polite">
        {t(game.message)}
      </output>
    </main>
  );
}
