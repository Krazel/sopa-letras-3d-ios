'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  Box,
  Rotate3D,
  MousePointer2,
  RotateCcw,
  Lightbulb,
  ArrowUpRight,
  Check,
  X,
  HelpCircle,
  Trophy,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Plus,
  Minus,
  Scan,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { initialState, isWon, selectCell } from '@/lib/game';
import {
  HOME_VIEW,
  MAX_DISTANCE,
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
  const stageRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, TouchPoint>());
  const pressOrigin = useRef<TouchPoint | null>(null);
  const suppressPick = useRef(false);
  const [mode, setMode] = useState('select');
  const [layer, setLayer] = useState('all');
  const [help, setHelp] = useState(false);
  const [confirm, setConfirm] = useState<'new' | 'restart' | null>(null);
  const [dismissedWin, setDismissedWin] = useState(false);
  const [hint, setHint] = useState<number | null>(null);
  function moveCamera(next: CameraView) {
    viewRef.current = next;
    setView(next);
  }
  function restoreView() {
    pointers.current.clear();
    pressOrigin.current = null;
    moveCamera(HOME_VIEW);
    setLayer('all');
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
      suppressPick.current = true;
    };
    // A selection gesture can leave the board before release. Clear it even
    // outside the stage so the next press cannot become a phantom pinch.
    const releaseOutside = (event: globalThis.PointerEvent) => {
      pointers.current.delete(event.pointerId);
      if (event.type === 'pointercancel') suppressPick.current = true;
    };
    stage.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('blur', cancel);
    window.addEventListener('pointerup', releaseOutside);
    window.addEventListener('pointercancel', releaseOutside);
    return () => {
      stage.removeEventListener('wheel', wheel);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('pointerup', releaseOutside);
      window.removeEventListener('pointercancel', releaseOutside);
    };
  }, []);
  const inside = isInside(view);
  const won = isWon(game);
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
  function reset(kind: 'new' | 'restart') {
    const seed =
      kind === 'restart' ? game.puzzle.seed : (game.puzzle.seed + 7919) >>> 0;
    setGame(initialState(seed));
    restoreView();
    setLayer('all');
    setMode('select');
    setHint(null);
    setConfirm(null);
    setDismissedWin(false);
  }
  function requestReset(kind: 'new' | 'restart') {
    if (game.found.length || game.start !== null) setConfirm(kind);
    else reset(kind);
  }
  function onDown(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('[data-camera-controls]')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (pointers.current.size === 0) {
      suppressPick.current = false;
      pressOrigin.current = { x: e.clientX, y: e.clientY };
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (mode === 'rotate' || pointers.current.size > 1) {
      for (const id of pointers.current.keys())
        e.currentTarget.setPointerCapture(id);
      if (pointers.current.size > 1) suppressPick.current = true;
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
      if (mode === 'rotate')
        moveCamera(
          turn(viewRef.current, e.clientX - previous.x, e.clientY - previous.y),
        );
    }
  }
  function onUp(e: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    if (e.type === 'pointercancel') suppressPick.current = true;
    pressOrigin.current = pointers.current.values().next().value ?? null;
  }
  function showHint() {
    const word = game.puzzle.words.find((w) => !game.found.includes(w.text));
    if (!word) return;
    const id = word.path[0];
    setHint(id);
    setLayer(String(game.puzzle.cells[id].position[2]));
    moveCamera(HOME_VIEW);
    setMode('select');
    setGame((s) => ({
      ...s,
      start: null,
      message: `Pista para ${word.text}: empieza en la letra marcada. Termina en la capa ${game.puzzle.cells[word.path.at(-1)!].position[2] + 1}.`,
    }));
  }
  function pick(id: number) {
    if (mode !== 'select') return;
    setHint(null);
    setGame((s) => selectCell(s, id));
  }
  return (
    <main className="game-shell">
      <header className="masthead">
        <div className="brand" aria-label="Krazel Games">
          <span className="brand-mark">
            <Box size={22} />
          </span>
          <span>
            KRAZEL <b>GAMES</b>
          </span>
        </div>
        <span className="demo-tag">LAB / 001</span>
        <button
          className="help-button"
          aria-label="Cómo jugar"
          onClick={() => setHelp(true)}
        >
          <HelpCircle size={18} />
          <span>Cómo jugar</span>
        </button>
      </header>
      <section className="heading-row">
        <div>
          <p className="eyebrow">UN PEQUEÑO RETO ESPACIAL</p>
          <h1>
            Sopa de letras <span>3D</span>
          </h1>
        </div>
        <p className="intro">
          Las palabras tienen
          <br />
          <strong>otra dimensión.</strong>
        </p>
      </section>
      <div className="play-layout">
        <section className="play-panel" aria-label="Tablero tridimensional">
          <div className="board-toolbar">
            <RadioGroup
              className="mode-switch"
              value={mode}
              onValueChange={(v) => {
                setMode(String(v));
                pointers.current.clear();
              }}
              aria-label="Modo de interacción"
            >
              <label
                htmlFor="mode-select"
                className={mode === 'select' ? 'active' : ''}
              >
                <RadioGroupItem
                  id="mode-select"
                  value="select"
                  aria-label="Elegir"
                />
                <MousePointer2 size={16} />
                Elegir
              </label>
              <label
                htmlFor="mode-rotate"
                className={mode === 'rotate' ? 'active' : ''}
              >
                <RadioGroupItem
                  id="mode-rotate"
                  value="rotate"
                  aria-label="Girar"
                />
                <Rotate3D size={18} />
                Girar
              </label>
            </RadioGroup>
            <span className="cube-size">
              4 × 4 × 4 <span>/ 64 letras</span>
            </span>
          </div>
          <div
            ref={stageRef}
            className={`cube-stage ${mode === 'rotate' ? 'rotating' : ''}`}
            data-distance={view.distance.toFixed(3)}
            data-rotation={view.rotation.join(',')}
            data-inside={inside}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onLostPointerCapture={onUp}
          >
            <div className="space-grid" aria-hidden="true" />
            <span className="axis-label" aria-hidden="true">
              {inside
                ? 'DENTRO DEL HOLOGRAMA'
                : layer === 'all'
                  ? 'VOLUMEN COMPLETO'
                  : `CAPA 0${Number(layer) + 1}`}
            </span>
            <div
              className={`cube-volume ${layer !== 'all' ? 'layer-focused' : ''}`}
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
                    segment && (
                      <line key={i} {...segment} className="cage-line" />
                    )
                  );
                })}
                {game.puzzle.words
                  .filter((w) => game.found.includes(w.text))
                  .map((w) => {
                    const segment = projectSegment(
                      cameraPoints[w.path[0]],
                      cameraPoints[w.path.at(-1)!],
                    );
                    return (
                      segment && (
                        <line key={w.text} {...segment} className="word-line" />
                      )
                    );
                  })}
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
                const active =
                  layer === 'all' || cell.position[2] === Number(layer);
                const selected = game.start === i;
                const found = foundCells.has(i);
                return active ? (
                  <button
                    key={i}
                    data-cell={i}
                    className={`letter ${selected ? 'selected' : ''} ${found ? 'found' : ''} ${hint === i ? 'hint' : ''}`}
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
                    onClick={(event) => {
                      if (event.detail === 0 || !suppressPick.current) pick(i);
                    }}
                    disabled={mode === 'rotate' || won}
                    aria-pressed={selected}
                    aria-label={`${cell.letter}, columna ${cell.position[0] + 1}, fila ${cell.position[1] + 1}, capa ${cell.position[2] + 1}${found ? ', encontrada' : ''}`}
                  >
                    {cell.letter}
                  </button>
                ) : (
                  <span
                    key={i}
                    className={`ghost-dot ${selected ? 'anchor' : ''} ${found ? 'found-dot' : ''}`}
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    aria-hidden="true"
                  >
                    {selected ? cell.letter : ''}
                  </span>
                );
              })}
            </div>
            <div
              className="rotation-controls"
              data-camera-controls
              aria-label="Rotar por pasos"
            >
              <button
                aria-label="Girar a la izquierda"
                onClick={() => moveCamera(turn(viewRef.current, -44, 0))}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                aria-label="Inclinar arriba"
                onClick={() => moveCamera(turn(viewRef.current, 0, 25))}
              >
                <ChevronUp size={18} />
              </button>
              <button
                aria-label="Inclinar abajo"
                onClick={() => moveCamera(turn(viewRef.current, 0, -25))}
              >
                <ChevronDown size={18} />
              </button>
              <button
                aria-label="Girar a la derecha"
                onClick={() => moveCamera(turn(viewRef.current, 44, 0))}
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <button
              className="reset-view"
              data-camera-controls
              onClick={restoreView}
              aria-label="Restaurar vista inicial"
              title="Restaurar vista inicial"
            >
              <RotateCcw size={16} />
            </button>
          </div>
          <div className="zoom-bar" aria-label="Acercarse y alejarse">
            <button
              aria-label="Alejar"
              onClick={() => moveCamera(dolly(viewRef.current, 0.65))}
              disabled={view.distance >= MAX_DISTANCE}
            >
              <Minus size={18} />
            </button>
            <input
              type="range"
              min="0"
              max="140"
              step="1"
              value={Math.round((MAX_DISTANCE - view.distance) * 10)}
              onChange={(e) =>
                moveCamera({
                  ...viewRef.current,
                  distance: MAX_DISTANCE - Number(e.target.value) / 10,
                })
              }
              aria-label="Zoom del holograma"
              aria-valuetext={
                inside
                  ? 'Dentro del holograma'
                  : `Distancia ${view.distance.toFixed(1)}`
              }
            />
            <button
              aria-label="Acercar"
              onClick={() => moveCamera(dolly(viewRef.current, -0.65))}
              disabled={view.distance <= 0}
            >
              <Plus size={18} />
            </button>
            <button
              className="enter-volume"
              onClick={() => {
                if (inside) restoreView();
                else {
                  moveCamera({ ...viewRef.current, distance: 0.8 });
                  setLayer('all');
                  setMode('rotate');
                }
              }}
            >
              <Scan size={16} />
              {inside ? 'Salir' : 'Entrar'}
            </button>
          </div>
          <div className="layer-bar">
            <div className="layer-label">
              <span className="layer-icon">▱</span>
              <span>Explorar capas</span>
            </div>
            <RadioGroup
              className="layer-switch"
              value={layer}
              onValueChange={(v) => setLayer(String(v))}
              aria-label="Capa visible"
            >
              <label
                htmlFor="layer-all"
                className={layer === 'all' ? 'active' : ''}
              >
                <RadioGroupItem
                  id="layer-all"
                  value="all"
                  aria-label="Todas las capas"
                />
                Todas
              </label>
              {[0, 1, 2, 3].map((z) => (
                <label
                  key={z}
                  htmlFor={`layer-${z}`}
                  className={layer === String(z) ? 'active' : ''}
                >
                  <RadioGroupItem
                    id={`layer-${z}`}
                    value={String(z)}
                    aria-label={`Capa ${z + 1}`}
                  />
                  <span>{z + 1}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
          <div className="board-caption">
            <span className="live-dot" />
            {mode === 'rotate'
              ? 'Arrastra para girar. Rueda o pellizca para entrar y salir.'
              : 'Toca dos extremos. Rueda o pellizca para explorar la profundidad.'}
          </div>
        </section>
        <aside className="mission-panel">
          <div className="mission-heading">
            <p className="eyebrow">TU MISIÓN</p>
            <span className="orbit-icon">
              <Box size={21} />
            </span>
          </div>
          <h2>
            Encuentra
            <br /> las seis palabras.
          </h2>
          <p className="mission-copy">
            En horizontal, vertical o diagonal.
            <br /> También a través del cubo.
          </p>
          <div className="progress-label">
            <span>{won ? 'Cubo resuelto' : 'Palabras descubiertas'}</span>
            <strong>
              {game.found.length}
              <span> / 6</span>
            </strong>
          </div>
          <Progress
            value={(game.found.length / 6) * 100}
            aria-label="Palabras encontradas"
            className="game-progress"
          />
          <ul className="word-list">
            {game.puzzle.words.map((word, i) => (
              <li
                key={word.text}
                className={game.found.includes(word.text) ? 'complete' : ''}
              >
                <span className="word-number">0{i + 1}</span>
                <span className="word-text">{word.text}</span>
                {game.found.includes(word.text) ? (
                  <Check size={20} />
                ) : (
                  <span className="word-length">{word.text.length} letras</span>
                )}
              </li>
            ))}
          </ul>
          <output
            className={`selection-message ${game.start !== null ? 'has-selection' : ''}`}
            aria-live="polite"
          >
            <span className="selection-symbol">
              {won ? (
                <Check size={19} />
              ) : game.start !== null ? (
                game.puzzle.cells[game.start].letter
              ) : (
                <MousePointer2 size={19} />
              )}
            </span>
            <p>{game.message}</p>
            {game.start !== null && (
              <button
                aria-label="Cancelar selección"
                onClick={() =>
                  setGame((s) => ({
                    ...s,
                    start: null,
                    message: 'Selección cancelada.',
                  }))
                }
              >
                <X size={16} />
              </button>
            )}
          </output>
          <div className="mission-actions">
            <button className="hint-button" onClick={showHint} disabled={won}>
              <Lightbulb size={18} />
              Una pista
            </button>
            <button className="new-button" onClick={() => requestReset('new')}>
              Nueva partida
              <ArrowUpRight size={18} />
            </button>
          </div>
          <button
            className="restart-button"
            onClick={() => requestReset('restart')}
          >
            <RotateCcw size={14} />
            Reiniciar este cubo
          </button>
        </aside>
      </div>
      <footer className="page-footer">
        <span>PAUSA. GIRA. DESCUBRE.</span>
        <span>
          Demo 01 <span className="footer-dot">·</span> Sin prisa, sin
          cronómetro.
        </span>
      </footer>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="game-dialog" showCloseButton={false}>
          <DialogTitle>Una sopa en tres dimensiones.</DialogTitle>
          <DialogDescription>
            Encuentra las seis palabras de la lista en líneas rectas. Se pueden
            leer en ambos sentidos.
          </DialogDescription>
          <ol className="instructions">
            <li>
              <b>Explora.</b> Elige Girar y arrastra, o usa las flechas. Las
              letras se mantienen legibles desde cualquier ángulo.
            </li>
            <li>
              <b>Entra en el holograma.</b> Usa la rueda, pellizca con dos dedos
              o ajusta el zoom. Entrar te sitúa entre las letras; arrastra en
              Girar para mirar alrededor. Salir o Restaurar vista inicial
              recuperan el cubo completo sin perder tu partida.
            </li>
            <li>
              <b>Despeja la vista.</b> Las capas 1–4 muestran 16 letras cada
              una; Todas muestra el cubo entero.
            </li>
            <li>
              <b>Conecta.</b> En Elegir, toca la primera y la última letra.
              Puedes cambiar de capa y girar entre ambos toques.
            </li>
            <li>
              <b>Sigue la profundidad.</b> Una diagonal puede cruzar varias
              capas. Una pista marca un inicio y dice la capa final.
            </li>
          </ol>
          <p className="keyboard-note">
            Teclado: Tab para recorrer controles, flechas en modos/capas y Enter
            o espacio para elegir una letra. RIO aparece sin tilde en el
            tablero.
          </p>
          <DialogClose className="primary-action">
            Vamos a jugar
            <ArrowUpRight size={18} />
          </DialogClose>
        </DialogContent>
      </Dialog>
      <Dialog
        open={won && !dismissedWin}
        onOpenChange={(open) => {
          if (!open) setDismissedWin(true);
        }}
      >
        <DialogContent
          className="game-dialog win-dialog"
          showCloseButton={false}
        >
          <div className="trophy">
            <Trophy size={36} />
          </div>
          <p className="eyebrow">6 DE 6 · CUBO COMPLETO</p>
          <DialogTitle>¡Tienes visión espacial!</DialogTitle>
          <DialogDescription>
            Has encontrado todas las palabras, incluso las que se escondían en
            profundidad.
          </DialogDescription>
          <button className="primary-action" onClick={() => reset('new')}>
            Explorar otro cubo
            <ArrowUpRight size={18} />
          </button>
          <DialogClose className="quiet-action">
            Ver mi cubo resuelto
          </DialogClose>
        </DialogContent>
      </Dialog>
      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <DialogContent className="game-dialog" showCloseButton={false}>
          <DialogTitle>
            {confirm === 'restart'
              ? '¿Reiniciar este cubo?'
              : '¿Explorar un cubo nuevo?'}
          </DialogTitle>
          <DialogDescription>
            Se borrará el progreso de esta partida.{' '}
            {confirm === 'restart'
              ? 'Las letras seguirán en el mismo sitio.'
              : 'Las palabras cambiarán de sitio.'}
          </DialogDescription>
          <button
            className="primary-action"
            onClick={() => confirm && reset(confirm)}
          >
            {confirm === 'restart' ? 'Reiniciar' : 'Nueva partida'}
            <ArrowUpRight size={18} />
          </button>
          <DialogClose className="quiet-action">Seguir jugando</DialogClose>
        </DialogContent>
      </Dialog>
    </main>
  );
}
