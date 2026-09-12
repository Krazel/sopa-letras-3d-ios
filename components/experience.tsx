'use client';
import { useCallback, useEffect, useState } from 'react';
import Game from './game';
import { LockKeyhole } from 'lucide-react';
import { applyTheme } from '@/lib/theme';
import { type GameState, type PuzzleChoice } from '@/lib/game';
import {
  LEVELS,
  SAVE_KEY,
  emptySave,
  readSave,
  saveGame,
  restore,
  isUnlocked,
  customChoice,
  generateCustom,
  type SaveData,
} from '@/lib/player';

type Play = {
  id: string;
  mode: 'level' | 'custom' | 'free' | 'dice';
  title: string;
  game?: GameState;
};
export default function Experience() {
  const [data, setData] = useState<SaveData>(emptySave);
  const [ready, setReady] = useState(false);
  const [section, setSection] = useState<'levels' | 'create'>('levels');
  const [active, setActive] = useState<Play | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [chapter, setChapter] = useState(0);
  const [saveError, setSaveError] = useState('');
  const [name, setName] = useState('');
  const [words, setWords] = useState('');
  const [shape, setShape] = useState<'cube' | 'star'>('cube');
  const [size, setSize] = useState(4);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState<string | null>(null);
  // Read browser storage after hydration, then synchronize writes and their error state.
  /* oxlint-disable react/react-compiler */
  useEffect(() => {
    try {
      setData(readSave(localStorage.getItem(SAVE_KEY)));
    } catch {
      setSaveError(
        'El avance no se puede guardar en este dispositivo. Puedes seguir jugando.',
      );
    }
    try {
      const t =
        localStorage.getItem('sopa-theme') === 'dark' ? 'dark' : 'light';
      setTheme(t);
      applyTheme(t);
    } catch {
      /* Keep the dark default. */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      setSaveError('');
    } catch {
      setSaveError(
        'No se ha podido guardar el avance. Libera espacio para conservarlo al cerrar.',
      );
    }
  }, [data, ready]);
  /* oxlint-enable react/react-compiler */
  function toggleTheme() {
    const next =
      document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem('sopa-theme', next);
    } catch {
      /* Session theme remains usable. */
    }
    window.dispatchEvent(new Event('sopa-theme'));
  }
  function open(choice: PuzzleChoice, mode: 'level' | 'custom') {
    try {
      setActive({
        id: choice.id,
        mode,
        title:
          mode === 'level'
            ? `Página ${LEVELS.find((l) => l.id === choice.id)!.number} · ${choice.name}`
            : choice.name,
        game: restore(choice, data.progress[choice.id]),
      });
      setError('');
    } catch {
      setError('No se ha podido abrir esta sopa. Prueba a crearla de nuevo.');
    }
  }
  const onProgress = useCallback(
    (game: GameState) => {
      if (active && (active.mode === 'level' || active.mode === 'custom'))
        setData((old) => saveGame(old, active.id, game));
    },
    [active],
  );
  function exit() {
    setActive(null);
    setTheme(
      document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
    );
  }
  function next() {
    if (active?.mode === 'level') {
      const i = LEVELS.findIndex((l) => l.id === active.id);
      if (i < LEVELS.length - 1) {
        open(LEVELS[i + 1], 'level');
        return;
      }
    }
    exit();
  }
  async function create() {
    setError('');
    if (data.customs.length >= 20) {
      setError('Ya tienes 20 sopas guardadas. Elimina una para crear otra.');
      return;
    }
    let choice: PuzzleChoice;
    try {
      choice = customChoice(
        name,
        words,
        shape,
        size,
        Math.floor(Math.random() * 0x100000000),
        `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      );
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 30));
    try {
      const result = generateCustom(choice);
      setData((old) => ({ ...old, customs: [result.choice, ...old.customs] }));
      setActive({
        id: result.choice.id,
        mode: 'custom',
        title: result.choice.name,
        game: result.game,
      });
      setName('');
      setWords('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (active)
    return (
      <>
        <Game
          key={active.id}
          initial={active.game}
          title={active.title}
          dice={active.mode === 'dice'}
          pageNumber={
            active.mode === 'level'
              ? LEVELS.findIndex((l) => l.id === active.id) + 1
              : undefined
          }
          onExit={exit}
          onProgress={onProgress}
          onNext={next}
          nextLabel={
            active.mode === 'level' && active.id !== LEVELS.at(-1)!.id
              ? 'Siguiente nivel'
              : 'Volver al menú'
          }
        />
        {saveError && (
          <p className="save-warning" role="alert">
            {saveError}
          </p>
        )}
      </>
    );
  const nextLevel =
    LEVELS.find((l) => !data.completed.includes(l.id)) ?? LEVELS[0];
  return (
    <main className="journey book-page" aria-label="Menú del juego">
      <header className="journey-header">
        <div>
          <h1>Mi libro de sopas</h1>
          <span className="book-ornament" aria-hidden="true">
            ── ◆ ──
          </span>
          <p className="book-subtitle">Una página, un reto</p>
        </div>
        <button
          className="menu-theme"
          onClick={toggleTheme}
          aria-label={`Cambiar a tema ${theme === 'dark' ? 'claro' : 'oscuro'}`}
        >
          {theme === 'dark' ? '◐' : '◑'}
        </button>
      </header>
      <nav className="journey-nav" aria-label="Modo de juego">
        <button
          aria-current={section === 'levels' ? 'page' : undefined}
          onClick={() => setSection('levels')}
        >
          Niveles
        </button>
        <button
          aria-current={section === 'create' ? 'page' : undefined}
          onClick={() => setSection('create')}
        >
          Crear una sopa
        </button>
        <button
          onClick={() =>
            setActive({
              id: 'free',
              mode: 'free',
              title: 'Juego libre',
            })
          }
        >
          Juego libre
        </button>
        <button
          onClick={() =>
            setActive({ id: 'dice', mode: 'dice', title: 'Prueba de dados' })
          }
        >
          Probar dados
        </button>
      </nav>
      {saveError && <p role="alert">{saveError}</p>}
      {!ready ? (
        <output>Cargando tu avance…</output>
      ) : section === 'levels' ? (
        <>
          <section className="book-index" aria-label="Índice de niveles">
            <div className="chapter-heading">
              <span>Capítulo {chapter + 1}</span>
              <span>
                {
                  [
                    'Primeras palabras',
                    'Entre árboles',
                    'Más allá',
                    'Grandes descubrimientos',
                  ][chapter]
                }
              </span>
            </div>
            <ol className="level-list" start={chapter * 4 + 1}>
              {LEVELS.slice(chapter * 4, chapter * 4 + 4).map((level) => {
                const i = level.number - 1;
                const done = data.completed.includes(level.id),
                  unlocked = isUnlocked(data, i);
                return (
                  <li key={level.id}>
                    <button
                      disabled={!unlocked}
                      className={`level-card ${done ? 'level-done' : ''} ${level.id === nextLevel.id ? 'level-current' : ''}`}
                      aria-label={`${unlocked ? 'Jugar' : 'Bloqueado'} nivel ${i + 1}: ${level.name}${done ? ', completado' : ''}`}
                      onClick={() => open(level, 'level')}
                    >
                      <span className="level-number">{i + 1}</span>
                      <span className="level-copy">
                        <strong>{level.name}</strong>
                        <small>
                          {level.shape === 'star'
                            ? 'Estrella 3D'
                            : `${level.size} × ${level.size} × ${level.size}`}{' '}
                        </small>
                      </span>
                      <span
                        className={`chapter-art art-${i % 4}`}
                        aria-hidden="true"
                      />
                      <span
                        className={`level-state ${unlocked ? 'open' : ''}`}
                        aria-hidden="true"
                      >
                        {done ? (
                          '✓'
                        ) : unlocked ? (
                          '›'
                        ) : (
                          <LockKeyhole size={19} strokeWidth={1.5} />
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="chapter-paging">
              <button
                aria-label="Capítulo anterior"
                disabled={chapter === 0}
                onClick={() => setChapter((c) => c - 1)}
              >
                ‹
              </button>
              <span>{chapter + 1} / 4</span>
              <button
                aria-label="Capítulo siguiente"
                disabled={chapter === 3}
                onClick={() => setChapter((c) => c + 1)}
              >
                ›
              </button>
            </div>
          </section>
          <footer className="book-index-footer">
            <button
              className="primary-action"
              aria-label={data.completed.length ? 'Continuar' : 'Jugar nivel 1'}
              onClick={() => open(nextLevel, 'level')}
            >
              {data.completed.length === LEVELS.length
                ? 'Volver a empezar'
                : `Continuar · Página ${nextLevel.number}`}
              <span aria-hidden="true">›</span>
            </button>
            <p>
              {data.completed.length} de {LEVELS.length} páginas completadas
            </p>
            <span className="book-corner" aria-hidden="true" />
          </footer>
        </>
      ) : (
        <>
          <section className="creator-intro">
            <p className="eyebrow">TUS PALABRAS, TU RETO</p>
            <h2>Crea tu propia sopa</h2>
            <p>
              Escribe las palabras y elige dónde esconderlas. Podrás jugarla y
              volver a ella cuando quieras.
            </p>
          </section>
          <form
            className="creator-form"
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            <label>
              Nombre de la sopa
              <input
                name="name"
                aria-label="Nombre de la sopa"
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                required
                placeholder="Por ejemplo, Mi universo"
              />
            </label>
            <div className="creator-options">
              <label>
                Forma
                <select
                  aria-label="Forma"
                  value={shape}
                  onChange={(e) => setShape(e.target.value as 'cube' | 'star')}
                >
                  <option value="cube">Cubo</option>
                  <option value="star">Estrella 3D</option>
                </select>
              </label>
              {shape === 'cube' ? (
                <label>
                  Tamaño
                  <select
                    aria-label="Tamaño"
                    value={size}
                    onChange={(e) => setSize(Number(e.target.value))}
                  >
                    {[3, 4, 5, 6, 8, 10].map((n) => (
                      <option key={n} value={n}>
                        {n} × {n} × {n} · {n ** 3} letras
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="shape-detail">
                  Cinco capas conectadas.
                  <br />
                  200 letras dentro de la estrella.
                </p>
              )}
            </div>
            <label>
              Palabras
              <textarea
                name="words"
                aria-label="Palabras"
                value={words}
                onChange={(e) => {
                  setWords(e.target.value);
                  setError('');
                }}
                maxLength={300}
                rows={5}
                required
                placeholder={'LUNA\nCOMETA\nESTRELLA'}
                aria-describedby="words-help"
              />
            </label>
            <p id="words-help" className="field-help">
              De 1 a 12 palabras, de 3 a 11 letras cada una. Sepáralas con comas
              o saltos de línea. Se conservan las ñ y se quitan las tildes.
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="primary-action" disabled={busy} type="submit">
              {busy ? 'Colocando tus palabras…' : 'Crear y jugar'}
            </button>
          </form>
          <section className="saved-soups">
            <h2>
              Mis sopas <span>{data.customs.length}</span>
            </h2>
            {!data.customs.length ? (
              <p className="local-note">
                Tus sopas aparecerán aquí cuando crees la primera.
              </p>
            ) : (
              <ul>
                {data.customs.map((choice) => (
                  <li key={choice.id}>
                    <button
                      className="saved-play"
                      onClick={() => open(choice, 'custom')}
                    >
                      <strong>{choice.name}</strong>
                      <small>
                        {choice.shape === 'star'
                          ? 'Estrella 3D'
                          : `${choice.size} × ${choice.size} × ${choice.size}`}{' '}
                        · {choice.words.length} palabras
                      </small>
                    </button>
                    {remove === choice.id ? (
                      <div className="remove-confirm">
                        <p>¿Eliminar «{choice.name}» y su avance?</p>
                        <button
                          onClick={() => {
                            setData((old) => {
                              const progress = { ...old.progress };
                              delete progress[choice.id];
                              return {
                                ...old,
                                customs: old.customs.filter(
                                  (c) => c.id !== choice.id,
                                ),
                                progress,
                              };
                            });
                            setRemove(null);
                          }}
                        >
                          Sí, eliminar
                        </button>
                        <button onClick={() => setRemove(null)}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        className="remove-soup"
                        aria-label={`Eliminar ${choice.name}`}
                        onClick={() => setRemove(choice.id)}
                      >
                        Eliminar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p className="local-note">
            Se guardan en este dispositivo, sin necesidad de una cuenta.
          </p>
        </>
      )}
    </main>
  );
}
