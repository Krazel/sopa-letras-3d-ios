import { WORLD_UI, WORLD_ALIASES } from './locale-ui.ts';
import { WORLD_CONTENT } from './locale-content.ts';
import { MENU_UI, MENU_ALIASES } from './locale-menu.ts';
import type { Language } from './preferences.ts';
export const EN: Record<string, string> = {
  encontrada: 'found',
  seleccionada: 'selected',
  columna: 'column',
  fila: 'row',
  capa: 'layer',
  Dado: 'Die',
  'Guardar y jugar': 'Save and play',
  'Guardar sin jugar': 'Save for later',
  'Sopa guardada en Mis sopas.': 'Puzzle saved in My puzzles.',
  'No se ha podido guardar la sopa. Libera espacio e inténtalo de nuevo.':
    'Could not save the puzzle. Free up storage and try again.',
  Compartir: 'Share',
  'Compartir sopa': 'Share puzzle',
  'Código para compartir': 'Sharing code',
  'Compartir o copiar código': 'Share or copy code',
  'Código copiado. Envíalo a quien quieras.':
    'Code copied. Send it to anyone you like.',
  'Selecciona y copia el código de abajo para compartirlo.':
    'Select and copy the code below to share it.',
  'Envía este código. La otra persona puede pegarlo en Partida personalizada → Importar una sopa. Se comparte la sopa, sin tu avance.':
    'Send this code. The recipient can paste it in Custom game → Import a puzzle. It shares the puzzle without your progress.',
  'Importar una sopa': 'Import a puzzle',
  'Código de la sopa': 'Puzzle code',
  'Importar y guardar': 'Import and save',
  'Sopa importada y guardada en Mis sopas.':
    'Puzzle imported and saved in My puzzles.',
  'Esta sopa ya está en Mis sopas.': 'This puzzle is already in My puzzles.',
  'El código de sopa no es válido o pertenece a otra versión.':
    'The puzzle code is invalid or belongs to another version.',
  Cerrar: 'Close',
  'Partida personalizada': 'Custom game',
  'Abrir ayuda': 'Open help',
  'Cerrar ayuda': 'Close help',
  Entendido: 'Got it',
  'Esa letra no es vecina. Selección borrada; elige una letra para empezar.':
    'That letter is not a neighbour. Selection cleared; choose a letter to begin.',
  'Sopa de letras 3D': 'Word Search 3D',
  'Sopa de letras': 'Word Search',
  'Menú del juego': 'Game menu',
  Portada: 'Home',
  Volver: 'Back',
  'Abrir ajustes': 'Open settings',
  Ajustes: 'Settings',
  Jugar: 'Play',
  'Modos de juego': 'Game modes',
  Estadísticas: 'Statistics',
  'Encuentra todas las palabras. En 3D: gira y explora.':
    'Find all the words. In 3D: rotate and explore.',
  'Pequeños desafíos, grandes mentes': 'Small challenges, great minds',
  'Mi libro de sopas': 'My puzzle book',
  'Crea tu sopa': 'Create a puzzle',
  Categorías: 'Categories',
  'Elige cómo quieres jugar hoy.': 'Choose how to play today.',
  Niveles: 'Levels',
  'Una página, un reto.': 'One page, one challenge.',
  'De fácil a experto.': 'From easy to expert.',
  'Juego libre': 'Free play',
  'Cubos de letras, a tu ritmo.': 'Letter cubes at your own pace.',
  'Elige tu tema y tamaño.': 'Choose a theme and size.',
  'Tu propia sopa': 'Your own puzzle',
  'Tus palabras, tu forma.': 'Your words, your puzzle.',
  'Crea tu primer reto.': 'Create your first challenge.',
  EXPERIMENTAL: 'EXPERIMENTAL',
  'Probar dados': 'Try dice',
  'Para quien busca un reto extremo.':
    'For those seeking an extreme challenge.',
  'Seis caras, seis letras.': 'Six faces, six letters.',
  'Explora otra forma de jugar.': 'Explore another way to play.',
  CAPÍTULO: 'CHAPTER',
  'Capítulo anterior': 'Previous chapter',
  'Capítulo siguiente': 'Next chapter',
  'Continuar · Nivel': 'Continue · Level',
  'Completa cada sopa para abrir la siguiente página.':
    'Complete each puzzle to unlock the next page.',
  'Completa 4 retos de una dificultad para abrir la siguiente. Los demás son opcionales.':
    'Complete 4 challenges at one difficulty to unlock the next. The rest are optional.',
  'Todos los temas disponibles, sin desbloqueos.':
    'All themes are available, with no unlocking needed.',
  palabras: 'words',
  letras: 'letters',
  'Cada palabra cuenta.': 'Every word counts.',
  'Niveles completos': 'Completed levels',
  'Palabras guardadas': 'Saved words',
  'Sopas creadas': 'Created puzzles',
  'Tu libro, capítulo a capítulo': 'Your book, chapter by chapter',
  '¡Tu libro está completo!': 'Your book is complete!',
  'Tu siguiente página': 'Your next page',
  'Volver a jugar': 'Play again',
  'Seguir jugando': 'Keep playing',
  'Progreso de niveles y sopas propias guardado en este navegador. El juego libre y los dados no se suman a estas cifras.':
    'Level and custom puzzle progress is saved in this browser. Free play and dice are not included in these totals.',
  'Hazlo a tu gusto.': 'Make it your own.',
  Aspecto: 'Preferences',
  'Sonidos del juego': 'Game sounds',
  'Modo oscuro': 'Dark mode',
  'Una luz más suave': 'Softer light',
  'Papel claro y cálido': 'Light, warm paper',
  Idioma: 'Language',
  'Palabras y progreso independientes por idioma':
    'Words and progress are separate for each language',
  'Cómo jugar': 'How to play',
  Toca: 'Tap',
  'letras vecinas, una a una, para formar las palabras. También se conectan entre capas.':
    'neighbouring letters one at a time to form words. Letters also connect across layers.',
  Arrastra: 'Drag',
  'para girar libremente. Pellizca o usa la rueda para acercarte, incluso al interior.':
    'to rotate freely. Pinch or use the wheel to zoom, even inside the cube.',
  Deshaz: 'Undo',
  'tocando una letra ya elegida. Si tocas una que no es vecina, se borra la selección.':
    'by tapping a selected letter. Tapping a non-neighbouring letter clears the selection.',
  'Con teclado: tabulador y Enter para letras; flechas para girar y + / − para zoom con la figura enfocada.':
    'Keyboard: Tab and Enter for letters; arrow keys to rotate and + / − to zoom while the cube has focus.',
  'Navegación principal': 'Main navigation',
  Inicio: 'Home',
  Modos: 'Modes',
  Progreso: 'Progress',
  'Primeras palabras': 'First words',
  'Entre árboles': 'Among the trees',
  'Más allá': 'Beyond',
  'Grandes descubrimientos': 'Great discoveries',
  'Pequeñas cosas': 'Little things',
  'A la mesa': 'At the table',
  'Vida cercana': 'Life around us',
  'Nuestro mundo': 'Our world',
  'Tiempo libre': 'Leisure time',
  'Al aire libre': 'Outdoors',
  'Mundos salvajes': 'Wild worlds',
  'Lo que somos': 'Who we are',
  'Ciencia en acción': 'Science in action',
  'Ideas que viajan': 'Ideas on the move',
  'El gran desafío': 'The grand challenge',
  Fácil: 'Easy',
  Suave: 'Gentle',
  Intermedio: 'Intermediate',
  Difícil: 'Hard',
  Experto: 'Expert',
  'El avance no se puede guardar en este dispositivo. Puedes seguir jugando.':
    'Progress cannot be saved on this device. You can keep playing.',
  'No se ha podido guardar el avance. Libera espacio para conservarlo al cerrar.':
    'Progress could not be saved. Free some space to keep it after closing.',
  'No se ha podido abrir esta sopa. Prueba a crearla de nuevo.':
    'This puzzle could not be opened. Try creating it again.',
  'Ya tienes 20 sopas guardadas. Elimina una para crear otra.':
    'You already have 20 saved puzzles. Delete one to create another.',
  'Siguiente nivel': 'Next level',
  'Volver al menú': 'Back to menu',
  'Cargando tu avance…': 'Loading your progress…',
  'Prueba de dados': 'Dice trial',
  'Escribe las palabras y elige dónde esconderlas. Podrás jugarla y volver a ella cuando quieras.':
    'Enter your words and choose where to hide them. Play your puzzle and return to it whenever you like.',
  'Nombre de la sopa': 'Puzzle name',
  'Por ejemplo, Mi universo': 'For example, My universe',
  Tamaño: 'Size',
  Palabras: 'Words',
  'LUNA\nCOMETA\nPLANETA': 'MOON\nCOMET\nPLANET',
  'De 1 a 12 palabras, de 1 a 16 letras o caracteres cada una. Sepáralas con comas o saltos de línea. Se conservan las tildes y los signos de cada idioma.':
    'Enter 1 to 12 words, each 1 to 16 letters or characters long. Separate with commas or line breaks. Accents and language marks are preserved.',
  'Colocando tus palabras…': 'Placing your words…',
  'Crear y jugar': 'Create and play',
  'Mis sopas': 'My puzzles',
  'Tus sopas aparecerán aquí cuando crees la primera.':
    'Your puzzles will appear here after you create one.',
  '¿Eliminar «': 'Delete “',
  '» y su avance?': '” and its progress?',
  'Sí, eliminar': 'Yes, delete',
  Cancelar: 'Cancel',
  Eliminar: 'Delete',
  'Se guardan en este dispositivo, sin necesidad de una cuenta.':
    'Saved on this device. No account needed.',
  'Pon un nombre de entre 1 y 40 caracteres.':
    'Enter a name between 1 and 40 characters.',
  'Escribe entre 1 y 12 palabras.': 'Enter between 1 and 12 words.',
  'Cada palabra debe tener de 1 a 16 letras, sin espacios ni números.':
    'Each word must have 1 to 16 letters or characters, with no spaces or numbers.',
  'Hay palabras repetidas. Deja cada palabra una sola vez.':
    'There are duplicate words. Keep each word only once.',
  'Elige un tamaño disponible.': 'Choose an available size.',
  'Elige una forma disponible.': 'Choose an available shape.',
  'Elige un tamaño mayor para que quepan todas las palabras.':
    'Choose a larger size to fit all the words.',
  'No he podido encajar estas palabras. Prueba un tamaño mayor o menos palabras.':
    'These words could not be fitted. Try a larger size or fewer words.',
  'Pausar partida': 'Pause game',
  'Mi sopa de letras': 'My word search',
  'Dados · Experimental': 'Dice · Experimental',
  'Mostrar controles': 'Show controls',
  'Ocultar controles': 'Hide controls',
  'Une caras del mismo dado que compartan borde, o letras de dados vecinos.':
    'Connect faces sharing an edge on the same die, or letters on neighbouring dice.',
  'Toca una letra por cara': 'Tap a letter on a face',
  'Toca letras': 'Tap letters',
  '· Arrastra para girar · Pellizca para acercar':
    '· Drag to rotate · Pinch to zoom',
  Sopa: 'Puzzle',
  'Toca y suelta letras vecinas para formar palabras. Arrastra para girar sin límites; pellizca o usa la rueda para acercarte y alejarte. Toca la última letra para deshacer. Con la figura enfocada, usa las flechas para girar y más o menos para el zoom. Tocar una letra no vecina borra la selección.':
    'Tap neighbouring letters to form words. Drag to rotate freely; pinch or use the wheel to zoom. Tap the last letter to undo. With the cube focused, use arrow keys to rotate and plus or minus to zoom. Tapping a non-neighbouring letter clears the selection.',
  'Cubo de letras': 'Letter cube',
  'Palabras por encontrar': 'Words to find',
  'Elige una cara del dado': 'Choose a die face',
  'Elige una cara': 'Choose a face',
  'Cerrar caras': 'Close faces',
  'A tu ritmo': 'At your own pace',
  'Palabras encontradas': 'Words found',
  'Ver resultado': 'View result',
  'Partida en pausa': 'Game paused',
  'Un pequeño descanso': 'A little break',
  'Todo sigue donde lo dejaste.': 'Everything is just as you left it.',
  'Sopa completada': 'Puzzle completed',
  'Ver sopa completada': 'View completed puzzle',
  '¡BIEN ENCONTRADO!': 'WELL FOUND!',
  '¡Nivel completado!': 'Level completed!',
  '¡Sopa completada!': 'Puzzle completed!',
  'Has encontrado todas las palabras.': 'You found all the words.',
  'Empieza de nuevo.': 'Start again.',
  'Toca las letras una a una. Cada letra debe estar junto a la anterior.':
    'Tap letters one at a time. Each letter must be next to the previous one.',
  'Has retrocedido. Sigue por una letra vecina.':
    'You stepped back. Continue with a neighbouring letter.',
  'Selección cancelada. Elige una letra.':
    'Selection cleared. Choose a letter.',
};
// Dynamic text templates are explicit; puzzle words and user-authored titles
// never pass through this translator.
Object.assign(
  EN,
  Object.fromEntries(
    Object.entries(MENU_ALIASES).map(([text, key]) => [text, MENU_UI.en![key]]),
  ),
);
export function translate(language: Language, text: string): string {
  if (language === 'es') return text;
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (language !== 'en') return worldTranslate(language, text);
  if (EN[text] !== undefined) return EN[text];
  if (EN[normalized] !== undefined) return EN[normalized];
  const rules: [RegExp, (...a: string[]) => string][] = [
    [
      /^(.+) no está en la lista\. Toca una letra seleccionada para retroceder o cancela\.$/,
      (_, word) =>
        `${word} is not in the list. Tap a selected letter to go back or clear the selection.`,
    ],
    [
      /^(.+) · Sigue por una letra vecina\. Puedes girar, hacer zoom y cambiar de capa\.$/,
      (_, word) =>
        `${word} · Continue with a neighbouring letter. You can rotate, zoom and change layers.`,
    ],
    [
      /^(.+) ya estaba encontrada\.$/,
      (_, word) => `${word} was already found.`,
    ],
    [/^¡(.+) encontrada!$/, (_, word) => `${word} found!`],
    [/^Página (\d+) · (.+)$/, (_, n, name) => `Page ${n} · ${name}`],
    [
      /^Jugar nivel (\d+)(: continuar)?$/,
      (_, n, resume) => `Play level ${n}${resume ? ': continue' : ''}`,
    ],
    [
      /^(Jugar|Bloqueado) nivel (\d+): (.+?)(, completado)?$/,
      (_, action, n, name, done) =>
        `${action === 'Jugar' ? 'Play' : 'Locked'} level ${n}: ${name}${done ? ', completed' : ''}`,
    ],
    [/^(\d+) sopas guardadas\.$/, (_, n) => `${n} saved puzzles.`],
    [
      /^Progreso en (.+)$/,
      (_, name) => `Progress in ${translate(language, name)}`,
    ],
    [/^Eliminar (.+)$/, (_, name) => `Delete ${name}`],
    [
      /^Une letras vecinas y encuentra las (\d+) palabras\.$/,
      (_, n) => `Connect neighbouring letters and find all ${n} words.`,
    ],
    [/^Nivel (\d+) de (\d+)$/, (_, n, total) => `Level ${n} of ${total}`],
    [/^Cara (\d+): (.+)$/, (_, n, letter) => `Face ${n}: ${letter}`],
  ];
  for (const [pattern, fn] of rules) {
    const match = normalized.match(pattern);
    if (match) return fn(...match);
  }
  return text;
}
export const translator = (language: Language) => (text: string) =>
  translate(language, text);

