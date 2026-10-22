# Sano Bistro — Tarjetas de lealtad (Cliente Consentido)

Proyecto de CODIA. Actualizado: 5 de octubre de 2026.

## 1. Qué es
Sistema web de tarjetas de lealtad para **Sano Bistro Café**. Reemplaza la tarjeta física "Sano rewards" (8 visitas = bebida gratis, válida 1 mes, personal e intransferible). No hay app de Play Store o App Store: es una página web que el cliente abre en su celular. No se usa Google Wallet.

## 2. Decisiones acordadas
| Tema | Decisión |
|---|---|
| Caja | Loyverse sigue siendo el sistema principal. No escanea QR y no se registran clientes en Loyverse. Nuestro sistema se conecta por su API. |
| Identificar al cliente | El cliente dice su código y el mesero lo escribe en el comentario de la venta en Loyverse. |
| Código | Prefijo del grupo + número (ej. G-4821). Cada grupo tiene un prefijo único de 1–2 letras. |
| Meta | 8 visitas (Cliente Consentido), máximo 1 visita por día. |
| Grupos | Consentido (C), GYM, Estudiantes, OSO, etc. Cada grupo tiene su QR de registro, su diseño y sus recompensas. Sin cupo máximo; se cuentan los clientes por grupo. |
| Recompensas | Se crean en Loyverse como descuentos. Nuestro sistema los lee y le muestra a cada cliente la recompensa de su grupo. El mesero aplica ese descuento en Loyverse con el código; el sistema valida y reinicia la tarjeta. |
| Canje | La venta del canje también cuenta como visita. |
| Premium | Estatus en nuestro sistema con beneficios mayores (ej. premio cada 4 visitas). Se reinicia cada mes. |
| Reinicio | Mes calendario: el día 1 se reinician visitas y recompensas no usadas. |
| Inicio de sesión | Google, código por correo, y correo + contraseña. |
| Panel | Solo para CODIA (superadmin). A futuro será un módulo del dashboard general para dueños de negocio. |
| Avisos | Notificaciones del navegador y correo. SMS/WhatsApp después. |
| Base de datos | Un proyecto de Supabase propio para este negocio. |
| Sin visitas manuales | Todo sale de las ventas de Loyverse. |
| Para después | Promos por día (doble visita, etc.), SMS, WhatsApp, aviso de privacidad (módulo aparte). |

## 3. Flujo
1. **Registro:** el cliente escanea el QR de su grupo, inicia sesión y obtiene su tarjeta y su código.
2. **Visita:** al pagar dice su código; el mesero lo escribe en el comentario de la venta en Loyverse; Loyverse avisa a nuestro sistema y se suma la visita (máx. 1 por día).
3. **Premio:** al llegar a 8, la app muestra su recompensa; el mesero aplica el descuento en Loyverse; el sistema marca el premio como canjeado y la tarjeta empieza de nuevo.
4. **Fin de mes:** se reinician visitas y premios no usados; antes, recordatorio por notificación y correo.

## 4. Pruebas con Loyverse (5 oct 2026)
- Cuenta de prueba "Tixcapostres" (de otro negocio, solo para probar la API). Recomendación: crear una cuenta de pruebas propia de CODIA y cambiar el token, que quedó expuesto en un chat.
- El código "4821" escrito en el POS llegó por API como comentario del producto (`line_note`); la nota general del ticket llegó vacía. El sistema busca el código en ambos lugares.
- La venta llegó al servidor de Loyverse en 3–12 segundos.
- Confirmado en la documentación: aviso automático `receipts.update`, campo de nota, descuentos aplicados, devoluciones y cancelaciones. La API es gratuita.
- Pendiente: probar el aviso automático (webhook) cuando exista el servidor.
- Recomendación: crear en Loyverse un producto de $0 "Tarjeta cliente" donde el mesero escriba el código, y desactivar el programa de puntos propio de Loyverse.

## 5. Tecnología
Next.js (app web) en Vercel · Supabase (base de datos, inicio de sesión, tareas automáticas) · API y webhooks de Loyverse · Resend (correos) · notificaciones del navegador.

## 6. Material
- Base de datos: carpeta "Base de datos" (SQL listo para Supabase, pruebas y resultados) y el documento "Base de datos — diseño".
- Diseño de pantallas: tablero "Sano Rewards — pantallas móviles por grupo" en Claude (pedir a Kevin el enlace).
- Grabaciones de las reuniones: cuaderno de NotebookLM "Gestión Empresarial y Facturación".
- Repositorio: https://github.com/codiasupport-sudo/sellos-cafeteria

## 7. Pendientes
- Aprobar la constitución del proyecto y escribir la spec 001.
- Definir las recompensas concretas de cada grupo y de Premium.
- Cuenta real de Loyverse de Sano Bistro y logo/colores oficiales.
- Revisar las decisiones de la base de datos (sección 8 del documento de base de datos).
