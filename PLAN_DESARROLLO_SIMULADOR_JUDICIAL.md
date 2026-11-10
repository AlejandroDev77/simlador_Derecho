# Plan de desarrollo: simulador judicial interactivo

Checklist de ejecución para implementar el flujo completo desde la carga del expediente hasta el informe final. Completar las fases en orden y marcar una tarea solo cuando su criterio de salida esté cumplido.

## Alcance y reglas

- [ ] Implementar el flujo funcional de simulación judicial descrito en este documento.
- [ ] No desarrollar CRUDs, paneles administrativos, gestión general de catálogos ni funcionalidades secundarias.
- [ ] Inspeccionar el proyecto y reutilizar lo que ya funcione antes de reemplazar o añadir archivos.
- [ ] Mantener las claves de Gemini en el backend y cargarlas desde variables de entorno.
- [ ] Validar con Pydantic las entradas, salidas estructuradas de IA y decisiones del usuario.
- [ ] Distinguir siempre hechos documentados, argumentos de parte, estados de simulación e hipótesis.
- [ ] No inventar identidades, pruebas, declaraciones, fechas ni acontecimientos y presentarlos como hechos del expediente.
- [ ] Identificar la resolución final como simulación académica, nunca como sentencia real.

## Fase 0. Diagnóstico y plan técnico

- [ ] Revisar la estructura actual del repositorio, instrucciones locales y estado de Git.
- [ ] Inspeccionar las dependencias instaladas de `frontend/` y `backend/`.
- [ ] Localizar y revisar los modelos 3D GLB existentes, sus nombres, formatos y compatibilidad.
- [ ] Identificar qué partes del flujo ya existen y qué partes faltan.
- [ ] Documentar un diagnóstico breve del proyecto actual.
- [ ] Proponer el orden de implementación, las dependencias entre fases y los riesgos técnicos.
- [ ] Registrar las decisiones de arquitectura antes de empezar la implementación.

**Salida de la fase:** diagnóstico y plan técnico revisados; alcance confirmado.

## Fase 1. Estructura, contratos y persistencia

- [ ] Mantener separadas las aplicaciones `frontend/` y `backend/`.
- [ ] Definir los modelos Pydantic para expediente, fragmentos con origen, hechos, pruebas, participantes, roles, simulación, intervención, decisión y resultado.
- [ ] Definir una referencia de origen uniforme para páginas y fragmentos del documento.
- [ ] Definir los estados de una simulación y las transiciones procesales permitidas.
- [ ] Definir contratos de API para cargar, extraer, analizar, preparar, iniciar, consultar y avanzar una simulación.
- [ ] Mantener las claves API únicamente en variables de entorno del backend.
- [ ] Elegir y configurar persistencia de acuerdo con las necesidades del proyecto; usar PostgreSQL si se requiere almacenamiento duradero o multiusuario.
- [ ] Persistir el estado actual, historial de intervenciones, decisiones y referencias del expediente.
- [ ] Definir cómo se recuperarán fragmentos pertinentes por etapa, sin reenviar el expediente completo en cada turno.
- [ ] Añadir manejo de configuración, errores y límites de consumo de Gemini.

**Salida de la fase:** contratos validados y modelo de estado documentado antes de conectar la interfaz.

## Fase 2. Carga y validación del expediente

- [ ] Crear una pantalla de carga para PDF, DOCX, JPG, JPEG y PNG.
- [ ] Validar tipo, extensión, tamaño y contenido del archivo en el cliente y el backend.
- [ ] Mostrar nombre, tipo, tamaño y estado de carga.
- [ ] Mostrar vista previa cuando el tipo de archivo lo permita.
- [ ] Mostrar estados de carga y errores comprensibles.
- [ ] Rechazar archivos vacíos, ilegibles o no admitidos antes del análisis jurídico.
- [ ] Limpiar archivos temporales cuando ya no sean necesarios.

**Salida de la fase:** los formatos permitidos se cargan y los inválidos se rechazan con mensajes claros.

## Fase 3. Extracción, OCR y revisión del texto

- [ ] Implementar `DocumentProcessorService` para extraer texto de PDF, DOCX e imágenes.
- [ ] Detectar si el PDF contiene texto seleccionable y extraerlo directamente cuando exista.
- [ ] Aplicar OCR a páginas escaneadas de PDF y a imágenes.
- [ ] Elegir e integrar Tesseract o PaddleOCR según compatibilidad y calidad comprobadas.
- [ ] Normalizar espacios, saltos de línea y caracteres sin perder la estructura útil del documento.
- [ ] Conservar página y fragmento de origen para cada parte extraída.
- [ ] Detectar resultado vacío o de baja legibilidad y detener el flujo antes de Gemini.
- [ ] Mostrar el texto extraído para revisión antes de continuar.
- [ ] Permitir corregir manualmente errores del OCR.
- [ ] Guardar el texto revisado y mantener su vínculo con el archivo y sus páginas originales.

**Salida de la fase:** el usuario puede revisar el texto extraído y corregido, con trazabilidad hasta el documento.

