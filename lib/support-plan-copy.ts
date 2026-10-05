import type { Language } from './preferences';

export const SUPPORT_PLAN_COPY: Record<
  Language,
  { title: string; monthly: string; noAds: string }
> = {
  es: {
    title: 'Suscribirse para quitar anuncios',
    monthly: 'Plan mensual · {n} pistas incluidas',
    noAds: 'Sin anuncios entre niveles',
  },
  en: {
    title: 'Subscribe',
    monthly: 'Monthly plan · {n} hints included',
    noAds: 'No ads between levels',
  },
  ca: {
    title: 'Subscriu-te',
    monthly: 'Pla mensual · {n} pistes incloses',
    noAds: 'Sense anuncis entre nivells',
  },
  fr: {
    title: 'S’abonner',
    monthly: 'Forfait mensuel · {n} indices inclus',
    noAds: 'Sans publicité entre les niveaux',
  },
  de: {
    title: 'Abonnieren',
    monthly: 'Monatsabo · {n} Hinweise inklusive',
    noAds: 'Keine Werbung zwischen Levels',
  },
  it: {
    title: 'Abbonati',
    monthly: 'Piano mensile · {n} suggerimenti inclusi',
    noAds: 'Niente annunci tra i livelli',
  },
  pt: {
    title: 'Subscrever',
    monthly: 'Plano mensal · {n} pistas incluídas',
    noAds: 'Sem anúncios entre níveis',
  },
  tr: {
    title: 'Abone ol',
    monthly: 'Aylık plan · {n} ipucu dahil',
    noAds: 'Bölümler arasında reklam yok',
  },
  ar: {
    title: 'اشترك',
    monthly: 'خطة شهرية · {n} تلميحات مشمولة',
    noAds: 'دون إعلانات بين المراحل',
  },
  ko: {
    title: '구독하기',
    monthly: '월간 요금제 · 힌트 {n}개 포함',
    noAds: '레벨 사이 광고 없음',
  },
  ja: {
    title: '登録する',
    monthly: '月額プラン · ヒント{n}個付き',
    noAds: 'レベル間の広告なし',
  },
};
