# Simulador Judicial Interactivo con IA Forense y Sala 3D

Plataforma integral de simulación judicial interactiva para formación jurídica práctica. Permite a estudiantes y docentes de Derecho cargar expedientes reales o hipotéticos en formatos PDF, DOCX o TXT, analizarlos de forma estructurada con modelos de lenguaje avanzados (OpenAI), asumir roles procesales (Juez, Fiscal, Abogado Acusador, Abogado Defensor) y participar en una audiencia oral en una sala de juicios 3D inmersiva con control estricto de fidelidad al expediente y dictamen académico final.

---

## 🏛️ Características Principales

1. **Ingesta y Extracción Documental (Fases 2 y 3):**
   - Soporte para expedientes en formato PDF, Word (DOCX) y Texto Plano (TXT).
   - Trazabilidad página por página de cada hecho o elemento procesal.
   - Revisión y edición previa del texto extraído antes de su envío a análisis.

2. **Análisis Jurídico Estructurado con OpenAI (Fase 4):**
   - Extracción de hechos probados y documentados con referencia al folio/página.
   - Catálogo de pruebas admitidas (documental, pericial, testifical, material).
   - Identificación de partes, representantes letrados y autoridades judiciales.
   - Principio de estricta fidelidad: no inventa hechos ni identidades no obrantes en autos.

3. **Selección de Roles y Construcción del Escenario (Fase 5):**
   - El usuario puede elegir su rol en sala:
     - Abogado de la Acusación / Demandante.
     - Abogado de la Defensa / Demandado.
     - Juez Presidente del Tribunal.
     - Ministerio Fiscal.
   - Los roles restantes son asumidos dinámicamente por la IA respetando su postura forense.

4. **Sala de Audiencias 3D Inmersiva (Fase 7):**
   - Renderizada en Three.js con estrado judicial, mesas de debate procesal, estrados y bancos de audiencia.
   - Avatares 3D basados en modelos GLB (`juez1.glb`, `persona1.glb`, `per2.glb`).
   - Controles de cámara orbital (rotación, zoom e inclinación).
   - Animación de gesticulación sincronizada con el turno del orador activo.

5. **Dinámica Procesal y Fidelidad Forense (Fase 6 y 8):**
   - Opciones tácticas con niveles de riesgo procesal (Bajo, Medio, Alto).
   - Entrada de texto libre para formular alegatos o preguntas orales directas.
   - Filtro de fidelidad: detecta si el usuario alega hechos no existentes en el expediente y genera consecuencias procesales.
   - Sistema de objeciones forenses en tiempo real (preguntas capciosas, hechos no probados, impertinencia).

6. **Audio y Síntesis de Voz (Fase 9):**
   - Audio forense con golpe de mazo judicial sintetizado mediante Web Audio API.
   - Síntesis de voz en español mediante Web Speech API.
   - Subtítulos dinámicos de cada intervención.

7. **Sentencia y Evaluación Pedagógica (Fase 10):**
   - Veredicto simulado y fundamentación jurídica basada en lo actuado en sala.
   - Rúbrica pedagógica: Coherencia Argumentativa, Fidelidad al Expediente y Manejo de Pruebas (0-100).
   - Identificación de fortalezas y recomendaciones de técnica de litigación oral.
   - Impresión directa y exportación a PDF.
   - Aviso obligatorio de simulación con fines puramente académicos.

---

## 🛠️ Requisitos Previos

- **Node.js** >= 18.x
- **Python** >= 3.10
- **Clave API de OpenAI** con acceso a modelos GPT-4o / GPT-4o-mini.

---

## 🚀 Puesta en Marcha

### 1. Configuración del Backend

1. Accede al directorio `backend/`:
   ```bash
   cd backend
   ```

2. Crea y activa un entorno virtual de Python:
   ```bash
   python -m venv .venv
   # En Windows:
   .venv\Scripts\activate
   # En macOS/Linux:
   source .venv/bin/activate
   ```

3. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```

4. Configura el archivo `backend/.env`:
   ```env
   OPENAI_API_KEY=tu-clave-secreta-de-openai
   DATABASE_URL=sqlite:///./simulador.db
   ENVIRONMENT=development
   PORT=8001
   ```

5. Inicia el servidor de desarrollo:
   ```bash
   uvicorn main:app --host 127.0.0.1 --port 8001 --reload
   ```
   > **Nota de puerto:** El backend opera en el puerto `8001`. La documentación interactiva de la API está disponible en `http://localhost:8001/docs`.

---

### 2. Configuración del Frontend

1. Accede al directorio `frontend/`:
   ```bash
   cd frontend
   ```

2. Instala las dependencias de Node:
   ```bash
   npm install
   ```

3. Verifica el archivo `frontend/.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:8001
   ```

4. Inicia el servidor de desarrollo Vite:
   ```bash
   npm run dev
   ```
   Abre tu navegador en `http://localhost:5173`.

---

## 🧪 Pruebas Automatizadas

Para ejecutar la suite de pruebas integral del flujo completo (carga $\rightarrow$ análisis con OpenAI $\rightarrow$ inicio de sala 3D $\rightarrow$ réplica del usuario $\rightarrow$ objeción procesal $\rightarrow$ sentencia y evaluación pedagógica):

```bash
cd backend
.venv\Scripts\python.exe test_flow.py
```

Para verificar la compilación de producción del frontend:

```bash
cd frontend
npm run build
```

---

## ⚖️ Aviso Legal y Académico

Este software es un entorno de simulación diseñado exclusivamente para fines docentes y de entrenamiento pedagógico en litigación oral. Las resoluciones, valoraciones y argumentos generados por los modelos de inteligencia artificial no constituyen asesoramiento jurídico vinculante ni tienen valor procesal ante ningún órgano judicial real.
