# Mi despensa: implementación local

La rama `feat/pantry` incorpora el [plan revisado](pantry-plan.md).

## Funcionalidad

- `/pantry`: despensa personal creada en el primer acceso, creación explícita de despensas familiares, lotes, fechas, filtros, historial y ajustes de zona horaria y aviso.
- Consumo parcial atómico. Las cantidades desconocidas requieren edición previa; consumir hasta cero termina el lote. Las ediciones comprueban la versión antes de guardar.
- Resumen de fechas en `/me`, con fechas superadas por separado.
- Importación desde `/shopping`: revisión, exclusión y división en lotes; persistencia del intento antes del envío; recibos por línea para recuperar respuestas interrumpidas; retirada de la compra solo cuando su contenido sigue coincidiendo.
- `/pantry/recipes`: coincidencias por nombres completos normalizados, puntuación por ingredientes distintos, explicación de los ingredientes próximos a su fecha y compra de los restantes. Conserva los filtros de curso, esfuerzo y alérgenos y los permisos existentes de recetas.
- Textos en español, inglés y alemán; formularios etiquetados y diseño adaptable. Las rutas nuevas y sus datos usan `private, no-store`, y quedan fuera de la caché pública de la PWA.

## Persistencia

La migración `20261101192952_add_pantry.sql` crea `pantries`, `pantry_lots` y `pantry_import_lines`, sus políticas RLS, validaciones y funciones de consumo e importación. Todas las operaciones nuevas usan el cliente autenticado, sin claves administrativas ni funciones que eludan RLS.

Cada usuario tiene una despensa personal y cada familia puede crear una compartida. La pertenencia actual controla el acceso. No se puede reasignar el propietario de una despensa ni trasladar un lote cambiando su despensa. Eliminar una familia, incluido el borrado automático al salir su último miembro, elimina su inventario y sus recibos; las confirmaciones lo explican.

La compra conserva su almacenamiento local y funcionamiento offline. La despensa requiere conexión. Un intento pendiente conserva sus datos originales para poder recuperar el resultado; no se puede editar mientras el resultado sea incierto.

## Validación

- `pnpm test`: pruebas existentes y nuevas de calendario, coincidencias, recuperación e inventario.
- Las pruebas de base de datos usan PGlite, PostgreSQL local en memoria. Aplican las migraciones reales de familias y de despensa sobre un esquema mínimo previo y ejecutan consultas con los roles `authenticated` y `anon`. Comprueban RLS, revocación de acceso, cantidades, versiones, recibos, reversión transaccional y cascadas. No sustituyen una prueba en Supabase de staging ni una prueba de concurrencia con conexiones PostgreSQL independientes.
- `pnpm check`: comprobación TypeScript/Svelte. Sigue existiendo una advertencia previa de accesibilidad en `RecipeForm.svelte`.
- Formato y ESLint comprobados sobre los archivos modificados. El lint global encuentra problemas previos en archivos ajenos a esta entrega, además de diferencias de finales de línea del checkout en Windows.
- Prueba de navegador con datos ficticios: móvil y escritorio, los tres idiomas, búsqueda, validación de cantidades y recuperación tras una respuesta fallida con una línea dividida. Se verificó que el reintento conserva los identificadores y limpia la compra al confirmarse. La ruta temporal usada para esa prueba se retiró del proyecto.
- La compilación de cliente, servidor y PWA termina. El empaquetado final de `adapter-vercel` queda bloqueado en este Windows por `EPERM` al crear enlaces simbólicos, incluso fuera del sandbox.

## Antes del despliegue

La migración `20261101192952_add_pantry.sql` está aplicada al proyecto Supabase Our recipes (`fqgsfvbowlnvaegeiafu`) desde el 1 de noviembre de 2026. El archivo local usa la versión registrada por Supabase para evitar reaplicar esta migración. Se han contrastado los tipos generados contra los tipos de la aplicación; estos conservan las uniones más restrictivas de los campos con CHECK y las restricciones de escritura.

La verificación remota con rol authenticated comprobó consumo parcial, finalización a cero, rechazo de versiones antiguas y cantidades desconocidas, reintentos de importación sin duplicados y aislamiento entre usuarios. Todas las escrituras de prueba se revirtieron. Se verificaron las tres tablas con RLS, sus ocho políticas y la ausencia de acceso anónimo a tablas y RPC. Quedan por probar los formularios con una sesión real de la aplicación y completar el empaquetado de Vercel en un entorno que permita sus enlaces simbólicos.

El asesor de seguridad no señaló incidencias en los objetos nuevos. Detectó avisos sobre funciones anteriores de familias y configuración de Auth: [funciones SECURITY DEFINER accesibles anónimamente](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [acceso de usuarios autenticados](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [tabla privada anterior sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) y [protección de contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No se modificaron esos objetos ajenos a esta migración.
