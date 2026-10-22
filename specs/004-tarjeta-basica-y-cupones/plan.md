# 004 · Plan (cómo)

## Base de datos (migración 015, Supabase)
- `loyalty_cards` pasa a ser el **recorrido**: meta 7, sin mes. Estados: open → reward_ready (bebida pendiente, no suma sellos) → redeemed / expired. El recorrido nuevo se abre al canjear o vencer la bebida (ya no al completar). Se ignora `period_month`.
- Tabla nueva `coupons`: cliente, recorrido, tipo (drink | bakery | coldfoam), emitido, válido desde, vence, estado (available | redeemed | expired | voided | review), ticket que lo generó, ticket/persona que lo canjeó. Único por (recorrido, tipo).
- Tabla `program_settings` (1 fila): mínimos 65/200/250, vigencias 30/15/30 días, meta 7, descuentos de Loyverse para cada cupón, categorías de paquetes/promos, tipos de pedido que cuentan.
- Tablas `loyverse_categories` y `loyverse_items` (producto → categoría), sincronizadas cada 5 min junto con los descuentos.
- Tabla `promotions` (título, días/texto, imagen, orden, activa) + bucket de imágenes `promos` (lectura pública, escritura solo dueña).
- Premium: los clientes regresan a la categoría normal; la pantalla de Premium se oculta (no se borra el código).
- Migración de datos: tarjetas abiertas → recorrido con meta 7 conservando sus sellos.

## Procesar cada ticket (process_receipt v2)
1. Cancelado/devolución → quita su sello, anula cupones NO usados que generó; si ya se usaron → estado `review` (alerta). Si canjeó un cupón → vuelve a disponible.
2. Sin código → ignorado. Tipo de pedido que no cuenta (reparto, catering) → ignorado.
3. Pagado = total − propina. Precio regular = renglones sin descuento y fuera de la categoría de paquetes.
4. Canje primero: si el ticket trae el descuento de un cupón disponible y vigente (bebida: desde el día siguiente) y no ha canjeado otro hoy → canjeado. Si fue la bebida → abre recorrido nuevo.
5. Sello: pagado ≥ $65, recorrido abierto, 1 por día. Al llegar a 7 → cupón Bebida (30 días, desde mañana).
6. Panadería: si este ticket dio el sello 1 del recorrido y regular ≥ $200 → cupón (15 días).
7. Cold foam: regular ≥ $250 y el recorrido abierto aún no lo tiene → cupón (30 días).
8. Todo idempotente (un ticket = una vez) y con motivo guardado en el ticket.

## Tarea diaria (00:10 Progreso)
Vence cupones; si vence la bebida → recorrido nuevo en cero. Guarda estadísticas.

## Personal
- Mostrador: ve recorrido x/7, bebida pendiente, cupones con vencimiento y si ya canjeó cupón hoy; botón "Canjear" por cupón (1 por día); +1 sello manual (si el recorrido no está completo).
- Administración: en la ficha del cliente, anular una compra y ajustar sellos/cupones con motivo; lista "Para revisión".
- Nueva pestaña **Programa**: asignar los 3 descuentos de Loyverse, categoría de paquetes, tipos de pedido que cuentan, y **Promociones del mes** (alta, foto, orden, ocultar).
- Resumen: sellos hoy/mes, bebidas ganadas/canjeadas, panadería y cold foam emitidos/canjeados, pendientes de revisión, clientes nuevos.

## App del cliente (diseño nuevo según capturas)
- Fondo beige, tarjeta café, logo @sanobistro con hojas (del PDF), tazas como sellos, el 8 con "GRATIS".
- "Mostrar mi código": código grande, nombre, teléfono, correo y sellos (sin QR).
- "Tus beneficios": cupones disponibles con foto, fecha de vencimiento y "Disponible / desde mañana". "Un cupón por día".
- "Promociones del mes" (lo que suba la dueña) y página "Cómo ganar beneficios y condiciones" con las reglas del PDF.
- Se mantienen: historial, cuenta, avisos de sello nuevo y de premio.
- Mismo diseño para todos los grupos por ahora (los grupos solo marcan de dónde vino el cliente).

## Decisiones propias (para revisar)
- Cold foam se puede ganar en cualquier compra del recorrido aunque ese día ya tuviera sello; NO mientras la bebida está pendiente (el recorrido ya está completo).
- Un sello manual del Mostrador no puede dar panadería ni cold foam (no hay montos).
- Si un ticket trae dos descuentos de cupón, solo se canjea uno (el primero) y queda nota.