## Fase 4. Análisis jurídico estructurado con Gemini

- [ ] Implementar `GeminiAnalysisService` separado de la generación de diálogos.
- [ ] Enviar el texto revisado para identificar tipo de proceso, jurisdicción y procedimiento cuando estén documentados.
- [ ] Extraer hechos relevantes, partes, participantes, roles, pruebas, declaraciones, testimonios, pretensiones y argumentos.
- [ ] Extraer fechas, normativa y etapas procesales que aparezcan en el expediente.
- [ ] Solicitar salida estructurada con JSON Schema cuando esté disponible.
- [ ] Validar la respuesta recibida con modelos Pydantic y rechazar o corregir respuestas inválidas.
- [ ] Asociar cada hecho, prueba y participante con sus páginas o fragmentos de respaldo.
- [ ] Marcar explícitamente los datos desconocidos o no documentados.
- [ ] Evitar completar vacíos del expediente mediante suposiciones.
- [ ] Implementar límites de contexto, recuperación de fragmentos pertinentes y manejo de errores, límites y reintentos de Gemini.
- [ ] Mostrar el resumen del análisis al usuario.
- [ ] Permitir confirmar o corregir el análisis antes de crear el escenario.

**Salida de la fase:** análisis estructurado, validado, trazable y confirmado por el usuario.

## Fase 5. Construcción del escenario y selección de rol

- [ ] Implementar `RoleDetectionService` respetando el tipo de proceso y la terminología del expediente.
- [ ] Evitar confundir fiscal con demandante u otros roles jurídicamente distintos.
- [ ] Implementar `ScenarioBuilderService` para crear el contexto solo desde el análisis confirmado.
- [ ] Construir hechos, pruebas, contexto judicial, etapas, orden de intervención, reglas y condiciones de término.
- [ ] Admitir únicamente estos roles en la primera versión: juez, fiscal, demandante, abogado del demandante, demandado y abogado del demandado.
- [ ] Mostrar solo roles identificados y validados para el expediente; no exigir que todos estén presentes.
- [ ] No inventar el nombre o identidad real de participantes no identificados.
- [ ] Si se necesita un auxiliar ficticio, identificarlo claramente como ficticio y no atribuirle hechos del expediente.
- [ ] Mostrar para cada rol su nombre documentado o indicación de identidad desconocida, descripción, función e imagen o modelo asociado.
- [ ] Permitir que el usuario seleccione un único rol.
- [ ] Asignar los demás roles a los personajes controlados por Gemini.

**Salida de la fase:** escenario construido desde datos confirmados y rol del usuario seleccionado sin identidades inventadas.

## Fase 6. Motor de simulación y control de fidelidad

- [ ] Implementar `SimulationEngine` para controlar estado, etapa y transiciones del juicio.
- [ ] Implementar `DecisionService` para validar cada opción o respuesta libre antes de aceptarla.
- [ ] Definir hechos inmutables que no pueden alterarse durante la simulación.
- [ ] Definir estados condicionados que pueden cambiar por las decisiones del usuario.
- [ ] Definir contenido dinámico para diálogos, argumentos y reacciones generados por Gemini.
- [ ] Impedir que una decisión cambie retroactivamente hechos originales del expediente.
- [ ] Impedir transiciones procesales fuera de las reglas definidas por el backend.
- [ ] Guardar cada intervención, decisión, consecuencia y transición de estado.
- [ ] Implementar `FidelityValidationService` para comprobar que las respuestas no contradigan el expediente ni conviertan hipótesis en hechos.
- [ ] Hacer que las decisiones tengan consecuencias narrativas coherentes, incluidas consecuencias negativas cuando corresponda.
- [ ] Recuperar para cada turno solo los hechos, pruebas e historial pertinentes a la etapa actual.

**Salida de la fase:** el backend gobierna la simulación y conserva el estado e historial entre turnos.

## Fase 7. Sala 3D e interfaz de simulación

- [ ] Integrar Three.js, React Three Fiber y `@react-three/drei` con el frontend existente.
- [ ] Reutilizar los modelos GLB disponibles después de comprobar su compatibilidad.
- [ ] Implementar la sala de audiencias y el estrado del juez.
- [ ] Posicionar a los participantes según sus roles.
- [ ] Añadir cámara con perspectiva adecuada y controles de visualización necesarios.
- [ ] Añadir estados o animaciones de hablar, escuchar y transición entre intervenciones.
- [ ] Manejar errores de carga de modelos 3D y ofrecer una alternativa visible cuando fallen.
- [ ] Mostrar nombre, rol y diálogo actual del personaje que interviene.
- [ ] Mostrar subtítulos e historial de intervenciones.
- [ ] Mostrar etapa procesal y progreso del juicio.
- [ ] Mostrar hechos y pruebas pertinentes del expediente.
- [ ] Permitir seleccionar opciones predefinidas y escribir respuestas libres.
- [ ] Mostrar estados de espera, error y reintento durante las llamadas al backend.
- [ ] Asegurar que la interfaz se mantenga usable aunque la escena 3D tarde en cargar o falle.

