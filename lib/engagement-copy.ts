import type { Language } from './preferences';
const keys = [
  'intro',
  'included',
  'remaining',
  'exhausted',
  'upgrade',
  'watch',
  'reminder',
  'later',
  'never',
  'transitions',
] as const;
type Copy = Record<(typeof keys)[number], string>;
function row(text: string): Copy {
  const parts = text.split('|');
  if (parts.length !== keys.length)
    throw Error('Incomplete engagement copy');
  return Object.fromEntries(keys.map((key, i) => [key, parts[i]])) as Copy;
}
export const ENGAGEMENT_COPY: Record<Language, Copy> = {
  es: row(
    'Todos los planes quitan los anuncios entre niveles. Cada plan incluye un cupo de pistas por período mensual; las pistas extra se obtienen con anuncios solo si tú lo eliges.|{n} pistas por período mensual|Te quedan {n} pistas incluidas.|Has agotado las pistas incluidas. Puedes mejorar tu plan o ver un anuncio para conseguir esta pista.|Mejorar suscripción|Ver anuncio para esta pista|¿Quieres jugar sin anuncios entre niveles?|Ahora no|No volver a preguntar|Con suscripción no hay anuncios entre niveles. Las pistas extra fuera del cupo usan anuncios voluntarios.',
  ),
  en: row(
    'Every plan removes ads between levels. Each includes a monthly hint allowance; extra hints use ads only if you choose.|{n} hints per monthly period|You have {n} included hints left.|Your included hints are used up. Upgrade your plan or watch an ad for this hint.|Upgrade subscription|Watch an ad for this hint|Play without ads between levels?|Not now|Don’t ask again|Subscribers see no ads between levels. Extra hints beyond the allowance use optional ads.',
  ),
  ca: row(
    'Tots els plans treuen els anuncis entre nivells. Cada pla inclou un cup de pistes per període mensual; les pistes extra fan servir anuncis només si ho tries.|{n} pistes per període mensual|Et queden {n} pistes incloses.|Has esgotat les pistes incloses. Pots millorar el pla o veure un anunci per obtenir aquesta pista.|Millora la subscripció|Veure un anunci per aquesta pista|Vols jugar sense anuncis entre nivells?|Ara no|No ho tornis a preguntar|Amb subscripció no hi ha anuncis entre nivells. Les pistes fora del cup fan servir anuncis voluntaris.',
  ),
  fr: row(
    'Tous les forfaits retirent les publicités entre les niveaux. Chacun inclut un quota mensuel d’indices; les indices supplémentaires utilisent des publicités seulement si vous le choisissez.|{n} indices par période mensuelle|Il vous reste {n} indices inclus.|Vous avez utilisé les indices inclus. Améliorez votre abonnement ou regardez une publicité pour cet indice.|Améliorer l’abonnement|Voir une publicité pour cet indice|Jouer sans publicité entre les niveaux ?|Pas maintenant|Ne plus demander|Aucune publicité entre les niveaux avec un abonnement. Les indices hors quota utilisent des publicités facultatives.',
  ),
  de: row(
    'Alle Abos entfernen Werbung zwischen Levels. Jedes enthält ein monatliches Hinweiskontingent. Zusätzliche Hinweise gibt es nur auf Wunsch mit Werbung.|{n} Hinweise pro Monatszeitraum|Noch {n} enthaltene Hinweise.|Deine Hinweise sind aufgebraucht. Verbessere dein Abo oder sieh für diesen Hinweis Werbung an.|Abo verbessern|Werbung für diesen Hinweis ansehen|Ohne Werbung zwischen Levels spielen?|Nicht jetzt|Nicht erneut fragen|Mit Abo keine Werbung zwischen Levels. Zusätzliche Hinweise nutzen freiwillige Werbung.',
  ),
  it: row(
    'Tutti i piani eliminano gli annunci tra i livelli. Ogni piano include una quota mensile di suggerimenti; quelli extra usano annunci solo se lo scegli.|{n} suggerimenti per periodo mensile|Restano {n} suggerimenti inclusi.|Hai esaurito i suggerimenti inclusi. Migliora il piano o guarda un annuncio per questo suggerimento.|Migliora abbonamento|Guarda un annuncio per questo suggerimento|Vuoi giocare senza annunci tra i livelli?|Non ora|Non chiedere più|Gli abbonati non vedono annunci tra i livelli. I suggerimenti extra usano annunci facoltativi.',
  ),
  pt: row(
    'Todos os planos removem anúncios entre níveis. Cada plano inclui uma quota mensal de pistas; as pistas extra usam anúncios apenas se escolheres.|{n} pistas por período mensal|Restam {n} pistas incluídas.|Esgotaste as pistas incluídas. Melhora o plano ou vê um anúncio para esta pista.|Melhorar subscrição|Ver anúncio para esta pista|Queres jogar sem anúncios entre níveis?|Agora não|Não voltar a perguntar|Com subscrição não há anúncios entre níveis. Pistas fora da quota usam anúncios voluntários.',
  ),
  tr: row(
    'Tüm planlar bölümler arasındaki reklamları kaldırır. Her plan aylık ipucu kotası içerir; ek ipuçları yalnızca seçersen reklam kullanır.|Aylık dönem başına {n} ipucu|Dahil olan {n} ipucun kaldı.|Dahil olan ipuçların tükendi. Planını yükselt veya bu ipucu için reklam izle.|Aboneliği yükselt|Bu ipucu için reklam izle|Bölümler arasında reklamsız oynamak ister misin?|Şimdi değil|Bir daha sorma|Aboneler bölümler arasında reklam görmez. Kota dışındaki ipuçları isteğe bağlı reklam kullanır.',
  ),
  ar: row(
    'تزيل جميع الخطط الإعلانات بين المراحل. تشمل كل خطة حصة شهرية من التلميحات؛ تستخدم التلميحات الإضافية إعلانات فقط إذا اخترت ذلك.|{n} تلميحات لكل فترة شهرية|تبقى لديك {n} تلميحات مشمولة.|نفدت التلميحات المشمولة. يمكنك ترقية خطتك أو مشاهدة إعلان لهذا التلميح.|ترقية الاشتراك|مشاهدة إعلان لهذا التلميح|هل تريد اللعب دون إعلانات بين المراحل؟|ليس الآن|لا تسأل مجددًا|لا تظهر إعلانات بين المراحل للمشتركين. تستخدم التلميحات خارج الحصة إعلانات اختيارية.',
  ),
  ko: row(
    '모든 요금제는 레벨 사이 광고를 제거합니다. 각 요금제에는 월별 힌트가 포함되며 추가 힌트 광고는 직접 선택한 경우에만 표시됩니다.|월별 기간당 힌트 {n}개|포함된 힌트가 {n}개 남았습니다.|포함된 힌트를 모두 사용했습니다. 요금제를 올리거나 이 힌트를 위해 광고를 시청하세요.|구독 업그레이드|이 힌트를 위해 광고 시청|레벨 사이 광고 없이 플레이할까요?|나중에|다시 묻지 않기|구독자는 레벨 사이 광고를 보지 않습니다. 한도를 넘는 힌트는 선택한 광고를 사용합니다.',
  ),
  ja: row(
    'すべてのプランでレベル間の広告がなくなります。各プランには月ごとのヒント枠があり、追加のヒントでは自分で選んだ場合だけ広告を見ます。|月ごとの期間に{n}個のヒント|含まれるヒントは残り{n}個です。|含まれるヒントを使い切りました。プランをアップグレードするか、このヒントのために広告を見ることができます。|登録をアップグレード|このヒントのために広告を見る|レベル間の広告なしで遊びますか？|今はしない|今後は尋ねない|登録中はレベル間の広告がありません。枠を超えるヒントでは任意の広告を使います。',
  ),
};
