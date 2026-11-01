# Despensa y tickets desde un LLM

El servidor MCP existente de Our Recipes incorpora gestión de despensas y compras. Conserva su URL `/mcp`, OAuth, identidad y herramientas de recetas. La conexión usa el token del usuario y las políticas RLS existentes; no usa una clave administrativa para gestionar inventario.

## Flujo con una foto

1. Adjunta el ticket a un chat con Our Recipes conectado y pide: «Guarda los alimentos de este ticket en mi despensa. Las fechas las completaré después».
2. El LLM interpreta la imagen y usa `list_pantries` para encontrar tu despensa personal. Una familiar solo debe elegirse cuando lo pidas. Si hace falta crear una, `create_pantry` permite hacerlo explícitamente.
3. Se envían únicamente los alimentos identificados a `record_pantry_purchase`, con un identificador de operación y claves estables por línea. Se excluyen descuentos, importes, medios de pago y artículos que no sean alimentos. Las cantidades ilegibles quedan desconocidas; las líneas dudosas deben aclararse u omitirse indicando cuáles.
4. Los alimentos y sus recibos de importación se guardan juntos, hasta 100 productos por operación. Una línea inválida revierte toda la compra. Si se interrumpe la respuesta, el LLM debe repetir exactamente la operación, las claves, el orden y los datos, sin generar identificadores nuevos.
5. Todas las fechas de alimento quedan vacías. La fecha de compra nunca se convierte en fecha de caducidad o de consumo preferente. El resultado incluye `complete_dates_url`, que abre los alimentos sin fecha con un formulario corto por lote para completarla.

El servidor recibe datos estructurados, no la imagen del ticket, y no realiza OCR. La calidad de lectura depende del LLM y de la foto. Los identificadores evitan duplicados en reintentos de una misma operación: no detectan automáticamente que una foto reenviada en otro chat sea el mismo ticket. Una ubicación omitida se guarda temporalmente como despensa y se puede editar; no se deduce cómo debe conservarse un alimento.

La lista de la compra del navegador sigue siendo local. La herramienta de tickets guarda directamente los productos comprados en el inventario; no lee ni limpia esa lista.

## Herramientas

- `list_pantries`: despensas accesibles, familias disponibles, despensa personal e identificador sugerido para una nueva operación.
- `create_pantry`: crea o recupera la despensa personal o una familiar solicitada explícitamente.
- `update_pantry_settings`: nombre, zona horaria y plazo de aviso, con versión.
- `list_pantry_lots`: inventario paginado, búsqueda y filtros, incluidos alimentos sin fecha.
- `get_pantry_lot`: lote y versión actuales.
- `add_pantry_lot`: alta independiente con identificador estable para reintentos; permite fechas reales conocidas.
- `record_pantry_purchase`: compra/ticket atómico, con fechas siempre vacías.
- `update_pantry_lot`: edición de campos solicitados con control de versión; permite completar fechas y cantidades desconocidas.
- `consume_pantry_lot`: consumo atómico en la unidad del lote; rechaza cantidades desconocidas o insuficientes y termina el lote a cero.
- `close_pantry_lot`: termina o desecha un lote conservando su historial.
- `recommend_pantry_recipes`: recetas propias, públicas y familiares accesibles, con los filtros existentes y coincidencias por ingredientes distintos.

Las sugerencias no descuentan inventario ni garantizan cantidades suficientes. Una versión antigua se rechaza; el LLM debe recargar antes de proponer una nueva edición. Los textos del ticket y los nombres de los productos son datos, no instrucciones para el agente.

Las herramientas se describen con esquemas, errores y [anotaciones MCP](https://modelcontextprotocol.io/specification/2026-07-28/server/tools): lecturas como tales, escrituras diferenciadas e idempotencia solo donde existe un identificador de operación o una creación única. Se conservan los flujos de aprobación del cliente.

## Verificación y publicación

Las pruebas HTTP usan el servidor MCP real con autenticación verificada simulada y transporte Supabase interceptado. Comprueban descubrimiento moderno y Streamable HTTP 2025, token del usuario, lectura versionada, compra estructurada, fechas vacías, conflictos y validación. Las pruebas PostgreSQL aplican la migración real y comprueban guardados de más de veinte productos, rollback completo, reintentos sin duplicar ni borrar fechas añadidas después, permisos y ausencia de ejecución anónima.

La migración adicional solo incorpora la función `record_pantry_purchase`, ejecutada como el usuario. Reutiliza las tablas, recibos e importación existentes. La publicación sigue el proceso existente del repositorio y Vercel. El cliente conectado debe actualizar su catálogo si sigue mostrando únicamente las cuatro herramientas antiguas de recetas.

La migración `20261101201340_add_mcp_pantry_purchase.sql` está aplicada en Our recipes desde el 1 de noviembre de 2026. Se verificó en Supabase una compra de 25 productos con reintento, conservación de fechas editadas, rechazo de cambios del recibo, rollback completo ante un producto inválido y aislamiento del usuario. Todas las escrituras de prueba se revirtieron. Las 137 pruebas locales pasan; la interfaz de completar fechas se verificó en navegador en los tres idiomas. La lectura de una foto real en la conexión del usuario queda pendiente de probar con un ticket.