function worldTranslate(language: Language, text: string): string {
  const u = WORLD_UI[language]!;
  const normalized = text.replace(/\s+/g, ' ').trim();
  const id = WORLD_ALIASES[text] ?? WORLD_ALIASES[normalized];
  if (id) return u[id];
  if (text === 'LUNA\nCOMETA\nPLANETA')
    return WORLD_CONTENT[language]!.cielo.words.slice(0, 3).join('\n');
  if (text.startsWith('Con teclado:')) return u.keyboard;
  if (text.startsWith('Toca y suelta letras vecinas'))
    return [u.taphint, u.draghint, u.undohint, u.keyboard].join(' ');
  const isolate = (word: string) => `\u2068${word}\u2069`;
  let match: RegExpMatchArray | null;
  if ((match = normalized.match(/^Página (\d+) · (.+)$/)))
    return `${u.page} ${match[1]} · ${match[2]}`;
  if ((match = normalized.match(/^¡(.+) encontrada!$/)))
    return `${isolate(match[1])} · ${u.found}`;
  if ((match = normalized.match(/^(.+) ya estaba encontrada\.$/)))
    return `${isolate(match[1])} · ${u.alreadyfound}`;
  if ((match = normalized.match(/^(.+) no está en la lista\./)))
    return `${isolate(match[1])} · ${u.notlisted} ${u.undohint}`;
  if ((match = normalized.match(/^(.+) · Sigue por una letra vecina\./)))
    return `${isolate(match[1])} · ${u.neighbor}`;
  if ((match = normalized.match(/^Jugar nivel (\d+)(: continuar)?$/)))
    return `${u.play} · ${u.levels} ${match[1]}${match[2] ? ' · ' + u.continue : ''}`;
  if (
    (match = normalized.match(
      /^(Jugar|Bloqueado) nivel (\d+): (.+?)(, completado)?$/,
    ))
  )
    return `${match[1] === 'Jugar' ? u.play : u.locked} · ${u.levels} ${match[2]} · ${match[3]}${match[4] ? ' ✓' : ''}`;
  if ((match = normalized.match(/^(\d+) sopas guardadas\.$/)))
    return `${u.my} · ${match[1]}`;
  if ((match = normalized.match(/^Progreso en (.+)$/)))
    return `${u.progress} · ${worldTranslate(language, match[1])}`;
  if ((match = normalized.match(/^Eliminar (.+)$/)))
    return `${u.delete} ${match[1]}`;
  if (
    (match = normalized.match(
      /^Une letras vecinas y encuentra las (\d+) palabras\.$/,
    ))
  )
    return `${u.taphint} ${u.words}: ${match[1]}`;
  if ((match = normalized.match(/^Nivel (\d+) de (\d+)$/)))
    return `${u.levels} ${match[1]} / ${match[2]}`;
  if ((match = normalized.match(/^Cara (\d+): (.+)$/)))
    return `${u.face} ${match[1]}: ${isolate(match[2])}`;
  return text;
}
