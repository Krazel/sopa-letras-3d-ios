'use client';
/* oxlint-disable react/react-compiler -- Browser writes and random puzzle seeds are confined to effects and callbacks passed through Menu. */
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Play as PlayIcon } from 'lucide-react';
import { useInputMode } from '@/hooks/use-input-mode';
import Game from './game';
import GameDialog from './game-dialog';
import { encodePuzzle, decodePuzzle, addCustom } from '@/lib/sharing';
import Menu, { type Section } from './menu';
import { applyTheme } from '@/lib/theme';
import {
  soundEnabled,
  setSoundEnabled,
  installInterfaceAudio,
  playSound,
} from '@/lib/audio';
import {
  supportedLanguage,
  initialLanguage,
  directionFor,
  type Language,
} from '@/lib/preferences';
import { translate, translator } from '@/lib/i18n';
import { type GameState, type PuzzleChoice } from '@/lib/game';
import {
  campaignFor,
  recommendedLevel,
  saveKeyFor,
  emptySave,
  readSave,
  saveGame,
  saveFreeCompletion,
  restore,
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
  useInputMode();
  const [data, setData] = useState<SaveData>(emptySave);
  const [ready, setReady] = useState(false);
  const [section, setSection] = useState<Section>('home');
  const [active, setActive] = useState<Play | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [sound, setSound] = useState(true);
  const [language, setLanguage] = useState<Language>('es');
  const t = translator(language);
  const LEVELS = campaignFor(language);
  const suggestedLevel = recommendedLevel(data, language);
  const [saveError, setSaveError] = useState('');
  const [name, setName] = useState('');
  const [words, setWords] = useState('');
  const [size, setSize] = useState(4);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState<string | null>(null);
  const [shareChoice, setShareChoice] = useState<PuzzleChoice | null>(null);
  const [shareNotice, setShareNotice] = useState('');
  const [importCode, setImportCode] = useState('');
  const [importError, setImportError] = useState('');
  const [customNotice, setCustomNotice] = useState('');
  useEffect(installInterfaceAudio, []);
  useEffect(() => {
    document.title = translate(language, 'Sopa de letras 3D');
    document.documentElement.dir = directionFor(language);
    document.documentElement.lang = language;
  }, [language]);
  // Read browser storage after hydration, then synchronize writes and their error state.
  // Storage effects below run only after hydration.
  useEffect(() => {
    // Keep the approved paper treatment even if an older version saved 'plain'.
    document.documentElement.dataset.background = 'paper';
    let locale: Language = 'es';
    try {
      locale = initialLanguage(
        localStorage.getItem('sopa-language'),
        navigator.languages,
        localStorage.getItem(saveKeyFor('es')) !== null,
      );
      const raw = localStorage.getItem(saveKeyFor(locale));
      setData(readSave(raw));
      // Preserve a recovery copy before retiring old star levels and drafts.
      if (
        raw &&
        (raw.includes('"star"') || raw.includes('"estrella"')) &&
        !localStorage.getItem('sopa-before-cubes-v1')
      )
        try {
          localStorage.setItem('sopa-before-cubes-v1', raw);
        } catch {
          /* A full store must not prevent restoring valid cube progress. */
        }
    } catch {
      setSaveError(
        'El avance no se puede guardar en este dispositivo. Puedes seguir jugando.',
      );
    }
    try {
      setSound(soundEnabled());
      setLanguage(locale);
      document.documentElement.lang = locale;
      const t =
        localStorage.getItem('sopa-theme') === 'dark' ? 'dark' : 'light';
      setTheme(t);
      applyTheme(t);
    } catch {
      /* Keep the default theme. */
    }
    setReady(true);
  }, []);
  useLayoutEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(saveKeyFor(language), JSON.stringify(data));
      setSaveError('');
    } catch {
      setSaveError(
        'No se ha podido guardar el avance. Libera espacio para conservarlo al cerrar.',
      );
    }
  }, [data, ready, language]);

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
  function toggleSound() {
    const value = !sound;
    setSound(value);
    setSoundEnabled(value);
    if (value) void playSound('ui');
  }
  function changeLanguage(value: Language) {
    const locale = supportedLanguage(value);
    if (locale === language) return;
    try {
      localStorage.setItem(saveKeyFor(language), JSON.stringify(data));
      setData(readSave(localStorage.getItem(saveKeyFor(locale))));
    } catch {
      // Do not overwrite one language's in-memory progress with the other's.
      setSaveError(
        t(
          'No se ha podido guardar el avance. Libera espacio para conservarlo al cerrar.',
        ),
      );
      return;
    }
    setError('');
    setRemove(null);
    setLanguage(locale);
    document.documentElement.lang = locale;
    try {
      localStorage.setItem('sopa-language', locale);
    } catch {
      /* Session preference remains usable. */
    }
  }
  function open(choice: PuzzleChoice, mode: 'level' | 'custom' | 'free') {
    try {
      setActive({
        id: choice.id,
        mode,
        title:
          mode === 'level'
            ? t(
                `Página ${LEVELS.find((l) => l.id === choice.id)!.number} · ${choice.name}`,
              )
            : choice.name,
        game: restore(
          choice,
          mode === 'free' ? undefined : data.progress[choice.id],
        ),
      });
      setError('');
    } catch {
      setError(
        t('No se ha podido abrir esta sopa. Prueba a crearla de nuevo.'),
      );
    }
  }
  const onProgress = useCallback(
    (game: GameState) => {
      if (active && (active.mode === 'level' || active.mode === 'custom'))
        setData((old) => saveGame(old, active.id, game));
      else if (active?.mode === 'free')
        setData((old) => saveFreeCompletion(old, active.id, game));
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
      const choice = suggestedLevel;
      if (choice && choice.id !== active.id) {
        open(choice, 'level');
        return;
      }
    }
    exit();
  }
  function persistCustom(nextData: SaveData) {
    // Confirm persistence before telling the player that a puzzle was saved.
    try {
      localStorage.setItem(saveKeyFor(language), JSON.stringify(nextData));
    } catch {
      throw Error(
        'No se ha podido guardar la sopa. Libera espacio e inténtalo de nuevo.',
      );
    }
    setData(nextData);
  }
  function importPuzzle() {
    setImportError('');
    setCustomNotice('');
    try {
      const choice = decodePuzzle(importCode, `custom-${crypto.randomUUID()}`);
      const nextData = addCustom(data, choice);
      persistCustom(nextData);
      setImportCode('');
      setCustomNotice(
        nextData === data
          ? 'Esta sopa ya está en Mis sopas.'
          : 'Sopa importada y guardada en Mis sopas.',
      );
    } catch (e) {
      setImportError((e as Error).message);
    }
  }
  async function sharePuzzle() {
    if (!shareChoice) return;
    const text = encodePuzzle(shareChoice);
    try {
      if (navigator.share) {
        await navigator.share({ title: shareChoice.name, text });
      } else {
        await navigator.clipboard.writeText(text);
        setShareNotice('Código copiado. Envíalo a quien quieras.');
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError')
        setShareNotice(
          'Selecciona y copia el código de abajo para compartirlo.',
        );
    }
  }
  async function create(play = true) {
    setError('');
    setCustomNotice('');
    if (data.customs.length >= 20) {
      setError(t('Ya tienes 20 sopas guardadas. Elimina una para crear otra.'));
      return;
    }
    let choice: PuzzleChoice;
    try {
      choice = customChoice(
        name,
        words,
        'cube',
        size,
        Math.floor(Math.random() * 0x100000000),
        `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        language,
      );
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 30));
    try {
      const result = generateCustom(choice);
      persistCustom(addCustom(data, result.choice));
      if (play)
        setActive({
          id: result.choice.id,
          mode: 'custom',
          title: result.choice.name,
          game: result.game,
        });
      else {
        setCustomNotice('Sopa guardada en Mis sopas.');
        setSection('saved');
      }
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
          language={language}
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
          hasNextLevel={!!suggestedLevel && suggestedLevel.id !== active.id}
          nextLabel={
            active.mode === 'level' && !!suggestedLevel
              ? t('Siguiente nivel')
              : t('Volver al menú')
          }
        />
        {saveError && (
          <p className="save-warning" role="alert">
            {t(saveError)}
          </p>
        )}
      </>
    );
  return (
    <>
      {saveError && (
        <p className="save-warning" role="alert">
          {t(saveError)}
        </p>
      )}
      {!ready ? (
        <main className="loading-screen">
          <p>{t('Cargando tu avance…')}</p>
        </main>
      ) : (
        <Menu
          key={language}
          section={section}
          navigate={setSection}
          data={data}
          theme={theme}
          toggleTheme={toggleTheme}
          sound={sound}
          toggleSound={toggleSound}
          language={language}
          changeLanguage={changeLanguage}
          open={open}
          free={(dice) =>
            setActive({
              id: dice ? 'dice' : 'free',
              mode: dice ? 'dice' : 'free',
              title: dice ? t('Prueba de dados') : t('Juego libre'),
            })
          }
        >
          {section === 'create' && (
            <>
              <section className="creator-intro">
                <p>
                  {t(
                    'Escribe las palabras y elige dónde esconderlas. Podrás jugarla y volver a ella cuando quieras.',
                  )}{' '}
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
                  {t('Nombre de la sopa')}{' '}
                  <input
                    name="name"
                    aria-label={t('Nombre de la sopa')}
                    autoComplete="off"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={40}
                    required
                    placeholder={t('Por ejemplo, Mi universo')}
                  />
                </label>
                <div className="creator-options">
                  <label>
                    {t('Tamaño')}{' '}
                    <select
                      aria-label={t('Tamaño')}
                      value={size}
                      onChange={(e) => setSize(Number(e.target.value))}
                    >
                      {[3, 4, 5, 6, 8, 10].map((n) => (
                        <option key={n} value={n}>
                          {n} × {n} × {n} · {n ** 3} {t('letras')}{' '}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  {t('Palabras')}{' '}
                  <textarea
                    name="words"
                    aria-label={t('Palabras')}
                    value={words}
                    onChange={(e) => {
                      setWords(e.target.value);
                      setError('');
                    }}
                    maxLength={2200}
                    rows={5}
                    required
                    placeholder={t('LUNA\nCOMETA\nPLANETA')}
                    aria-describedby="words-help"
                  />
                </label>
                <p id="words-help" className="field-help">
                  {t(
                    'De 1 a 12 palabras, de 1 a 16 letras o caracteres cada una. Sepáralas con comas o saltos de línea. Se conservan las tildes y los signos de cada idioma.',
                  )}{' '}
                </p>
                {error && (
                  <p className="form-error" role="alert">
                    {t(error)}
                  </p>
                )}
                <button
                  data-sound="none"
                  className="primary-action"
                  disabled={busy}
                  type="submit"
                >
                  {busy ? t('Colocando tus palabras…') : t('Guardar y jugar')}
                </button>
                <button
                  className="dialog-action"
                  disabled={busy}
                  type="button"
                  onClick={() => void create(false)}
                  data-sound="none"
                >
                  {t('Guardar sin jugar')}
                </button>
              </form>
            </>
          )}
          {customNotice && (
            <output className="custom-notice">{t(customNotice)}</output>
          )}
          <section className="saved-soups">
            <h2>
              {t('Mis sopas')} <span>{data.customs.length}</span>
            </h2>
            {!data.customs.length ? (
              <p className="local-note">
                {t('Tus sopas aparecerán aquí cuando crees la primera.')}{' '}
              </p>
            ) : (
              <ul>
                {data.customs.map((choice) => (
                  <li key={choice.id}>
                    <button
                      className="saved-play"
                      aria-label={`${t('Jugar')}: ${choice.name}`}
                      onClick={() => open(choice, 'custom')}
                    >
                      <strong>{choice.name}</strong>
                      <small>
                        {`${choice.size} × ${choice.size} × ${choice.size}`} ·{' '}
                        {choice.words.length} {t('palabras')}{' '}
                      </small>
                      <span className="saved-open">
                        <PlayIcon size={18} aria-hidden="true" />
                        {t('Jugar')}
                      </span>
                    </button>
                    <button
                      className="share-soup"
                      aria-label={`${t('Compartir')}: ${choice.name}`}
                      onClick={() => {
                        setShareNotice('');
                        setShareChoice(choice);
                      }}
                    >
                      {t('Compartir')}
                    </button>
                    {remove === choice.id ? (
                      <div className="remove-confirm">
                        <p>
                          {t('¿Eliminar «')}
                          {choice.name}
                          {t('» y su avance?')}
                        </p>
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
                          {t('Sí, eliminar')}{' '}
                        </button>
                        <button onClick={() => setRemove(null)}>
                          {t('Cancelar')}{' '}
                        </button>
                      </div>
                    ) : (
                      <button
                        className="remove-soup"
                        aria-label={t(`Eliminar ${choice.name}`)}
                        onClick={() => setRemove(choice.id)}
                      >
                        {t('Eliminar')}{' '}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <details className="import-soup">
            <summary>{t('Importar una sopa')}</summary>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                importPuzzle();
              }}
            >
              <label htmlFor="import-code">{t('Código de la sopa')}</label>
              <textarea
                id="import-code"
                value={importCode}
                onChange={(event) => {
                  setImportCode(event.target.value);
                  setImportError('');
                }}
                maxLength={8192}
                rows={3}
                required
                placeholder="SOPA1-…"
                spellCheck={false}
                autoCapitalize="off"
              />
              {importError && (
                <p className="form-error" role="alert">
                  {t(importError)}
                </p>
              )}
              <button
                data-sound="none"
                className="primary-action"
                type="submit"
              >
                {t('Importar y guardar')}
              </button>
            </form>
          </details>
          <p className="local-note">
            {t(
              'Se guardan en este dispositivo, sin necesidad de una cuenta.',
            )}{' '}
          </p>
        </Menu>
      )}
      <GameDialog
        open={shareChoice !== null}
        onClose={() => setShareChoice(null)}
        title={t('Compartir sopa')}
      >
        <h2>{t('Compartir sopa')}</h2>
        <p>{shareChoice?.name}</p>
        <p>
          {t(
            'Envía este código. La otra persona puede pegarlo en Partida personalizada → Importar una sopa. Se comparte la sopa, sin tu avance.',
          )}
        </p>
        <textarea
          className="share-code"
          aria-label={t('Código para compartir')}
          readOnly
          rows={3}
          value={shareChoice ? encodePuzzle(shareChoice) : ''}
          onFocus={(event) => event.target.select()}
        />
        {shareNotice && (
          <output className="custom-notice">{t(shareNotice)}</output>
        )}
        <button className="primary-action" onClick={() => void sharePuzzle()}>
          {t('Compartir o copiar código')}
        </button>
        <button className="dialog-action" onClick={() => setShareChoice(null)}>
          {t('Cerrar')}
        </button>
      </GameDialog>
    </>
  );
}
