const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = (rawBaseUrl && !rawBaseUrl.includes(':8000') ? rawBaseUrl : 'http://localhost:8001').replace(/\/$/, '');

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | object | null
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const isFormData = options.body instanceof FormData
  let body: BodyInit | null | undefined

  if (options.body && typeof options.body === 'object' && !isFormData) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(options.body)
  } else {
    body = options.body as BodyInit | null | undefined
  }

  const response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    ...options,
    headers,
    body,
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new ApiError(detail || `La API respondió con ${response.status}`, response.status)
  }

  if (response.status === 204) return undefined as T

  return response.json() as Promise<T>
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T, TBody = unknown>(path: string, body?: TBody, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body: body as RequestOptions['body'] }),
  put: <T, TBody = unknown>(path: string, body?: TBody, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PUT', body: body as RequestOptions['body'] }),
  patch: <T, TBody = unknown>(path: string, body?: TBody, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body: body as RequestOptions['body'] }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}
