# Mi despensa: inventario, fechas y recetas de aprovechamiento

Estado: implementación en curso; precisiones de la revisión incorporadas.

Proyecto: `Nujuron/our-recipes`.

Fuera de esta versión: notificaciones push.

## Objetivo

Permitir que los usuarios registren los alimentos que tienen en casa, identifiquen cuáles conviene utilizar primero y encuentren recetas para aprovecharlos.

La primera versión incluirá inventario sincronizado, avisos dentro de la app, incorporación desde la lista de la compra y sugerencias de recetas.

## Funcionalidad

### Inventario

- Añadir una pantalla `/pantry`, accesible desde la navegación.
- Ofrecer tres ubicaciones: despensa, nevera y congelador.
- Registrar nombre obligatorio; cantidad, unidad, fecha y nota opcionales.
- Distinguir fecha de caducidad de consumo preferente.
- Permitir registrar productos sin fecha.
- Guardar cada compra como un lote independiente, aunque coincida el alimento.
- Permitir añadir, editar, consumir parcialmente, marcar como terminado y desechar.
- Conservar los lotes terminados o desechados fuera del listado activo.
- No eliminar automáticamente productos que hayan superado su fecha.
- Sin cantidad conocida solo se podrá editar, terminar o desechar el lote; para consumir parcialmente habrá que indicar primero la cantidad disponible. Restar exactamente lo disponible dejará cantidad cero y estado terminado. No se convertirán unidades automáticamente.

### Organización y avisos

Ordenar los productos activos por fecha más próxima, dejando los productos sin fecha al final. Permitir buscar por nombre y filtrar por ubicación y estado.

| Estado         | Regla                                        |
| -------------- | -------------------------------------------- |
| Fecha superada | Fecha anterior a hoy                         |
| Hoy            | Fecha igual a hoy                            |
| Próximamente   | Dentro del plazo configurado, excluyendo hoy |
| Más adelante   | Posterior al plazo                           |
| Sin fecha      | Fecha no registrada                          |

El plazo inicial será de tres días y podrá configurarse por despensa.

Mostrar un resumen dentro del área del usuario con el número de productos cuya fecha sea hoy o esté próxima. Mostrar los productos con fecha superada por separado.

Utilizar textos distintos para caducidad y consumo preferente. La aplicación no determinará si un alimento es seguro para consumir.

### Incorporación desde la compra

Añadir «Guardar comprados en la despensa» a la lista actual.

1. Seleccionar productos marcados como comprados.
2. Revisar nombre y cantidad, y completar ubicación y fecha.
3. Permitir excluir artículos y dividirlos en lotes.
4. Elegir la despensa de destino y guardar.
5. Retirar de la compra únicamente las líneas guardadas correctamente.

Marcar un artículo como comprado no creará existencias automáticamente. Los reintentos deberán reutilizar un identificador de operación para evitar duplicaciones.

Antes de enviar se persistirá localmente una instantánea de la importación asociada al usuario, con identificadores estables para la operación, cada línea y cada lote. Cada línea y todos sus lotes se guardarán en una única transacción con su recibo. Si la app se cierra después del guardado, el reintento recuperará el recibo sin duplicar existencias. Solo se retirará una línea si sigue comprada y coincide con la instantánea enviada. Los fallos conservarán la línea y el intento pendiente. No se permitirán cambios en un intento cuyo resultado sea incierto.

La lista de la compra conservará su almacenamiento local y funcionamiento offline actual.

### Recetas de aprovechamiento

- Añadir «Ver recetas con este ingrediente» desde cada alimento.
- Añadir «Aprovechar lo que vence pronto» desde la despensa.
- Buscar entre recetas propias, públicas y familiares accesibles al usuario.
- Priorizar las que utilicen más alimentos próximos a su fecha; resolver empates por coincidencias adicionales con el inventario.
- Explicar cada sugerencia: «Usa tus espinacas, que caducan mañana».
- Mostrar coincidencias y los ingredientes restantes para revisar o comprar.
- Mantener disponibles los filtros existentes, incluidos los de alérgenos.

Las coincidencias iniciales usarán nombres completos normalizados por espacios, mayúsculas y acentos. No se asumirán sinónimos, traducciones ni equivalencias entre productos distintos.

El código actual guarda los ingredientes estructurados; se comparará exclusivamente su campo `name`, sin cantidad ni unidad. «Tomate», «tomates» y «tomate picado» seguirán siendo nombres diferentes. La puntuación contará nombres normalizados distintos, nunca lotes ni repeticiones del mismo ingrediente. El primer criterio contará ingredientes con fecha hoy o próxima; el segundo, todos los ingredientes presentes. Las explicaciones usarán el lote elegible con fecha más cercana.

