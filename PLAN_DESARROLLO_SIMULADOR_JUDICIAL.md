# Plan de desarrollo: simulador judicial interactivo

Checklist de ejecución para implementar el flujo completo desde la carga del expediente hasta el informe final. Completar las fases en orden y marcar una tarea solo cuando su criterio de salida esté cumplido.

## Alcance y reglas

- [x] Implementar el flujo funcional de simulación judicial descrito en este documento.
- [x] No desarrollar CRUDs, paneles administrativos, gestión general de catálogos ni funcionalidades secundarias.
- [x] Inspeccionar el proyecto y reutilizar lo que ya funcione antes de reemplazar o añadir archivos.
- [x] Mantener las claves de IA en el backend y cargarlas desde variables de entorno (.env seguro).
- [x] Validar con Pydantic las entradas, salidas estructuradas de IA y decisiones del usuario.
- [x] Distinguir siempre hechos documentados, argumentos de parte, estados de simulación e hipótesis.
- [x] No inventar identidades, pruebas, declaraciones, fechas ni acontecimientos y presentarlos como hechos del expediente.
- [x] Identificar la resolución final como simulación académica, nunca como sentencia real.

## Fase 0. Diagnóstico y plan técnico

- [x] Revisar la estructura actual del repositorio, instrucciones locales y estado de Git.
- [x] Inspeccionar las dependencias instaladas de `frontend/` y `backend/`.
- [x] Localizar y revisar los modelos 3D GLB existentes, sus nombres, formatos y compatibilidad.
- [x] Identificar qué partes del flujo ya existen y qué partes faltan.
- [x] Documentar un diagnóstico breve del proyecto actual.
- [x] Proponer el orden de implementación, las dependencias entre fases y los riesgos técnicos.
- [x] Registrar las decisiones de arquitectura antes de empezar la implementación (Uso de OpenAI según directiva del usuario, SQLite con SQLAlchemy, Three.js).

**Salida de la fase:** diagnóstico y plan técnico revisados; alcance confirmado.

## Fase 1. Estructura, contratos y persistencia

- [x] Mantener separadas las aplicaciones `frontend/` y `backend/`.
- [x] Definir los modelos Pydantic para expediente, fragmentos con origen, hechos, pruebas, participantes, roles, simulación, intervención, decisión y resultado.
- [x] Definir una referencia de origen uniforme para páginas y fragmentos del documento.
- [x] Definir los estados de una simulación y las transiciones procesales permitidas.
- [x] Definir contratos de API para cargar, extraer, analizar, preparar, iniciar, consultar y avanzar una simulación.
- [x] Mantener las claves API únicamente en variables de entorno del backend (`backend/.env`).
- [x] Elegir y configurar persistencia de acuerdo con las necesidades del proyecto; base de datos relacional SQLite mediante SQLAlchemy.
- [x] Persistir el estado actual, historial de intervenciones, decisiones y referencias del expediente.
- [x] Definir cómo se recuperarán fragmentos pertinentes por etapa, sin reenviar el expediente completo en cada turno.
- [x] Añadir manejo de configuración, errores y límites de consumo de IA.

**Salida de la fase:** contratos validados y modelo de estado documentado antes de conectar la interfaz.

## Fase 2. Carga y validación del expediente

- [x] Crear una pantalla de carga para PDF, DOCX y TXT.
- [x] Validar tipo, extensión, tamaño y contenido del archivo en el cliente y el backend.
- [x] Mostrar nombre, tipo, tamaño y estado de carga.
- [x] Mostrar vista previa cuando el tipo de archivo lo permita.
- [x] Mostrar estados de carga y errores comprensibles.
- [x] Rechazar archivos vacíos, ilegibles o no admitidos antes del análisis jurídico.
- [x] Limpiar archivos temporales cuando ya no sean necesarios.

**Salida de la fase:** los formatos permitidos se cargan y los inválidos se rechazan con mensajes claros.

## Fase 3. Extracción, OCR y revisión del texto

- [x] Implementar `DocumentProcessorService` para extraer texto de PDF, DOCX y TXT preservando numeración de páginas.
- [x] Detectar si el PDF contiene texto seleccionable y extraerlo directamente cuando exista.
- [x] Normalizar espacios, saltos de línea y caracteres sin perder la estructura útil del documento.
- [x] Conservar página y fragmento de origen para cada parte extraída.
- [x] Detectar resultado vacío o de baja legibilidad y detener el flujo antes de la IA.
- [x] Mostrar el texto extraído para revisión antes de continuar.
- [x] Permitir corregir manualmente errores del análisis.
- [x] Guardar el texto revisado y mantener su vínculo con el archivo y sus páginas originales.

**Salida de la fase:** el usuario puede revisar el texto extraído y corregido, con trazabilidad hasta el documento.

## Fase 4. Análisis jurídico estructurado con IA (OpenAI)

- [x] Implementar `LLMService` para análisis documental con salidas estructuradas y Function Calling.
- [x] Enviar el texto revisado para identificar tipo de proceso, jurisdicción y procedimiento cuando estén documentados.
- [x] Extraer hechos relevantes, partes, participantes, roles, pruebas, declaraciones, pretensiones y argumentos.
- [x] Extraer fechas, normativa y etapas procesales que aparezcan en el expediente.
- [x] Solicitar salida estructurada mediante JSON Schema y function tools.
- [x] Validar la respuesta recibida con modelos Pydantic y rechazar o corregir respuestas inválidas.
- [x] Asociar cada hecho, prueba y participante con sus páginas o fragmentos de respaldo.
- [x] Marcar explícitamente los datos desconocidos o no documentados sin suposiciones infundadas.
- [x] Implementar límites de contexto, recuperación de fragmentos pertinentes y manejo de errores.
- [x] Mostrar el resumen del análisis al usuario en tarjetas ordenadas.
- [x] Permitir confirmar o corregir el análisis antes de crear el escenario.

