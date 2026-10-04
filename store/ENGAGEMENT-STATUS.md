# Valoración, recordatorio y pistas por plan — 04/10/2026

Encargo explícito del usuario: valoración una sola vez tras2/3sopas; recordatorio de suscripción cada2semanas a no suscriptores; más pistas incluidas en planes superiores y anuncios voluntarios después del cupo con opción de mejora; impedir selección de texto de navegador en iPhone.

Se elige3sopas diferentes recién completadas (incluye libres/personalizadas; excluye dados/resultados ya completados). Elegibilidad y solicitud única en preferencias nativas; solicitud oficial StoreKit tras resultado estable o al regresar a Inicio. TestFlight no muestra valoración: conserva elegibilidad para App Store. Se evita recordatorio comercial en las24h siguientes a una solicitud de valoración.

Recordatorio:14días completos entre oportunidades, primero tras14días de uso y3sopas; solo Inicio estable, sin otra ventana, no suscriptor y catálogo StoreKit disponible. Ahora no y No volver a preguntar. Datos locales; ninguna notificación externa ni perfil remoto.

Los6productos existentes conservan IDs e importes propuestos. Cupos10/30/60/120/300/600 por período mensual verificado con StoreKit (compra/renovación/mejora). Un grupo con6niveles: mayor beneficio tiene nivel1. Transiciones sin anuncios para todos; agotado el cupo, la pista ofrece mejorar o un anuncio voluntario. Máximo plan ofrece el anuncio sin mejora inexistente. Solo precios reales StoreKit en interfaz.

Cuota y recibo recuperable de pista se guardan juntos en un archivo nativo atómico, con migración del diario anterior. Reconocer el recibo conserva el consumo. Restauración en la misma instalación conserva el diario; reinstalar borra datos locales y no sincroniza el consumo entre dispositivos. Renovación/mejora abre su nuevo período pagado. Una verificación fallida del derecho o diario corrupto no da pistas ni anuncios inesperados.

CSS/eventos exclusivos Capacitor iOS bloquean selección/menú contextual fuera de inputs, textarea, contenteditable y código para compartir. Navegador mantiene comportamiento propio.

QA Chrome+WebKit con dobles del puente PASS: compra cancelada/pendiente/restaurada, cuota incluidas/extras/mejora, opt-out, privacidad última, selección bloqueada/campos editables, offline/inventario/derecho fallido. No prueba transacciones reales ni escucha física. Pruebas Foundation de políticas y compilación Swift pendientes de CI. Grupo22439516 y6productos creados como borradores por API; niveles y precios ESP2.99/5/10/15/30/49.99 releídos. Localizaciones ES/EN, disponibilidad ESP únicamente; MISSING_METADATA, sin envío a App Review ni cobros publicados. IDs en supporter-plan.json. Captura de revisión y validación real Sandbox/física pendientes.

Referencia Apple: https://developer.apple.com/documentation/storekit/appstore/requestreview%28in%3A%29-1q8qs/ y https://developer.apple.com/app-store/subscriptions/.
