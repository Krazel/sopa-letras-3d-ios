# Ajustes por encima del cuaderno — 04/10/2026

El usuario pide subir el botón de ajustes de la portada, especialmente en iPhone, para que no toque ni cubra el cuaderno. La regla de retrato móvil pasa de safe-area +16px a safe-area, con botón de 44×44 y engranaje de 26px. Conserva el nombre accesible y abre la misma pantalla de ajustes.

En pantallas cortas, el recorte central del póster acercaba las anillas al borde superior. Se desplaza solo lo necesario la composición para reservar ocho píxeles entre las anillas y el botón; el cálculo usa las proporciones del asset actual (852×1847, anillas a 13,2% de altura). El lema mantiene su posición visible. Si cambia el asset, revisar esta geometría. Fuera del formato móvil vertical se conserva la composición anterior.

Build web Node22 aprobada. Chromium y WebKit aprobaron cinco tamaños de iPhone (375×667, 390×844, 393×852, 402×874, 440×956) y control iPad 820×1180, con áreas seguras superiores simuladas de 20 a 62px. En los cinco iPhone se verificó separación mínima de 8px sobre las anillas, botón de 44×44 fuera del área segura y apertura de Ajustes. Capturas SE y 17 Pro revisadas visualmente. Evidencias: `../sopa-letter-visibility-evidence-20261003/settings/`. La emulación no sustituye QA nativa de iPhone. No se ha creado/subido una build nueva; sigue pendiente junto a la entrega anterior.

Biblioteca: conciliar este cambio y el contador X/60 en la ficha existente `sopa-de-letras-3d` cuando se restablezca el acceso autorizado bloqueado por EACCES. Releer revisión vigente y conservar seguimiento, icono pendiente y demás bloqueos. No afirmar que se ha guardado en D1 ni que está en TestFlight.