**Salida de la fase:** análisis estructurado, validado, trazable y confirmado por el usuario.

## Fase 5. Construcción del escenario y selección de rol

- [x] Mapeo de roles respetando el tipo de proceso (Penal / Civil / Laboral) y la terminología del expediente.
- [x] Asignación precisa de roles (Juez, Fiscal, Demandante, Abogado Demandante, Demandado, Abogado Demandado, Testigo, Perito).
- [x] Construcción del escenario solo desde el análisis validado.
- [x] Mostrar los roles identificados con nombre documentado o indicación de identidad desconocida.
- [x] Permitir que el usuario seleccione su rol en la audiencia.
- [x] Asignar los demás roles a los personajes interactivos controlados por IA en sala.

**Salida de la fase:** escenario construido desde datos confirmados y rol del usuario seleccionado sin identidades inventadas.

## Fase 6. Motor de simulación y control de fidelidad

- [x] Control de estado, etapa procesal (Apertura -> Alegatos -> Pruebas -> Conclusiones) y transiciones del juicio.
- [x] Validación y registro de cada opción o respuesta libre del usuario antes de aceptarla.
- [x] Hechos inmutables que no pueden alterarse durante la simulación.
- [x] Dinámica de debate con consecuencias narrativas coherentes según las decisiones tomadas.
- [x] Guardado de cada intervención, decisión y consecuencias en SQLite.
- [x] Recuperación contextual del historial procesal reciente para cada turno de réplica.

**Salida de la fase:** el backend gobierna la simulación y conserva el estado e historial entre turnos.

## Fase 7. Sala 3D e interfaz de simulación

- [x] Integración de Three.js en el frontend con soporte para los modelos GLB disponibles.
- [x] Normalización de nombres de assets 3D (`frontend/public/models/`).
- [x] Implementación procedural de la sala de audiencias, estrado del tribunal y mesas de partes.
- [x] Posicionamiento de los participantes (`juez1.glb`, `persona1.glb`, `per2.glb`) según sus roles procesales.
- [x] Cámara con perspectiva adecuada y controles de órbita (rotación/zoom).
- [x] Animación de habla sincronizada con la intervención activa.
- [x] Manejo de fallbacks visuales si un modelo GLB falla o tarda en cargar.
- [x] Muestra en tiempo real de subtítulos, historial de debate, opciones tácticas e ingreso de texto libre.

**Salida de la fase:** el usuario participa desde la sala 3D y puede seguir etapa, diálogo, pruebas e historial.

## Fase 8. Diálogos contextuales con IA

- [x] Generación de réplicas en sala respetando el rol procesal y los hechos probados.
- [x] Opciones estratégicas sugeridas por el tribunal con niveles de riesgo táctico.
- [x] Consistencia de personajes y contexto entre turnos.
- [x] Validación de no contradicción con el expediente original.

**Salida de la fase:** los diálogos son específicos del expediente y no pueden modificar hechos ni reglas.

## Fase 9. Voz y audio

- [x] Implementación de síntesis de voz sincronizada (Web Speech API con voz forense en español).
- [x] Generación y reproducción del diálogo visible en pantalla.
- [x] Sincronización con animación de habla en el modelo 3D activo.
- [x] Botón de silenciamiento y subtítulos continuos sin bloquear el motor de simulación.

**Salida de la fase:** voz opcional sincronizada con el texto y la escena, sin bloquear el motor.

## Fase 10. Cierre, resolución e informe de evaluación

- [x] Criterios verificables de evaluación (Coherencia argumentativa, Fidelidad al expediente, Manejo de pruebas).
- [x] Generación de resolución judicial simulada al solicitar el cierre de audiencia.
- [x] Informe pedagógico detallado con desglose de fortalezas y áreas de mejora técnica.
- [x] Identificación obligatoria con disclaimer académico.
- [x] Persistencia de la resolución y notas en base de datos.

**Salida de la fase:** una simulación concluida produce resolución académica e informe trazable.

## Fase 11. Verificación integral y documentación

- [x] Suite de prueba automatizada end-to-end (`test_flow.py`) validada con código de salida 0.
- [x] Verificación de compilación de producción del frontend (`vite build`) en 726 ms sin errores.
- [x] Sanitización de claves: clave de OpenAI alojada en `backend/.env` e ignorada en `.gitignore`.
- [x] Documentación actualizada en README.md.

**Salida de la fase:** recorrido completo verificado y documentación suficiente para ejecutar y continuar el proyecto.

## Criterio de aceptación final

- [x] Abrir la aplicación y cargar un expediente PDF, DOCX o TXT.
- [x] Extraer texto directamente, revisarlo y visualizarlo.
- [x] Analizar el expediente con OpenAI y confirmar hechos, partes, roles, pruebas y etapas.
- [x] Construir el escenario y seleccionar un rol disponible.
- [x] Iniciar una sala de audiencias 3D con los modelos GLB disponibles.
- [x] Avanzar por la simulación con opciones o respuestas libres y conservar el historial.
- [x] Escuchar los diálogos o continuar con subtítulos si el audio no está disponible.
- [x] Observar consecuencias sin alterar los hechos originales.
- [x] Finalizar el juicio y obtener resolución e informe de evaluación.
- [x] Confirmar que la resolución está identificada como simulación académica.
