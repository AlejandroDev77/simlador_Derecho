import { useState } from 'react'
import { ApiError } from './services/apiClient'
import { healthService, type HealthStatus } from './services/healthService'

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function checkConnection() {
    setLoading(true)
    setError(null)
    setHealth(null)

    try {
      setHealth(await healthService.check())
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? `FastAPI respondió con error ${reason.status}.`
          : 'No se pudo conectar. Revisa que FastAPI esté ejecutándose y que la URL sea correcta.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-canvas)] px-5 py-12 text-[var(--color-ink)] sm:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="space-y-3">
          <p className="text-sm font-semibold tracking-[0.18em] text-[var(--color-accent)] uppercase">
            Starter stack
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">React + FastAPI</h1>
          <p className="max-w-xl text-base leading-7 text-[var(--color-muted)]">
            React con TypeScript y Tailwind CSS, listo para consumir endpoints de FastAPI.
          </p>
        </header>

        <section className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-sm sm:p-8" aria-labelledby="api-title">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="api-title" className="text-lg font-semibold">Conexión con la API</h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Prueba el endpoint <code className="rounded bg-[var(--color-code)] px-1.5 py-0.5 font-mono text-xs">GET /health</code>
              </p>
            </div>
            <button
              type="button"
              onClick={checkConnection}
              disabled={loading}
              className="min-h-11 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? 'Conectando…' : 'Probar conexión'}
            </button>
          </div>

          <div className="mt-5 min-h-12 rounded-lg bg-[var(--color-code)] px-4 py-3 text-sm" aria-live="polite">
            {health && <p className="text-emerald-800">Conectado · {JSON.stringify(health)}</p>}
            {error && <p className="text-rose-700">{error}</p>}
            {!health && !error && !loading && <p className="text-[var(--color-muted)]">La conexión todavía no se ha probado.</p>}
            {loading && <p className="text-[var(--color-muted)]">Consultando FastAPI…</p>}
          </div>
        </section>

        <p className="text-sm text-[var(--color-muted)]">
          Cambia la URL de la API en <code className="font-mono">.env</code>. El cliente y los servicios están en <code className="font-mono">src/services</code>.
        </p>
      </div>
    </main>
  )
}

export default App
