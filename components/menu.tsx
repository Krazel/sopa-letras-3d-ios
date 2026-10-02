/* oxlint-disable next/no-img-element -- Static artwork ships unchanged, with intrinsic dimensions and no image server. */
import { useState, type ReactNode } from 'react';
import PuzzleIcon from './puzzle-icon';
import AdSettings from './ad-settings';
import {
  Home,
  Gamepad2,
  ChartNoAxesColumnIncreasing,
  Settings,
  Play,
  ChevronRight,
  BookOpen,
  Check,
  Moon,
  Sun,
  Trophy,
  Dices,
  Volume2,
  VolumeX,
  Languages,
  ChevronLeft,
} from 'lucide-react';
import {
  levelsFor,
  campaignFor,
  CAMPAIGN_SIZES,
  DIFFICULTIES,
  recommendedLevel,
  type SaveData,
} from '@/lib/player';
import { type PuzzleChoice } from '@/lib/game';
import { translator } from '@/lib/i18n';
import { spanishSpelling } from '@/lib/spanish-spelling';
import { LANGUAGES, type Language } from '@/lib/preferences';

export type Section =
  | 'home'
  | 'modes'
  | 'levels'
  | 'create'
  | 'saved'
  | 'catalog'
  | 'progress'
  | 'settings';
type Props = {
  section: Section;
  navigate: (section: Section) => void;
  data: SaveData;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  sound: boolean;
  toggleSound: () => void;
  language: Language;
  changeLanguage: (language: Language) => void;
  open: (choice: PuzzleChoice, mode: 'level' | 'custom' | 'free') => void;
  free: (dice: boolean) => void;
  children: ReactNode;
};
const dimensions = (p: PuzzleChoice, language: Language) =>
  `${p.size} × ${p.size} × ${p.size} · ${p.size ** 3} ${translator(language)('letras')}`;

