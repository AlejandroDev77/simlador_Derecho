# simlador_Derecho

Starter de React + FastAPI para el simulador de Derecho.

Frontend starter con React, TypeScript, Vite y Tailwind CSS. La capa HTTP y los servicios viven en `src/services`.

## Empezar

```bash
npm install
npm run dev
```

En otra terminal, levanta el backend:

```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
fastapi dev main.py
```

La documentación interactiva de la API queda disponible en `http://localhost:8000/docs`.

Configura la dirección de FastAPI en `.env` (puedes copiar `.env.example`):

```env
VITE_API_BASE_URL=http://localhost:8000
```

El botón de la página consulta `GET /health`. Para añadir llamadas, usa `apiClient` desde un servicio de dominio en `src/services`.

El backend incluye `CORSMiddleware` para los orígenes locales de Vite (`localhost` y `127.0.0.1` en el puerto `5173`). Actualiza esa lista si cambias el host o puerto del frontend.
