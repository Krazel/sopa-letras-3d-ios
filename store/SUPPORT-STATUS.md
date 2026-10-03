# Suscripciones y anuncio de fin de nivel — 04/10/2026

Estado: implementación local; pendiente de compilar/verificar en iOS y configurar los productos en App Store Connect. No incluida en TestFlight. Base: 0.16.4(1), commit 94fc0e71e19cce451a458e436e8663a6df6b6b27.

## Petición y comportamiento

El usuario pide un anuncio al terminar cada nivel y una suscripción sin anuncios desde 2,99 €/mes, con aportaciones mensuales superiores que den el mismo beneficio. Pide consultar las opciones con el cerebro central. La consulta intentada no se envió: la herramienta exige aprobación y esta sesión tiene política `never`. Los importes superiores son una propuesta local, no una decisión atribuida al cerebro.

Cada finalización nueva de un nivel de campaña solicita un intersticial al mostrar el resultado, incluida la repetición. Se elimina el intervalo anterior de 120 segundos y la espera hasta pulsar el siguiente nivel. Reabrir un resultado guardado no vuelve a solicitarlo. La ausencia de conexión, consentimiento, inventario o estado fiable de la suscripción permite continuar. La presentación real depende del SDK y del inventario; las pruebas web solo verifican solicitudes.

StoreKit verifica el derecho antes de preparar o mostrar anuncios. Los suscriptores pueden obtener las pistas de una letra sin vídeo recompensado. La expiración mientras se muestra un resultado no provoca un anuncio tardío; la expiración mientras se acepta una pista de suscriptor tampoco la sustituye por un vídeo inesperado. Se conserva el recibo duradero de pistas y su recuperación.

## Catálogo preparado

`supporter-plan.json` es un plan, no un recibo de creación. Adapta el modelo existente de Grabadora de Voz al mínimo explícito de este juego: 2,99 €, 5 €, 10 €, 15 €, 30 € y 49,99 € mensuales. Todos ofrecen los mismos beneficios; aportar más no añade ventajas. Un grupo y un nivel para las seis opciones. Los sufijos de los identificadores mantienen la convención histórica; no son precios que deba mostrar la interfaz.

La interfaz muestra exclusivamente el precio localizado que devuelve StoreKit, el período mensual, la renovación, restauración, gestión, términos y privacidad. Sin catálogo real se muestra indisponibilidad y reintento, no precios ficticios. Once idiomas existentes. No se han creado productos, activado cobros, habilitado ofertas ni cambiado el modo de anuncios de prueba.

## Comprobaciones realizadas

- 63 pruebas de lógica, typecheck y build web con Node 22 aprobados.
- Sincronización Capacitor aprobada: registro de SopaSupportPlugin confirmado.
- Chromium y WebKit: primer nivel y repetición, resultado restaurado, compra cancelada/pendiente/completada, restauración/gestión, pistas y niveles sin anuncios para suscriptores, caducidad, sin conexión, inventario no disponible y fallo de consulta de suscripción. Son dobles del puente nativo, no transacciones de Apple ni impresiones reales.
- Corrección de letras completadas: 48 casos CSS y cuatro recorridos de juego real (dos motores, claro/oscuro); selección y deselección conservan letras y progreso. Commit separado 99d9de0.
- Evidencias locales fuera del repositorio: `../sopa-letter-visibility-evidence-20261003/`.

## Pendiente antes de entregar

1. Consultar con el cerebro central los importes superiores, comprobando primero que esté inactivo. Mensaje preparado en el registro local; no enviado.
2. Compilar Swift en macOS/CI y ejecutar QA nativa iPhone/iPad. Windows y las pruebas de navegador no validan el código Swift.
3. Leer/configurar por API los seis productos, su grupo/nivel, localizaciones, precio real disponible por territorio y disponibilidad; verificar por relectura. Registrar cualquier diferencia respecto al plan.
4. Probar StoreKit Sandbox: compra, pendiente, cancelación, restauración en otra instalación, cambios entre aportaciones, renovación, expiración y revocación, también al volver del segundo plano y sin conexión. No activar período de gracia sin adaptar/verificar su tratamiento.
5. Probar anuncios de prueba reales al terminar niveles y ausencia de anuncios con derecho activo. Conservar los bloqueos anteriores de privacidad/ATT/UMP y QA comercial: no reemplazar IDs de prueba ni declarar anuncios activos.
6. Conciliar metadata y notas de revisión de suscripciones con marketing; la primera suscripción requiere el flujo de revisión correspondiente. Actualizar versión/build solo al preparar la entrega; subir por CI y comprobar procesamiento antes de afirmar nueva disponibilidad.
7. Sincronizar la misma ficha D1 `sopa-de-letras-3d` leyendo su revisión actual y conservando todos los demás campos. La lectura autorizada del 04/10 falló con `EACCES` en HTTPS, por lo que no se escribió. La última revisión conocida, 133, no debe reutilizarse a ciegas.

Bloqueos observados: API de Apple y GitHub inaccesibles por restricciones de red de la sesión; herramienta de mensajería rechazada por aprobación obligatoria con política `never`. No se ha creado PR, enviado mensaje, subido build ni sincronizado D1 para esta implementación.

Fuentes oficiales consultadas: [suscripciones Apple](https://developer.apple.com/app-store/subscriptions/), [datos de suscripciones en App Store Connect](https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/auto-renewable-subscription-information/), [intersticiales AdMob iOS](https://developers.google.com/admob/ios/interstitial).
