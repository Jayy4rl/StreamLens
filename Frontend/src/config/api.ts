/**
 * API Configuration
 *
 * Centralized configuration for backend API endpoints
 */

// Get API base URL from environment or default to localhost for development
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export const API_ENDPOINTS = {
  health: `${API_BASE_URL}/api/health`,
  schemas: `${API_BASE_URL}/api/schemas`,
  schemaById: (id: string) => `${API_BASE_URL}/api/schemas/${id}`,
  stats: `${API_BASE_URL}/api/stats`,
  publishers: `${API_BASE_URL}/api/publishers`,
} as const;
