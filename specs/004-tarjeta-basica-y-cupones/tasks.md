# 004 · Tareas (cada una 20-30 min; "Hecho cuando")

## Backend
- [x] T1 Migración 015a: coupons, program_settings, promotions, loyverse_categories/items, columnas de recorrido. Hecho cuando: tablas con RLS y datos iniciales (65/200/250, 30/15/30, meta 7).
- [x] T2 Migración de datos: tarjetas abiertas → meta 7; Premium → normal. Hecho cuando: Kevin y Víctor conservan sus sellos.
- [x] T3 Triggers del recorrido: al 7.º sello cupón Bebida, sin tarjeta nueva; anular sello revierte. Hecho cuando: pruebas SQL pasan.
- [x] T4 process_receipt v2 (montos, tipo de pedido, canje, sello, panadería, cold foam, cancelación/devolución). Hecho cuando: 12 casos de la spec pasan en una transacción revertida.
- [x] T5 Edge function: sincronizar categorías y productos. Hecho cuando: tablas llenas desde la cuenta Codia.
- [x] T6 Tarea diaria v2 (vencer cupones / recorrido nuevo). Hecho cuando: cupón vencido de prueba cambia de estado.
- [x] T7 RPC cliente my_card v2 (recorrido, cupones, promociones). Hecho cuando: regresa el JSON acordado.
- [x] T8 RPC personal: detalle con cupones, canjear cupón (1/día), +1 sello v2. Hecho cuando: permisos y reglas probados.
- [x] T9 RPC dueña: anular compra, ajustar cupón, lista de revisión, configuración, promociones (con imagen), resumen v2.

## Frontend
- [x] T10 Logo SVG y tema nuevo (beige/café). Hecho cuando: se ve igual a la captura.
- [x] T11 Tarjeta del cliente: 8 tazas, bebida, "Mostrar mi código".
- [x] T12 Tus beneficios + "Un cupón por día" + Promociones del mes + página de condiciones.
- [x] T13 Mostrador v2: cupones y canje por cupón.
- [x] T14 Ficha admin: anular compra, ajustar cupones, revisión.
- [x] T15 Pestaña Programa: descuentos, categoría, tipos de pedido, promociones con foto.
- [x] T16 Resumen v2.

## Revisión
- [x] T17 Prueba real en Loyverse Codia: crear los 3 descuentos y la categoría Promociones, ventas de $64/$65/$200/$250 y canjes. Hecho cuando: cada RF pasa.
- [x] T18 Revisión en Chrome (cliente, caja, dueña, teléfono) y publicar en Vercel. Actualizar MEMORY, AGENTS y Drive. (HECHO 2026-10-22: revisado en 3 tamaños, publicado y 016 aplicada. Drive: subir bitácora a mano, sin permiso de escritura.)

## Estado 2026-10-13
- Hecho y probado en real (Loyverse Codia, cliente de prueba C-2891 = kevin.36137+cliente@gmail.com): $64 sin sello; $250 → sello 1 + panadería + cold foam; panadería canjeada en el mismo ticket; paquete $220 da sello con regular $0; 7.º sello → bebida desde el día siguiente (mismo día: not_yet); compra con bebida pendiente no suma; canje de bebida + $65 → recorrido nuevo con sello 1; 2.º cupón el mismo día → daily_limit; cold foam al día siguiente → canjeado; anular ticket desde el panel → cupones usados a revisión.
- Corregidos en la prueba: notas del ticket (array_append) y anular un ticket cuyo cupón se generó y canjeó en él mismo.
- PENDIENTE T2 (migración de datos 015d: Premium → normal y meta 7 en tarjetas abiertas): requiere aprobación de Kevin.
- PENDIENTE T18: revisión final de Kevin, correos con diseño nuevo, Drive.