export default function Menu({
  section,
  navigate,
  data,
  theme,
  toggleTheme,
  sound,
  toggleSound,
  language,
  changeLanguage,
  open,
  free,
  children,
}: Props) {
  const t = translator(language);
  const [difficulty, setDifficulty] = useState('all');
  const liveHome = language !== 'es' && language !== 'en';
  const LEVELS = campaignFor(language);
  const completedCount = LEVELS.filter((p) =>
    data.completed.includes(p.id),
  ).length;
  const PUZZLES = levelsFor(language)
    .slice()
    .sort((a, b) => a.size - b.size);
  const suggested = recommendedLevel(data, language);
  const filteredPuzzles = PUZZLES.filter(
    (p) => difficulty === 'all' || p.difficulty === difficulty,
  );
  const next = suggested ?? LEVELS.at(-1)!;
  const wordsFound = [...PUZZLES, ...data.customs].reduce(
    (n, p) =>
      n +
      [
        ...new Set(
          Object.keys(data.progress[p.id]?.paths ?? {}).map((w) =>
            p.legacyWords?.includes(w) ? spanishSpelling(w) : w,
          ),
        ),
      ].filter((w) => p.words.includes(w)).length,
    0,
  );
  const title = {
    home: t('Sopa de letras'),
    modes: t('Jugar'),
    levels: t('Niveles'),
    saved: t('Mis sopas'),
    create: t('Crea tu sopa'),
    catalog: t('Juego libre'),
    progress: t('Estadísticas'),
    settings: t('Ajustes'),
  }[section];
  return (
    <main
      className={`studio-menu section-${section}`}
      aria-label={t('Menú del juego')}
    >
      {section === 'home' && (
        <>
          <svg className="home-desk" aria-hidden="true">
            <defs>
              <pattern
                id="sopa-desk"
                patternUnits="userSpaceOnUse"
                width="480"
                height="120"
              >
                <svg
                  id="sopa-wood"
                  width="240"
                  height="60"
                  viewBox="440 165 240 60"
                  preserveAspectRatio="none"
                >
                  <image
                    href="/art/reference-ui/home-custom-es.png"
                    width="852"
                    height="1847"
                  />
                </svg>
                <use
                  href="#sopa-wood"
                  transform="translate(480 0) scale(-1 1)"
                />
                <use
                  href="#sopa-wood"
                  transform="translate(0 120) scale(1 -1)"
                />
                <use
                  href="#sopa-wood"
                  transform="translate(480 120) scale(-1 -1)"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#sopa-desk)" />
          </svg>
          <button
            className="home-wide-settings"
            aria-label={t('Abrir ajustes')}
            onClick={() => navigate('settings')}
          >
            <Settings aria-hidden="true" />
          </button>
        </>
      )}
      <div className="menu-scroll">
        {section !== 'home' && (
          <header className="screen-header">
            <button
              className="icon-button"
              onClick={() =>
                navigate(
                  ['levels', 'catalog'].includes(section) ? 'modes' : 'home',
                )
              }
              aria-label={t('Volver')}
            >
              <ChevronLeft />
            </button>
            <h1>{title}</h1>
          </header>
        )}
        {section === 'home' && (
          <section
            className={`straight-home ${liveHome ? 'translated-home' : ''}`}
            aria-label={t('Portada')}
          >
            <img
              className="straight-home-art"
              src={
                liveHome
                  ? '/art/reference-ui/home-language-neutral.png'
                  : language === 'en'
                    ? '/art/reference-ui/home-custom-en.png'
                    : '/art/reference-ui/home-custom-es.png'
              }
              alt=""
              width={852}
              height={1847}
              fetchPriority="high"
              draggable={false}
            />
            {!liveHome && (
              <img
                className="home-button-art"
                src="/art/reference-ui/home-language-neutral.png"
                alt=""
                width={852}
                height={1847}
                draggable={false}
              />
            )}
            <h1 className={liveHome ? 'live-home-title' : 'sr-only'}>
              {t('Sopa de letras 3D')}
            </h1>
            <p className={liveHome ? 'live-home-subtitle' : 'sr-only'}>
              {t('Encuentra todas las palabras. En 3D: gira y explora.')}{' '}
            </p>
            <button
              className="home-hotspot home-settings"
              aria-label={t('Abrir ajustes')}
              onClick={() => navigate('settings')}
            >
              <span className="sr-only">{t('Ajustes')}</span>
            </button>
            <button
              className="home-hotspot home-play"
              aria-label={t('Jugar')}
              onClick={() => navigate('modes')}
            >
              <span className="live-home-label">{t('Jugar')}</span>
            </button>
            <button
              className="home-hotspot home-modes"
              onClick={() => navigate('create')}
            >
              <span className="live-home-label">
                {t('Partida personalizada')}
              </span>
            </button>
            <button
              className="home-hotspot home-progress"
              onClick={() => navigate('progress')}
            >
              <span className="live-home-label">{t('Estadísticas')}</span>
            </button>
            <p className={liveHome ? 'live-home-motto' : 'sr-only'}>
              {t('Pequeños desafíos, grandes mentes')}
            </p>
          </section>
        )}
        {section === 'modes' && (
          <>
            <p className="screen-intro">{t('Elige cómo quieres jugar hoy.')}</p>
            <div className="mode-list">
              <button
                className="mode-card green"
                onClick={() => navigate('levels')}
              >
                <span className="mode-art mode-art-leaf" aria-hidden="true" />
                <span>
                  <strong>{t('Niveles')}</strong>
                  <small>{t('Un reto cada vez. Cuatro de cada tamaño.')}</small>
                </span>
                <ChevronRight />
              </button>
              <button
                className="mode-card blue"
                onClick={() => navigate('catalog')}
              >
                <span
                  className="mode-art mode-art-lightning"
                  aria-hidden="true"
                />
                <span>
                  <strong>{t('Juego libre')}</strong>
                  <small>
                    {t('Todos los temas disponibles, sin desbloqueos.')}
                  </small>
                </span>
                <ChevronRight />
              </button>
              <button
                className="mode-card purple saved-mode"
                onClick={() => navigate('saved')}
              >
                <BookOpen className="saved-mode-icon" aria-hidden="true" />
                <span>
                  <strong>{t('Mis sopas')}</strong>
                  <small>
                    {t('Abre tus sopas guardadas o crea una nueva.')}
                  </small>
                </span>
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
            <section
              className="experimental-modes"
              aria-labelledby="experimental-heading"
            >
              <h2 id="experimental-heading">{t('EXPERIMENTAL')}</h2>
              <button className="experimental-dice" onClick={() => free(true)}>
                <Dices aria-hidden="true" />
                <span>
                  <strong>{t('Probar dados')}</strong>
                  <small>{t('Para quien busca un reto extremo.')}</small>
                </span>
                <ChevronRight aria-hidden="true" />
              </button>
            </section>
          </>
        )}
        {section === 'levels' && (
          <>
            <p className="screen-intro">
              {t(
                'Empieza por lo fácil y avanza hacia retos cada vez más difíciles.',
              )}
            </p>
            <section
              className="campaign-current"
              aria-labelledby="current-level-heading"
            >
              <span className="eyebrow">
                {t(`Nivel ${next.number} de ${LEVELS.length}`)}
              </span>
              <div className="campaign-logo">
                <PuzzleIcon id={next.id} />
              </div>
              <h2 id="current-level-heading">{next.name}</h2>
              <p>{dimensions(next, language)}</p>
              <small>
                {t(next.difficulty)} · {next.words.length} {t('palabras')}
              </small>
              <button
                className="primary-action"
                onClick={() => open(next, 'level')}
              >
                <Play size={18} />
                {t(suggested ? 'Continuar · Nivel' : 'Volver a jugar')}{' '}
                {next.number}
                <ChevronRight aria-hidden="true" />
              </button>
            </section>
            {!suggested && (
              <p className="local-note">
                {t(
                  'Recorrido completado. Puedes repetir niveles o explorar Juego libre.',
                )}
              </p>
            )}
            <section className="campaign-stages" aria-label={t('Tu recorrido')}>
              {CAMPAIGN_SIZES.map((size) => {
                const levels = LEVELS.filter((p) => p.size === size);
                return (
                  <div className="campaign-stage" key={size}>
                    <strong>
                      {size} × {size} × {size}
                    </strong>
                    <span className="stage-marks">
                      {levels.map((p) => {
                        const done = data.completed.includes(p.id);
                        const current = p.id === suggested?.id;
                        const label = `${t(`Nivel ${p.number} de ${LEVELS.length}`)}: ${p.name}${done ? ', ' + t('Completada en Niveles') : ''}`;
                        return (
                          <button
                            key={p.id}
                            className={done ? 'done' : current ? 'current' : ''}
                            aria-label={label}
                            title={label}
                            aria-current={current ? 'step' : undefined}
                            disabled={!done && !current}
                            onClick={() => open(p, 'level')}
                          >
                            {done ? (
                              <Check size={18} aria-hidden="true" />
                            ) : (
                              p.number
                            )}
                          </button>
                        );
                      })}
                    </span>
                  </div>
                );
              })}
            </section>
          </>
        )}
        {section === 'catalog' && (
          <>
            <p className="screen-intro">
              {t(
                'Aquí están todas las sopas. ✓ indica las completadas en Niveles.',
              )}{' '}
            </p>
            <label className="catalog-filter">
              <span>{t('Dificultad')}</span>
              <select
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
              >
                <option value="all">{t('Todas las dificultades')}</option>
                {DIFFICULTIES.map((value) => (
                  <option key={value} value={value}>
                    {t(value)}
                  </option>
                ))}
              </select>
            </label>
            <div className="catalog-list">
              {filteredPuzzles.map((p) => (
                <button
                  key={p.id}
                  className={`menu-row ${data.completed.includes(p.id) ? 'completed-in-levels' : ''}`}
                  aria-label={`${p.name}${data.completed.includes(p.id) ? ', ' + t('Completada en Niveles') : ''}`}
                  onClick={() => open(p, 'free')}
                >
                  <PuzzleIcon id={p.id} />
                  <span>
                    <strong>{p.name}</strong>
                    <small>
                      {dimensions(p, language)} · {p.words.length}{' '}
                      {t('palabras')}{' '}
                    </small>
                  </span>
                  {data.completed.includes(p.id) ? (
                    <Check className="catalog-check" aria-hidden="true" />
                  ) : (
                    <ChevronRight aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
        {section === 'saved' && (
          <>
            <p className="screen-intro">
              {t('Abre tus sopas guardadas o crea una nueva.')}
            </p>
            <button
              className="primary-action"
              onClick={() => navigate('create')}
            >
              {t('Crea tu sopa')}
              <ChevronRight aria-hidden="true" />
            </button>
          </>
        )}
        {(section === 'create' || section === 'saved') && children}
        {section === 'progress' && (
          <>
            <p className="screen-intro">{t('Cada palabra cuenta.')}</p>
            <div className="stat-grid">
              <div>
                <strong>
                  {completedCount}
                  <small>/{LEVELS.length}</small>
                </strong>
                <span>{t('Niveles completos')}</span>
              </div>
              <div>
                <strong>{wordsFound}</strong>
                <span>{t('Palabras guardadas')}</span>
              </div>
              <div>
                <strong>{data.customs.length}</strong>
                <span>{t('Sopas creadas')}</span>
              </div>
            </div>
            <section className="progress-card">
              <h2>
                <BookOpen size={21} />
                {t('Tu libro, capítulo a capítulo')}{' '}
              </h2>
              {CAMPAIGN_SIZES.map((size, i) => {
                const name = `${size} × ${size} × ${size}`;
                const levels = LEVELS.slice(i * 4, i * 4 + 4),
                  count = levels.filter((l) =>
                    data.completed.includes(l.id),
                  ).length;
                return (
                  <div className="chapter-progress" key={name}>
                    <div>
                      <span>{t(name)}</span>
                      <strong>
                        {count}/{levels.length}
                      </strong>
                    </div>
                    <progress
                      value={count}
                      max={levels.length}
                      aria-label={t(`Progreso en ${name}`)}
                    />
                  </div>
                );
              })}
            </section>
            <section className="next-card">
              <Trophy />
              <div>
                <h2>
                  {completedCount === LEVELS.length
                    ? t('¡Tu libro está completo!')
                    : t(suggested ? 'Tu siguiente página' : 'Volver a jugar')}
                </h2>
                <p>
                  {next.name} · {dimensions(next, language)}
                </p>
                <button onClick={() => open(next, 'level')}>
                  {!suggested ? t('Volver a jugar') : t('Seguir jugando')}
                  <ChevronRight size={18} />
                </button>
              </div>
            </section>
            <p className="local-note">
              {t(
                'Progreso de niveles y sopas propias guardado en este navegador. El juego libre y los dados no se suman a estas cifras.',
              )}{' '}
            </p>
          </>
        )}
        {section === 'settings' && (
          <>
            <p className="screen-intro">{t('Hazlo a tu gusto.')}</p>
            <section className="settings-group">
              <h2>{t('Aspecto')}</h2>
              <button
                className="menu-row"
                role="switch"
                aria-checked={sound}
                aria-label={t('Sonidos del juego')}
                data-sound="none"
                onClick={toggleSound}
              >
                {sound ? <Volume2 /> : <VolumeX />}
                <span>
                  <strong>{t('Sonidos del juego')}</strong>
                </span>
                <span className="switch-track" data-checked={sound}>
                  <i />
                </span>
              </button>
              <button
                className="menu-row"
                role="switch"
                aria-checked={theme === 'dark'}
                aria-label={t('Modo oscuro')}
                onClick={toggleTheme}
              >
                {theme === 'dark' ? <Moon /> : <Sun />}
                <span>
                  <strong>{t('Modo oscuro')}</strong>
                  <small>
                    {theme === 'dark'
                      ? t('Una luz más suave')
                      : t('Papel claro y cálido')}
                  </small>
                </span>
                <span className="switch-track" data-checked={theme === 'dark'}>
                  <i />
                </span>
              </button>
            </section>
            <section className="settings-group">
              <label className="language-setting">
                <Languages />
                <span>
                  {t('Idioma')}
                  <small>
                    {t('Palabras y progreso independientes por idioma')}
                  </small>
                </span>
                <select
                  aria-label={t('Idioma')}
                  value={language}
                  disabled={LANGUAGES.length < 2}
                  onChange={(e) => changeLanguage(e.target.value as Language)}
                >
                  {LANGUAGES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </section>
            <AdSettings language={language} />
            <details className="settings-group settings-help">
              <summary>
                <BookOpen size={22} />
                {t('Cómo jugar')} <ChevronRight size={18} />
              </summary>
              <div className="help-rules">
                <p>
                  {t(
                    'Las palabras pueden compartir casillas, aunque ya estén marcadas. En una misma palabra cada casilla se usa una sola vez.',
                  )}
                </p>
                <p>
                  <strong>{t('Toca')}</strong>{' '}
                  {t(
                    'letras vecinas, una a una, para formar las palabras. También se conectan entre capas.',
                  )}{' '}
                </p>
                <p>
                  <strong>{t('Arrastra')}</strong>{' '}
                  {t(
                    'para girar libremente. Pellizca o usa la rueda para acercarte, incluso al interior.',
                  )}{' '}
                </p>
                <p>
                  <strong>{t('Deshaz')}</strong>{' '}
                  {t(
                    'tocando una letra ya elegida. Si tocas una que no es vecina, se borra la selección.',
                  )}{' '}
                </p>
              </div>
            </details>
          </>
        )}
      </div>
      {section !== 'home' && (
        <nav className="bottom-nav" aria-label={t('Navegación principal')}>
          {(
            [
              ['home', t('Inicio'), Home],
              ['modes', t('Jugar'), Gamepad2],
              ['progress', t('Progreso'), ChartNoAxesColumnIncreasing],
              ['settings', t('Ajustes'), Settings],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              aria-current={
                (
                  id === 'modes'
                    ? [
                        'modes',
                        'levels',
                        'catalog',
                        'saved',
                        'create',
                      ].includes(section)
                    : id === section
                )
                  ? 'page'
                  : undefined
              }
              onClick={() => navigate(id)}
            >
              <Icon size={22} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}
    </main>
  );
}