Las sugerencias indicarán presencia, sin garantizar cantidades suficientes. No se descontará inventario automáticamente al cocinar una receta. Los productos con fecha superada quedarán excluidos de las sugerencias automáticas.

## Implementación

### Datos y permisos

Usar Supabase para persistir despensas y lotes, con migraciones versionadas y tipos TypeScript actualizados.

- **Despensa:** propietario personal o familia asociada, nombre, zona horaria y plazo de aviso.
- **Lote:** despensa, nombre, cantidad y unidad opcionales, ubicación, fecha y tipo de fecha, nota, estado y versión de actualización.
- **Importación:** identificador de operación y referencia a la línea de compra para asegurar idempotencia.

Crear la despensa personal cuando el usuario acceda por primera vez. Permitir crear explícitamente una despensa compartida por familia; no compartir automáticamente el inventario personal.

Todos los miembros actuales de la familia podrán gestionar su inventario compartido. Salir o ser eliminado de la familia revocará el acceso. Cambiar la familia principal no trasladará alimentos.

Habrá una despensa personal por usuario y una compartida por familia, creada explícitamente. No se podrá cambiar el propietario o la familia de una despensa ni trasladar un lote editando su identificador de despensa. Eliminar una familia eliminará en cascada su despensa, lotes e importaciones; se explicará en la confirmación existente. El modelo actual también elimina una familia al salir su último miembro; se mostrará la misma confirmación al último miembro. No se transferirá el inventario compartido a ninguna cuenta personal.

Aplicar RLS a todas las tablas nuevas. Las operaciones sobre inventario compartido comprobarán la pertenencia actual a la familia. Las recomendaciones conservarán los permisos existentes de las recetas.

### Comportamiento técnico

- Guardar las fechas de alimentos como fechas de calendario, sin hora.
- Inicializar la zona horaria con la del navegador y permitir editarla.
- Recalcular los estados al cargar la pantalla y cuando cambie el día.
- Requerir conexión para consultar y modificar la despensa.
- Validar cantidades numéricas positivas cuando se indiquen; permitir cantidades desconocidas.
- Consumir cantidades parciales mediante una operación atómica, evitando valores negativos.
- Detectar ediciones concurrentes y pedir recargar antes de sobrescribir cambios ajenos.
- Incorporar los textos nuevos en español, inglés y alemán.
- Mantener los datos privados fuera de la caché pública de la PWA.

No se añadirán tareas programadas, suscripciones push ni solicitudes de permiso de notificaciones.

## Entregas y validación

### Entrega 1: inventario y fechas

Persistencia, permisos, despensas personales y familiares, gestión de lotes, filtros y avisos dentro de la app.

### Entrega 2: compra y recetas

Importación de productos comprados y recomendaciones basadas en los alimentos próximos a su fecha.

### Pruebas de aceptación

- Dos lotes del mismo alimento conservan fechas y cantidades independientes.
- Los estados funcionan en cambios de día, mes, año y horario de verano.
- Los productos sin fecha se muestran correctamente.
- El consumo parcial no produce cantidades negativas, incluso con operaciones simultáneas.
- Reintentar una importación no duplica alimentos.
- Cerrar la app después del guardado y antes de limpiar la compra permite recuperar el recibo sin duplicar lotes, incluso con líneas divididas.
- Una línea cambiada durante la importación no se retira de la compra.
- Una cantidad desconocida no permite restas; llegar a cero termina el lote.
- Varios lotes o ingredientes repetidos no inflan la puntuación de una receta.
- Eliminar una familia elimina solo su inventario compartido y sus recibos, sin afectar a las despensas personales.
- Un fallo de guardado conserva las líneas afectadas en la compra.
- Usuarios ajenos no pueden consultar ni modificar una despensa.
- Un miembro eliminado pierde el acceso.
- Las recomendaciones no revelan recetas privadas sin permiso.
- Las coincidencias no equiparan productos distintos ni garantizan cantidades suficientes.
- La compra sigue funcionando offline.
- Las pantallas funcionan en móvil, con teclado y en los tres idiomas.

Antes de integrar: ejecutar pruebas unitarias, pruebas SQL de permisos, comprobación de tipos, lint y build. Aplicar y verificar la migración en un entorno de pruebas antes del despliegue.

## Límites de esta versión

Quedan aplazados las notificaciones push, escaneo de tickets, códigos de barras, cálculo automático de caducidad, equivalencias avanzadas de ingredientes, edición offline del inventario y calendario de menús.
