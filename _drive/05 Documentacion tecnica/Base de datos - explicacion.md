# Base de datos — Sano Rewards (tarjetas Cliente Consentido)

Proyecto de Supabase propio de Sano Bistro Café. Hora local: America/Mexico_City.
Script: `supabase/migrations/001_esquema_tarjetas.sql` (verificado en Postgres 16, 40 de 40 pruebas pasadas).

## 1. Mapa de tablas

```
business_settings (1 fila)      loyverse_connection (1 fila, secretos en Vault)
staff (superadmin CODIA / dueño / gerente)

tiers (Consentido 8, Premium 4) ──┐
groups (C, G, E, O… QR y colores) ─┼── customers ──┬── loyalty_cards ── visits
loyverse_discounts ── rewards ─────┘   (1 por      │        │             │
                                        persona)   │        └─ reward_id  └─ receipt_id
profiles (persona) ── push_subscriptions           └── notifications_sent
loyverse_receipts ── receipt_discounts
audit_log · monthly_group_stats
```

| Tabla | Qué guarda | Claves y reglas |
|---|---|---|
| `business_settings` | Nombre del negocio, zona horaria, módulo de tarjetas activo | Una sola fila |
| `loyverse_connection` | Tienda, id del aviso de ventas, última sincronización | Una sola fila; token y secreto solo como id de Supabase Vault; sin acceso desde la app |
| `staff` | Quién entra al panel | Rol: `superadmin` (CODIA), `owner`, `manager` (a futuro) |
| `tiers` | Niveles | `code` único; meta de visitas 1–31; un solo nivel por defecto |
| `groups` | Grupos de registro | `prefix` único (1–2 letras mayúsculas); token del QR único; colores en formato `#RRGGBB`; un solo grupo por defecto (C) |
| `loyverse_discounts` | Copia de los descuentos de Loyverse | Llave = id de Loyverse |
| `rewards` | Qué descuento gana cada nivel + grupo | Una sola recompensa activa por (nivel, grupo); grupo vacío = todos |
| `profiles` | La persona (nombre, correo, teléfono) | Se crea sola al registrarse |
| `customers` | La persona como cliente | Una por persona; `code_number` único 1000–9999; grupo, nivel, vencimiento de Premium |
| `loyalty_cards` | Cada ciclo de visitas | Una sola abierta por cliente; estados abierta → premio listo → canjeada / vencida |
| `visits` | Cada visita contada | Una por venta; máximo una por día (las anuladas no cuentan) |
| `loyverse_receipts` | Cada venta recibida | `receipt_number` único (no se procesa dos veces); estado y motivo |
| `receipt_discounts` | Descuentos aplicados en cada venta | Llave (venta, descuento) |
| `push_subscriptions` | Navegadores con notificaciones | Endpoint único |
| `notifications_sent` | Avisos enviados | `dedupe_key` único (no se repite un aviso) |
| `audit_log` | Cambios hechos por el personal | Antes y después en JSON |
| `monthly_group_stats` | Resumen mensual por grupo | Llave (mes, grupo) |

## 2. Normalización

- **1FN (valores atómicos).** El código del cliente no se guarda como texto "G-4821": el prefijo vive en `groups` y el número en `customers`. Los descuentos de una venta van en `receipt_discounts`, no en una lista. Los colores son columnas separadas.
- **2FN (sin dependencias parciales).** En `receipt_discounts` la llave es (venta, descuento) y solo guarda el monto, que depende de ambos. En `monthly_group_stats` todo depende de (mes, grupo).
- **3FN (sin dependencias transitivas).** El nombre y el correo solo están en `profiles`; el prefijo solo en `groups`; el nombre del descuento solo en `loyverse_discounts`. Cambiar a un cliente de grupo cambia su código automáticamente.

Duplicados intencionales y controlados:

| Dato | Motivo | Cómo se mantiene correcto |
|---|---|---|
| `loyalty_cards.visits_count` | Mostrar la tarjeta sin contar filas | Lo actualiza un trigger al insertar o anular una visita |
| `loyalty_cards.visits_goal` | Una tarjeta conserva la meta con la que empezó | Se copia al crear la tarjeta; solo cambia al cambiar de nivel |
| `visits.customer_id` | Que la base de datos impida dos visitas el mismo día | Llave foránea doble `(card_id, customer_id)` contra la tarjeta |
| `loyverse_receipts.customer_id` | Reportes y búsqueda rápida por cliente | Lo escribe solo el proceso de ventas |
| `loyverse_receipts.raw` | Auditoría y reprocesar | Se puede depurar después de 90 días |

## 3. Flujos