**Salida de la fase:** el usuario participa desde la sala 3D y puede seguir etapa, diálogo, pruebas e historial.

## Fase 8. Diálogos contextuales con Gemini

- [ ] Implementar `DialogueService` separado del análisis documental.
- [ ] Generar diálogos según expediente, análisis confirmado, rol, etapa, historial, decisiones y pruebas pertinentes.
- [ ] Hacer que Gemini proponga opciones y consecuencias únicamente dentro de los límites del motor.
- [ ] Validar y filtrar cada respuesta generada antes de mostrarla o aplicarla.
- [ ] Distinguir visualmente hechos documentados, argumentos de parte e hipótesis de simulación.
- [ ] Bloquear afirmaciones nuevas sobre pruebas, declaraciones, fechas o acontecimientos que no estén respaldadas.
- [ ] Mantener consistencia de cada personaje y contexto entre turnos.
- [ ] Mostrar errores comprensibles y permitir reintentar sin duplicar decisiones ya guardadas.

**Salida de la fase:** los diálogos son específicos del expediente y no pueden modificar hechos ni reglas.

## Fase 9. Voz y audio

- [ ] Implementar `TTSService` como componente separado del proveedor Gemini.
- [ ] Seleccionar un proveedor TTS y configurar sus credenciales exclusivamente en el backend.
- [ ] Asignar voz diferenciada y estable a cada personaje.
- [ ] Generar audio solo después de fijar el diálogo definitivo.
- [ ] Reproducir exactamente el texto visible en pantalla.
- [ ] Sincronizar reproducción con la animación de habla y mantener a los demás personajes en estado de escucha.
- [ ] Añadir subtítulos, control de volumen, silencio y opción para repetir la intervención.
- [ ] Mantener la simulación interactiva mientras se genera o reproduce el audio.
- [ ] Manejar errores de proveedor y permitir continuar leyendo el diálogo sin audio.

**Salida de la fase:** voz opcional sincronizada con el texto y la escena, sin bloquear el motor.

## Fase 10. Cierre, resolución e informe de evaluación

- [ ] Implementar `EvaluationService` con criterios definidos y verificables.
- [ ] Evaluar coherencia argumentativa, pertinencia de decisiones, uso de pruebas, reglas procesales y fidelidad a los hechos.
- [ ] No calcular la puntuación usando únicamente una valoración subjetiva de Gemini.
- [ ] Generar resolución judicial simulada al alcanzar una condición de cierre válida.
- [ ] Generar informe con resumen del expediente y de la simulación.
- [ ] Incluir decisiones, consecuencias, historial, pruebas utilizadas y etapas completadas.
- [ ] Incluir evaluación del desempeño y fidelidad respecto del expediente.
- [ ] Etiquetar claramente la resolución y el informe como simulación académica.
- [ ] Permitir consultar el resultado final sin perder el historial guardado.

**Salida de la fase:** una simulación concluida produce resolución académica e informe trazable.

## Fase 11. Verificación integral y documentación

- [ ] Añadir pruebas unitarias para extracción, validación, roles, transiciones, decisiones y fidelidad.
- [ ] Añadir pruebas de integración para carga, extracción, análisis, escenario, simulación y cierre.
- [ ] Verificar errores de archivos inválidos, OCR fallido, Gemini no disponible, TTS fallido y modelo GLB no cargado.
- [ ] Recorrer manualmente el flujo completo con un expediente de prueba autorizado.
- [ ] Confirmar que el expediente original y sus hechos no cambian durante la simulación.
- [ ] Confirmar que el historial y el estado se conservan después de cada intervención y al recargar la vista.
- [ ] Confirmar que no existen claves API en el frontend ni en el repositorio.
- [ ] Documentar variables de entorno, comandos de inicio, decisiones técnicas y límites conocidos.
- [ ] Presentar un diagnóstico final del alcance implementado y el resultado de la verificación.

**Salida de la fase:** recorrido completo verificado y documentación suficiente para ejecutar y continuar el proyecto.

## Criterio de aceptación final

- [ ] Abrir la aplicación y cargar un expediente PDF, DOCX o imagen.
- [ ] Extraer texto directamente u OCR, revisarlo y corregirlo.
- [ ] Analizar el expediente con Gemini y confirmar hechos, partes, roles, pruebas y etapas.
- [ ] Construir el escenario y seleccionar un rol disponible.
- [ ] Iniciar una sala de audiencias 3D con los modelos GLB disponibles.
- [ ] Avanzar por la simulación con opciones o respuestas libres y conservar el historial.
- [ ] Escuchar los diálogos o continuar con subtítulos si el audio no está disponible.
- [ ] Observar consecuencias sin alterar los hechos originales.
- [ ] Finalizar el juicio y obtener resolución e informe de evaluación.
- [ ] Confirmar que la resolución está identificada como simulación académica.

> El proyecto no se considera terminado si solo carga documentos, muestra modelos 3D o conversa con Gemini. Debe completar el flujo integrado desde el expediente hasta la evaluación, manteniendo fidelidad al documento.
