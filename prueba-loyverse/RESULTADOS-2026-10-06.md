# Pruebas de punta a punta · 2026-10-06

Flujo probado: venta en Loyverse (cuenta de PRUEBA "Tixcapostres") → webhook `receipts.update` →
Edge Function `loyverse-webhook` → Supabase (`sano_bistro`) → tarjeta en la app (modo real, localhost:5174).
Cliente de prueba: **C-8571** (cuenta creada por Kevin desde la app, entrando por el QR de Cliente Consentido).

| Paso | Caso | Resultado |
|---|---|---|
| — | Petición sin clave / con clave falsa | PASÓ (401 en ambas) |
| — | Venta sin código | PASÓ (ignorada: `no_customer_code`) |
| A1 | Código en la nota del ticket | PASÓ (+1 visita) |
| A2 | Segunda venta el mismo día | PASÓ (no suma: `already_visited_today`) |
| A3 | Código en minúsculas y con espacio (`c 8571`) en la nota del producto | PASÓ (+1) |
| A4 | Código que no existe (`C-0000`) | PASÓ (ignorada) |
| A5 | Descuento de premio sin tener premio | PASÓ tras corregir la ventana de la alerta (006): suma visita y queda en el reporte |
| A6 | Devolución de una venta (simulada) | PASÓ (anula esa visita) |
| B1 | Premium (meta 4): visita | PASÓ (3/4) |
| B2 | Visita 4 de 4 | PASÓ (premio listo, tarjeta nueva 0/4) |
| B3 | Canje con descuento 2x1 | PASÓ (canjeado + cuenta visita) |
| B4 | Cancelación de la venta del canje (simulada) | PASÓ (visita anulada, premio vuelve a estar listo) |

Simulados (payload enviado directo a la función, mismo formato que Loyverse): devolución y cancelación.
Todo lo demás fueron ventas reales creadas con la API de Loyverse.

La app en modo real mostró la tarjeta Premium con "2x1 en tu bebida" listo y el historial con las visitas.

Datos de prueba que quedaron: ~10 ventas en la cuenta de prueba de Loyverse; el cliente C-8571 en Premium
hasta fin de mes (cambiado por SQL, porque aún no hay superadmin). Se pueden limpiar cuando Kevin diga.
