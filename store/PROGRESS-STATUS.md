# Progreso del catálogo — 04/10/2026

Petición del usuario: que la cantidad de Progreso incluya todas las sopas incorporadas en Juego libre, en lugar de limitarse a los 24 niveles, y que el título lo refleje.

La tarjeta se llama **Sopas completadas**. Su total se obtiene del catálogo real del idioma, actualmente 60, y su numerador reúne las finalizaciones guardadas de Niveles y Juego libre. Una sopa completada en ambos modos cuenta una sola vez. Solo cuentan IDs presentes en el catálogo; sopas personalizadas y repeticiones no aumentan el total de la colección incluida. Se reutilizan los guardados existentes sin migrarlos. Se traduce el nuevo título a los once idiomas actuales.

La progresión de campaña, sus capítulos y desbloqueos siguen usando sus 24 niveles. El nuevo contador global no desbloquea niveles al terminar una sopa en Juego libre.

Verificación: 63 pruebas aprobadas, typecheck y build web con Node22 aprobados, lint de los dos archivos limpio. Chromium y WebKit muestran 0/60 sin progreso, 2/60 al combinar una sopa de campaña y otra exclusiva de libre (con duplicado entre modos), y 60/60 con todo el catálogo completo; los tres casos conservan el valor tras recarga. Nuevo título comprobado en los once idiomas; captura móvil de Chromium revisada visualmente.

Entrega local en la rama `fix/found-letter-visibility`, junto a las correcciones y monetización anteriores; no incluida todavía en TestFlight. Evidencias locales de la comprobación del contador: `../sopa-letter-visibility-evidence-20261003/progress/`. La ficha D1 `sopa-de-letras-3d` debe conciliar esta ampliación cuando se restablezca el acceso autorizado que ha fallado con EACCES. Conservar el resto del seguimiento y releer la revisión vigente antes de guardar; no declarar sincronización ni nueva build por esta modificación.
