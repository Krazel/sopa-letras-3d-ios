import type { Language } from './preferences';
const keys = [
  'title',
  'intro',
  'active',
  'loading',
  'unavailable',
  'retry',
  'subscribe',
  'month',
  'restore',
  'manage',
  'terms',
  'privacy',
  'renewal',
  'pending',
  'cancelled',
  'error',
  'empty',
  'hint',
  'hintOffer',
  'transitions',
] as const;
type Copy = Record<(typeof keys)[number], string>;
function row(text: string): Copy {
  const parts = text.split('|');
  if (parts.length !== keys.length) throw Error('Incomplete support copy');
  return Object.fromEntries(keys.map((k, i) => [k, parts[i]])) as Copy;
}
export const SUPPORT_COPY: Record<Language, Copy> = {
  es: row(
    'Jugar sin anuncios|Elige cuánto quieres apoyar el desarrollo. Todas las opciones quitan los anuncios e incluyen pistas de una letra sin ver publicidad.|Suscripción activa. Gracias por apoyar el juego.|Cargando opciones…|Las suscripciones no están disponibles ahora.|Reintentar|Suscribirme|mes|Restaurar compras|Gestionar suscripción|Condiciones de uso|Privacidad|Suscripción mensual con renovación automática. Puedes cancelarla en tu cuenta de Apple. El acceso continúa hasta el final del período pagado.|Compra pendiente de aprobación.|Compra cancelada.|No se ha podido completar la operación. Inténtalo de nuevo.|No se ha encontrado una suscripción activa.|Revelar 1 letra|Tu suscripción incluye la siguiente letra de esta palabra:|Al completar cada nivel se intentará mostrar un anuncio disponible. Con una suscripción activa no aparecen anuncios.',
  ),
  en: row(
    'Play without ads|Choose how much to support development. Every option removes ads and includes one-letter hints without watching ads.|Subscription active. Thank you for supporting the game.|Loading options…|Subscriptions are unavailable right now.|Try again|Subscribe|month|Restore purchases|Manage subscription|Terms of use|Privacy|Monthly subscription, renews automatically. Cancel in your Apple account. Access continues until the end of the paid period.|Purchase pending approval.|Purchase cancelled.|The operation could not be completed. Try again.|No active subscription was found.|Reveal 1 letter|Your subscription includes the next letter of this word:|An available ad will be requested after each completed level. Active subscribers see no ads.',
  ),
  ca: row(
    'Juga sense anuncis|Tria quant vols aportar al desenvolupament. Totes les opcions treuen els anuncis i inclouen pistes d’una lletra sense veure publicitat.|Subscripció activa. Gràcies per donar suport al joc.|Carregant opcions…|Les subscripcions no estan disponibles ara.|Torna-ho a provar|Subscriu-me|mes|Restaura les compres|Gestiona la subscripció|Condicions d’ús|Privacitat|Subscripció mensual amb renovació automàtica. Pots cancel·lar-la al compte d’Apple. L’accés continua fins al final del període pagat.|Compra pendent d’aprovació.|Compra cancel·lada.|No s’ha pogut completar l’operació. Torna-ho a provar.|No s’ha trobat cap subscripció activa.|Revela 1 lletra|La teva subscripció inclou la següent lletra d’aquesta paraula:|En completar cada nivell s’intentarà mostrar un anunci disponible. Amb una subscripció activa no apareixen anuncis.',
  ),
  fr: row(
    'Jouer sans publicité|Choisissez votre soutien au développement. Toutes les options suppriment les publicités et incluent des indices d’une lettre sans publicité.|Abonnement actif. Merci de soutenir le jeu.|Chargement des offres…|Les abonnements sont indisponibles pour le moment.|Réessayer|S’abonner|mois|Restaurer les achats|Gérer l’abonnement|Conditions d’utilisation|Confidentialité|Abonnement mensuel à renouvellement automatique. Annulez depuis votre compte Apple. L’accès reste actif jusqu’à la fin de la période payée.|Achat en attente d’approbation.|Achat annulé.|L’opération a échoué. Réessayez.|Aucun abonnement actif trouvé.|Révéler 1 lettre|Votre abonnement inclut la prochaine lettre de ce mot :|Une publicité disponible sera demandée après chaque niveau terminé. Les abonnés actifs ne voient aucune publicité.',
  ),
  de: row(
    'Ohne Werbung spielen|Wähle deinen Beitrag zur Entwicklung. Alle Optionen entfernen Werbung und enthalten Buchstabenhinweise ohne Werbevideos.|Abo aktiv. Danke für deine Unterstützung.|Optionen werden geladen…|Abonnements sind derzeit nicht verfügbar.|Erneut versuchen|Abonnieren|Monat|Käufe wiederherstellen|Abo verwalten|Nutzungsbedingungen|Datenschutz|Monatliches Abo mit automatischer Verlängerung. In deinem Apple-Konto kündbar. Der Zugang bleibt bis zum Ende des bezahlten Zeitraums bestehen.|Kauf wartet auf Genehmigung.|Kauf abgebrochen.|Vorgang fehlgeschlagen. Bitte erneut versuchen.|Kein aktives Abo gefunden.|1 Buchstaben aufdecken|Dein Abo enthält den nächsten Buchstaben dieses Wortes:|Nach jedem abgeschlossenen Level wird verfügbare Werbung angefordert. Mit aktivem Abo erscheint keine Werbung.',
  ),
  it: row(
    'Gioca senza pubblicità|Scegli quanto sostenere lo sviluppo. Tutte le opzioni rimuovono la pubblicità e includono suggerimenti di una lettera senza annunci.|Abbonamento attivo. Grazie per il sostegno.|Caricamento opzioni…|Gli abbonamenti non sono disponibili al momento.|Riprova|Abbonati|mese|Ripristina acquisti|Gestisci abbonamento|Termini di utilizzo|Privacy|Abbonamento mensile con rinnovo automatico. Puoi annullarlo nel tuo account Apple. L’accesso continua fino alla fine del periodo pagato.|Acquisto in attesa di approvazione.|Acquisto annullato.|Operazione non riuscita. Riprova.|Nessun abbonamento attivo trovato.|Rivela 1 lettera|Il tuo abbonamento include la prossima lettera di questa parola:|Dopo ogni livello completato verrà richiesto un annuncio disponibile. Gli abbonati attivi non vedono pubblicità.',
  ),
  pt: row(
    'Jogar sem anúncios|Escolhe quanto queres apoiar o desenvolvimento. Todas as opções removem os anúncios e incluem pistas de uma letra sem publicidade.|Subscrição ativa. Obrigado pelo apoio.|A carregar opções…|As subscrições não estão disponíveis agora.|Tentar novamente|Subscrever|mês|Restaurar compras|Gerir subscrição|Termos de utilização|Privacidade|Subscrição mensal com renovação automática. Podes cancelar na tua conta Apple. O acesso mantém-se até ao fim do período pago.|Compra pendente de aprovação.|Compra cancelada.|Não foi possível concluir a operação. Tenta novamente.|Não foi encontrada uma subscrição ativa.|Revelar 1 letra|A tua subscrição inclui a próxima letra desta palavra:|Após cada nível concluído será solicitado um anúncio disponível. Com uma subscrição ativa não há anúncios.',
  ),
  tr: row(
    'Reklamsız oyna|Geliştirmeye ne kadar destek vereceğini seç. Tüm seçenekler reklamları kaldırır ve reklam izlemeden bir harflik ipuçları sunar.|Abonelik etkin. Desteğin için teşekkürler.|Seçenekler yükleniyor…|Abonelikler şu anda kullanılamıyor.|Tekrar dene|Abone ol|ay|Satın alımları geri yükle|Aboneliği yönet|Kullanım koşulları|Gizlilik|Aylık abonelik otomatik yenilenir. Apple hesabından iptal edebilirsin. Erişim, ödenen dönemin sonuna kadar sürer.|Satın alma onay bekliyor.|Satın alma iptal edildi.|İşlem tamamlanamadı. Tekrar dene.|Etkin abonelik bulunamadı.|1 harf göster|Aboneliğin bu kelimenin sonraki harfini içerir:|Tamamlanan her seviyeden sonra mevcut bir reklam istenir. Etkin aboneler reklam görmez.',
  ),
  ja: row(
    '広告なしで遊ぶ|開発を支援する金額を選べます。すべてのプランで広告がなくなり、広告を見ずに1文字ずつヒントを受け取れます。|登録は有効です。ご支援ありがとうございます。|プランを読み込み中…|現在サブスクリプションを利用できません。|再試行|登録する|月|購入を復元|登録を管理|利用規約|プライバシー|毎月自動更新されます。Appleアカウントから解約できます。お支払い済みの期間の終了まで利用できます。|購入の承認待ちです。|購入をキャンセルしました。|処理を完了できませんでした。もう一度お試しください。|有効な登録が見つかりませんでした。|1文字を表示|登録には、この単語の次の文字のヒントが含まれます：|各レベルのクリア後に、利用可能な広告の表示を試みます。有効な登録がある場合は広告を表示しません。',
  ),
  ko: row(
    '광고 없이 플레이|개발을 후원할 금액을 선택하세요. 모든 옵션은 광고를 제거하며 광고 시청 없이 한 글자 힌트를 제공합니다.|구독 중입니다. 후원해 주셔서 감사합니다.|옵션 불러오는 중…|지금은 구독을 이용할 수 없습니다.|다시 시도|구독하기|월|구매 복원|구독 관리|이용 약관|개인정보 보호|매월 자동 갱신되는 구독입니다. Apple 계정에서 취소할 수 있으며 결제한 기간이 끝날 때까지 이용할 수 있습니다.|구매 승인 대기 중입니다.|구매가 취소되었습니다.|작업을 완료하지 못했습니다. 다시 시도하세요.|활성 구독을 찾지 못했습니다.|한 글자 공개|구독으로 이 단어의 다음 글자를 확인할 수 있습니다:|레벨을 완료할 때마다 이용 가능한 광고 표시를 요청합니다. 활성 구독자는 광고가 표시되지 않습니다.',
  ),
  ar: row(
    'العب بلا إعلانات|اختر مبلغ دعم التطوير. تزيل جميع الخيارات الإعلانات وتشمل تلميحات بحرف واحد دون مشاهدة إعلان.|الاشتراك نشط. شكرًا لدعم اللعبة.|جارٍ تحميل الخيارات…|الاشتراكات غير متاحة الآن.|حاول مجددًا|اشترك|شهر|استعادة المشتريات|إدارة الاشتراك|شروط الاستخدام|الخصوصية|اشتراك شهري يتجدد تلقائيًا. يمكنك إلغاؤه من حساب Apple. يستمر الوصول حتى نهاية الفترة المدفوعة.|عملية الشراء بانتظار الموافقة.|أُلغي الشراء.|تعذر إكمال العملية. حاول مجددًا.|لم يُعثر على اشتراك نشط.|كشف حرف واحد|يشمل اشتراكك الحرف التالي من هذه الكلمة:|بعد إكمال كل مستوى تُطلب محاولة عرض إعلان متاح. لا تظهر إعلانات مع اشتراك نشط.',
  ),
};
