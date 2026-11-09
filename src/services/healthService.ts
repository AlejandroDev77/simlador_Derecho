import { apiClient } from './apiClient'

export interface HealthStatus {
  status: string
  [key: string]: unknown
}

export const healthService = {
  check: () => apiClient.get<HealthStatus>('/health'),
}