**Registro.** QR del grupo → `get_group_by_token` (público, solo ese grupo) → inicio de sesión → perfil automático → `register_customer(token)` crea el cliente con nivel por defecto, número único y su tarjeta del mes. Si ya existe, regresa el mismo.

**Venta de Loyverse** (servidor, con la llave de servicio):
1. `upsert_loyverse_receipt(json)` guarda la venta; si llega repetida no se duplica; si llega cancelada, vuelve a pendiente.
2. `process_receipt(id)`:
   - Cancelada → anula su visita y revierte su canje.
   - Devolución → anula la visita de la venta original.
   - Guarda sus descuentos y busca el código en la nota y en los comentarios de producto (`G-4821`, `g 4821`, `G4821`). El prefijo debe coincidir con el grupo del cliente.
   - Si la venta es de un mes ya cerrado → se ignora.
   - Si trae el descuento de un premio listo → lo marca canjeado.
   - Cuenta la visita (también la del canje), máximo una por día. Al llegar a la meta, la tarjeta pasa a premio listo con su recompensa y se abre otra.
   - Deja estado y motivo: `visit`, `visit_and_redeem`, `already_visited_today`, `no_customer_code`, `closed_period`, `refund`, `cancelled`, o `error`.

**Premium.** `set_customer_tier(cliente, 'premium')` (solo superadmin): vence al cerrar el mes; ajusta la meta de la tarjeta abierta (si ya alcanza la nueva meta, se completa). Queda en `audit_log`.

**Cierre de mes.** `close_month()` (diario 00:10 hora de México, idempotente): vence tarjetas y premios del mes anterior, regresa a Consentido a los Premium vencidos y guarda `monthly_group_stats`.

**Pantalla del cliente.** `my_card()` regresa en una consulta: código, grupo y colores, nivel, visitas/meta, fin del periodo, premios listos y últimas visitas.

**Recordatorios.** `customers_to_remind(días)` lista a quien tiene visitas o premios por vencer y aún no recibió el aviso de ese mes.

## 4. Seguridad (RLS)

- Cliente: solo ve su perfil, su registro de cliente, sus tarjetas y sus visitas. No puede insertar ni modificar visitas, tarjetas ni su nivel.
- Público sin sesión: solo `get_group_by_token`.
- Personal (`staff`): lectura de catálogos, ventas y reportes. Superadmin: escribe catálogos, personal y nivel de clientes.
- `loyverse_connection`: sin políticas, solo el servidor.
- Funciones con `security definer` y `search_path` vacío; las políticas usan `(select auth.uid())` para que Postgres lo calcule una vez por consulta.

## 5. Rendimiento

Índices en todas las llaves foráneas y en: número de cliente, prefijo, token del QR, tarjeta abierta por cliente (índice parcial), visitas por cliente y día (índice parcial único), ventas pendientes y ventas por cliente. Comprobado con `EXPLAIN`: la búsqueda del código y la tarjeta abierta usan índice.

## 6. Instalación en Supabase

1. SQL Editor → pegar y ejecutar `001_esquema_tarjetas.sql`.
2. Database → Extensions → activar `pg_cron` y ejecutar la línea comentada del final.
3. Guardar el token de Loyverse en Vault (`select vault.create_secret('<token>', 'loyverse_token')`) y poner su id en `loyverse_connection.token_secret_id`.
4. Dar de alta a CODIA: `insert into staff (user_id, role) values ('<id del usuario>', 'superadmin');`
5. Crear grupos, sincronizar descuentos de Loyverse y ligar las recompensas desde el panel.

## 7. Pruebas

`supabase/tests/pruebas_escenarios.sql` simula: registro con y sin QR, permisos (RLS), 8 visitas con premio, misma visita en el día, aviso duplicado, prefijo equivocado, venta sin código, canje, devolución, cancelación que revierte un premio, Premium por superadmin y bloqueo a clientes, venta de mes cerrado, cierre de mes, recordatorios y uso de índices. Resultado: `resultado_pruebas.txt`.

## 8. Decisiones tomadas por Claude (revisar)

- El código acepta `G-4821`, `G 4821` o `G4821` en mayúsculas o minúsculas.
- Al completar la tarjeta se abre otra de inmediato; las visitas siguientes cuentan aunque el premio no se haya canjeado.
- Si se cancela la visita que completó la tarjeta y el premio no se canjeó, la tarjeta regresa a abierta (siempre que la siguiente siga en 0).
- Una devolución anula la visita, pero no revierte un canje; una cancelación sí.
- Los recordatorios salen cuando faltan 5 días o menos para el fin de mes (ajustable).
- Las estadísticas mensuales cuentan las visitas en el grupo actual del cliente.
