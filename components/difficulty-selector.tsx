import { useState } from 'react';
import { Check, ChevronDown, SlidersHorizontal, X, Layers } from 'lucide-react';
import GameDialog from './game-dialog';
import PuzzleIcon from './puzzle-icon';
import { DIFFICULTIES, levelsFor } from '@/lib/player';
import { translator } from '@/lib/i18n';
import type { Language } from '@/lib/preferences';

export default function DifficultySelector({
  value,
  onChange,
  language,
}: {
  value: string;
  onChange: (value: string) => void;
  language: Language;
}) {
  const [open, setOpen] = useState(false);
  const t = translator(language);
  const puzzles = levelsFor(language);
  const choose = (difficulty: string) => {
    onChange(difficulty);
    setOpen(false);
  };
  return (
    <>
      <button
        className="difficulty-trigger"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal aria-hidden="true" />
        <span>
          <small>{t('Dificultad')}</small>
          <strong>
            {t(value === 'all' ? 'Todas las dificultades' : value)}
          </strong>
        </span>
        <ChevronDown aria-hidden="true" />
      </button>
      <GameDialog
        open={open}
        title={t('Dificultad')}
        onClose={() => setOpen(false)}
      >
        <button
          className="dialog-close"
          aria-label={t('Cerrar')}
          onClick={() => setOpen(false)}
        >
          <X />
        </button>
        <h2>{t('Dificultad')}</h2>
        <fieldset className="difficulty-options" aria-label={t('Dificultad')}>
          <button
            className="difficulty-option difficulty-all"
            aria-pressed={value === 'all'}
            onClick={() => choose('all')}
          >
            <Layers aria-hidden="true" />
            <span>
              <strong>{t('Todas las dificultades')}</strong>
              <small>3 × 3 × 3 → 10 × 10 × 10</small>
            </span>
            {value === 'all' && (
              <Check className="difficulty-check" aria-hidden="true" />
            )}
          </button>
          {DIFFICULTIES.map((difficulty, index) => {
            const matching = puzzles.filter((p) => p.difficulty === difficulty);
            const sizes = [...new Set(matching.map((p) => p.size))];
            return (
              <button
                key={difficulty}
                className={`difficulty-option difficulty-${index}`}
                aria-pressed={value === difficulty}
                onClick={() => choose(difficulty)}
              >
                <PuzzleIcon id={matching[0].id} />
                {value === difficulty && (
                  <Check className="difficulty-check" aria-hidden="true" />
                )}
                <strong>{t(difficulty)}</strong>
                <small>
                  {sizes
                    .map((size) => `${size} × ${size} × ${size}`)
                    .join(' / ')}
                </small>
                <span className="difficulty-bars" aria-hidden="true">
                  {DIFFICULTIES.map((_, bar) => (
                    <i
                      key={bar}
                      data-active={bar <= index}
                      style={{ height: 6 + bar * 4 }}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </fieldset>
      </GameDialog>
    </>
  );
}
