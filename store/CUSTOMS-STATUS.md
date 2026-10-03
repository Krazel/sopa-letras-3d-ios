# Sopas personalizadas sin límite fijo — candidata 0.17(1)

El usuario solicitó incorporar a este TestFlight la eliminación del límite de
20 creaciones, también confirmada al revisar el encargo de marketing del 04/10.
Se integró el patch preparado en la copia aislada de marketing (ef91e19), sin
copiar archivos completos de su base anterior ni cambiar textos de tienda.

Creación e importación ya no rechazan la sopa 21. La lectura del guardado no
recorta creaciones a 20 ni progresos a 100, y no descarta todos los datos al
superar 256000 caracteres. Se conservan validación, deduplicación y errores de
capacidad real del almacenamiento. No hay un máximo fijo de cantidad.

Verificación sobre esta candidata integrada: 64 pruebas de lógica, TypeScript,
build web y diff-check aprobados. Prueba UI real en español e inglés: parte de
20 sopas, crea la 21, importa la 22 y recarga conservando las 22 y todas las
anteriores. Prueba de 2500 creaciones y progresos supera el tamaño antiguo y
comprueba su restauración completa.

Recibos UI en ../sopa-letter-visibility-evidence-20261003/ desde la raíz
del checkout: unlimited-ui-verified.json y verify-unlimited-ui.mjs.
La QA nativa de 207c6e8 no contiene este cambio y no se puede atribuir a él.
Falta repetir CI iPhone/iPad sobre el nuevo commit antes de firmar/subir.

La autorización para fusionar la PR 2 ya fue concedida. La sesión volvió al
perfil never: el conector de fusión requiere aprobación y la red de terminal
devuelve EACCES. No hubo fusión ni entrega de esta corrección en TestFlight.
