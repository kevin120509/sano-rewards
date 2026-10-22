# 003 · Panel de la dueña (Administración) y del personal (Mostrador)

Estado: aprobado por Kevin el 2026-10-09 ("ok" a las 5 decisiones). En implementación.

## Qué y por qué
La dueña necesita administrar clientes, grupos/convenios y membresías sin pedirle nada a CODIA, y el personal
necesita una salida simple cuando el código no se puso en Loyverse (cliente sin celular, olvido o error de dedo).
Pedido de la dueña en los audios: buscar al cliente por nombre y dar el sello con un botón, sin teclear números,
y botones + / − para corregir. Ventas y dinero NO: eso vive en Loyverse.

## Un solo link, tres vistas (por rol, decidido por la base de datos)
| Rol | Quién | Ve |
|---|---|---|
| cliente | cualquiera que se registra | su tarjeta (sin cambios) |
| cashier (mesero) | cuenta de la tableta | Mostrador |
| owner (dueña) | correo que CODIA da de alta | Administración + Mostrador |
| superadmin | CODIA | todo |
Nadie elige rol: el registro siempre crea cliente. Los roles se asignan en `staff` / `staff_invites` (solo CODIA).
Un correo invitado como personal NO crea tarjeta de cliente al entrar.

## Requisitos (EARS)
- RF1. CUANDO una cuenta del personal inicie sesión, el sistema DEBE abrir su panel (Mostrador o Administración), no la tarjeta.
- RF2. CUANDO el personal busque por nombre, teléfono o código, el sistema DEBE listar coincidencias con nombre, código, grupo, beneficio en caja, visitas, "ya vino hoy" y premio listo.
- RF3. CUANDO el personal toque "+1 sello", el sistema DEBE sumar la visita de hoy con la misma regla de Loyverse (1 por día) y guardar quién la dio.
- RF4. SI el cliente ya tiene visita hoy, ENTONCES "+1" DEBE avisar y no sumar.
- RF5. CUANDO el personal toque "Canjear premio", el sistema DEBE marcar canjeado el premio listo más antiguo.
- RF6. SOLO la dueña/superadmin PUEDE quitar un sello (−1), con motivo.
- RF7. La dueña PUEDE crear/editar/pausar grupos: nombre, letra (única, no editable con clientes), diseño (4), premio (descuento de Loyverse), beneficio en caja y mensaje; y descargar su QR.
- RF8. La dueña PUEDE cambiar a un cliente de grupo: conserva número y visitas; cambia letra y diseño.
- RF9. La dueña PUEDE activar Premium por 1, 3 o 6 meses o quitarlo; vence solo.
- RF10. El panel de la dueña DEBE mostrar: clientes por grupo, visitas de hoy y del mes, premios ganados y canjeados del mes, Premium activos, clientes nuevos del mes.
- RF11. Toda acción manual DEBE quedar en audit_log (quién, qué, cuándo).
- RF12. SI un cliente intenta abrir un panel, ENTONCES el sistema NO DEBE mostrar datos (permisos en la base de datos, no solo en la pantalla).

## Casos límite
Cliente sin tarjeta abierta del mes (se crea), +1 que completa la tarjeta (premio listo y tarjeta nueva, por trigger),
quitar el sello que completó la tarjeta (se revierte si el premio no se canjeó), letra repetida, grupo pausado
(su QR deja de registrar), Premium que vence a mitad de mes (meta vuelve a 8 al iniciar el siguiente).

## Fuera de alcance (por ahora)
Reportes de ventas, lista de "ventas sin cliente", pantalla de CODIA para dar de alta personal (se hace por SQL),
crear descuentos desde el panel (se crean en Loyverse y se sincronizan solos).

## Plan (cómo)
1. Migración 012: rol `cashier`, `staff_invites` (alta por correo antes de que entren), `groups.benefit`,
   `visits.source/added_by` y `receipt_id` opcional; RPCs `my_role`, `staff_*` y `admin_*` (security definer + chequeo de rol).
2. Sincronizar descuentos de Loyverse en la tarea de cada minuto (para elegir premio de un grupo nuevo).
3. Frontend: ruteo por rol; pantallas Mostrador y Administración (Resumen, Clientes, Grupos con QR).
4. Cuentas de prueba: kevin.36137+admin@gmail.com (owner) y kevin.36137+caja@gmail.com (cashier).
5. Revisión: probar cada RPC con cada rol (cliente, mesero, dueña) contra la BD y cada pantalla en Chrome.
