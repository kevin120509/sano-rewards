# 004 · Tarjeta básica con recorrido de 8 y cupones (cambio pedido por la dueña, 12-oct-2026)

Estado: BORRADOR — esperando aprobación de Kevin y respuestas de la dueña. No se programa aún.
Fuentes: docs/material-duena-2026-10-12/ (Tarjeta_de_lealtad_Sano_Bistro.pdf = reglas oficiales, 3 capturas de diseño, logo nuevo, 2 audios sin transcribir) + mensajes de WhatsApp del 12-oct.

## Qué y por qué
La dueña hizo un análisis de costos: por ahora NO habrá membresía (Premium). Queda una tarjeta básica:
7 sellos + bebida gratis en la 8.ª visita, más dos cupones extra (panadería y cold foam) que se desbloquean con monto de compra.
Además pide un diseño nuevo (café/beige, logo @sanobistro con hojas) con "Mostrar mi QR", "Tus beneficios" y "Promociones del mes" (publicidad).

## Qué cambia respecto a hoy
| Hoy | Nuevo |
|---|---|
| Tarjeta mensual; se reinicia cada mes | Recorrido sin vencimiento: los sellos NO vencen |
| Cualquier compra con código = visita | Solo compras de $65 o más efectivamente pagados |
| Meta 8 (Consentido) / 4 (Premium) | Meta única: 7 sellos + bebida en la 8.ª |
| Premio = descuento Loyverse por grupo | 3 cupones: bebida (hasta $98, 30 días), panadería (15 días), cold foam (30 días) |
| Premium 1/3/6 meses | Se apaga (se conserva el código por si regresa) |
| Cierre de mes vence tarjetas | Cierre diario solo vence cupones |

## Requisitos (EARS)
- RF1. CUANDO llegue un ticket con código de cliente y un pago ≥ $65 (total pagado − propina − envío), el sistema DEBE dar 1 sello, máximo 1 por día (hora de Progreso).
- RF2. CUANDO el cliente junte 7 sellos, el sistema DEBE emitir el cupón "Bebida gratis" con vigencia de 30 días, canjeable desde el día siguiente.
- RF3. MIENTRAS la bebida esté pendiente, el recorrido DEBE quedar completo y NO sumar sellos.
- RF4. CUANDO se canjee o venza la bebida, DEBE empezar un recorrido nuevo en cero; si la compra del canje paga además ≥ $65, esa compra DEBE dar el sello 1 del nuevo recorrido.
- RF5. CUANDO la compra que da el sello 1 del recorrido tenga ≥ $200 en productos a precio regular, el sistema DEBE emitir el cupón "Panadería" (15 días). Si no cumple, no se obtiene después en ese recorrido.
- RF6. CUANDO cualquier compra del recorrido tenga ≥ $250 en productos a precio regular, el sistema DEBE emitir el cupón "Cold foam" (30 días), una vez por recorrido.
- RF7. "Precio regular" = renglones sin descuento y que no sean paquete/promoción. Los paquetes SÍ cuentan para el sello pero NO para panadería/cold foam.
- RF8. SOLO 1 cupón canjeado por persona por día; los demás siguen disponibles hasta su vencimiento.
- RF9. Canjear panadería o cold foam NO borra sellos. Una compra solo de cortesía no da sello.
- RF10. Un ticket solo cuenta en una tarjeta; tickets duplicados se ignoran; un cupón no se usa dos veces.
- RF11. CUANDO se anule/reembolse un ticket, el sistema DEBE quitar su sello y los cupones NO usados que generó; SI alguno ya se canjeó, DEBE marcarlo "para revisión" en el panel.
- RF12. El personal autorizado DEBE poder anular una compra y ajustar sellos y cupones con motivo; queda quién, cuándo y por qué.
- RF13. La app del cliente DEBE mostrar: saludo, 8 espacios (1-7 sellos, 8 bebida), "Mostrar mi QR" (código, nombre, teléfono, correo, sellos), "Tus beneficios" con fecha exacta de vencimiento, "Un cupón por día", "Promociones del mes" y "Cómo ganar beneficios y condiciones".
- RF14. La dueña DEBE poder dar de alta/editar/ocultar las promociones del mes (imagen, título, días) desde Administración.
- RF15. El Mostrador DEBE mostrar los cupones disponibles del cliente y permitir canjear uno específico (respetando 1 por día).
- RF16. Excluir pedidos de plataformas de reparto, catering y eventos (según el tipo de pedido de Loyverse).

## Casos límite
- Compra de $64.99 → sin sello. Ticket con descuento que baja de $65 → sin sello.
- Sello 1 con $199 en regular + $50 en paquete → sin panadería (y ya no la obtiene en ese recorrido).
- Misma compra genera sello 1, panadería y cold foam → los 3.
- Panadería/cold foam usados en la misma compra que los genera (si ya incluye bebida).
- Bebida intentada el mismo día que se emitió → rechazar (desde el día siguiente).
- Dos cupones el mismo día → solo el primero; el segundo se rechaza y sigue vigente.
- Reembolso de un ticket cuyo cupón ya se canjeó → alerta para revisión, no se borra solo.
- Clientes actuales (Kevin C-8571 Premium, C-4738): migrar sus visitas del mes como sellos del recorrido.

## Fuera de alcance (por ahora)
- Membresía Premium (se oculta, no se borra).
- Contenido de las promociones del mes (la dueña lo está preparando; se deja el espacio listo).

## Respuestas (Kevin, 12-oct)
1. Grupos/convenios: por ahora TODOS con las mismas reglas; lo especial de Estudiantes/OZON/GYM se define después. Se conservan grupos y QR.
2. Precio regular / paquetes: PENDIENTE (propuesta abajo).
3. Tipo de pedido: Loyverse lo manda en cada ticket (dining_option: "Comer dentro", "Para llevar", envío…). La dueña elige en su panel qué tipos SÍ cuentan.
4. Identificación: por CÓDIGO escrito en la nota del ticket, como hoy. "Mostrar mi QR" pasa a "Mostrar mi código" (código grande + datos del cliente).
5. Cupones: se crean como descuentos en Loyverse; nuestro sistema los lee y la dueña asigna en su panel cuál descuento es Bebida / Panadería / Cold foam. Cuando el ticket trae ese descuento + código, el sistema marca el cupón como canjeado.

## Propuesta para la duda 2 (precio regular)
Un producto NO cuenta como precio regular si: (a) en el ticket tiene descuento, o (b) pertenece a la categoría de Loyverse que la dueña marque como "Paquetes/Promociones" (se elige en el panel). Todo lo demás sí cuenta para los $200 / $250.
