'use client';
import { useEffect, useState } from 'react';
import { useSupport } from '@/hooks/use-support';
import {
  supportReminderDue,
  markSupportReminder,
  requestAppReview,
} from '@/lib/support';
import { ENGAGEMENT_COPY } from '@/lib/engagement-copy';
import type { Language } from '@/lib/preferences';
import GameDialog from './game-dialog';
import SupportSettings from './support-settings';

export default function SupportReminder({
  language,
  quiet,
}: {
  language: Language;
  quiet: boolean;
}) {
  const status = useSupport(),
    copy = ENGAGEMENT_COPY[language];
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (status.active) setOpen(false);
  }, [status.active]);
  useEffect(() => {
    if (!quiet) return;
    let live = true;
    const check = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        // A review request and a subscription prompt never share this occasion.
        if (await requestAppReview()) return;
        if ((await supportReminderDue()) && live) {
          await markSupportReminder();
          if (live) setOpen(true);
        }
      } catch {
        /* Offline/unavailable StoreKit leaves the game playable. */
      }
    };
    const timer = window.setTimeout(() => void check(), 4000);
    document.addEventListener('visibilitychange', check);
    return () => {
      live = false;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, [quiet]);
  return (
    <GameDialog
      open={open && quiet && !status.active}
      title={copy.reminder}
      onClose={() => setOpen(false)}
    >
      {open && <SupportSettings language={language} />}
      <button className="dialog-action" onClick={() => setOpen(false)}>
        {copy.later}
      </button>
      <button
        className="dialog-action"
        onClick={() => {
          setOpen(false);
          void markSupportReminder(true);
        }}
      >
        {copy.never}
      </button>
    </GameDialog>
  );
}
