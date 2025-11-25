/**
 * API Service Layer
 * 
 * Handles all HTTP requests to the StreamLens backend API
 */

import axios, { AxiosError } from 'axios';
import { API_ENDPOINTS } from '../config/api';
import type { DataStream, PlatformStats, Publisher, ApiResponse } from '../types/schema';

// Create axios instance with default config
const api = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.error('API Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return Promise.reject(error);
  }
);

/**
 * Health check
 */
export const checkHealth = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.health);
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};

/**
 * Get all data streams with optional filters
 */
export const getDataStreams = async (params?: {
  sort?: 'popular' | 'recent';
  limit?: number;
  offset?: number;
  publisher?: string;
}): Promise<DataStream[]> => {
  try {
    const response = await api.get<ApiResponse<DataStream[]>>(
      API_ENDPOINTS.schemas,
      { params }
    );
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch data streams:', error);
    throw error;
  }
};

/**
 * Get a specific data stream by ID
 */
export const getDataStreamById = async (id: string): Promise<DataStream> => {
  try {
    const response = await api.get<ApiResponse<DataStream>>(
      API_ENDPOINTS.schemaById(id)
    );
    return response.data.data;
  } catch (error) {
    console.error(`Failed to fetch data stream ${id}:`, error);
    throw error;
  }
};

/**
 * Get platform statistics
 */
export const getPlatformStats = async (): Promise<PlatformStats> => {
  try {
    const response = await api.get<ApiResponse<PlatformStats>>(
      API_ENDPOINTS.stats
    );
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch platform stats:', error);
    throw error;
  }
};

/**
 * Get list of publishers
 */
export const getPublishers = async (params?: {
  limit?: number;
  offset?: number;
}): Promise<Publisher[]> => {
  try {
    const response = await api.get<ApiResponse<Publisher[]>>(
      API_ENDPOINTS.publishers,
      { params }
    );
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch publishers:', error);
    throw error;
  }
};

/**
 * Get recent activity
 */
export const getActivity = async (params?: {
  limit?: number;
  timeRange?: '24H' | '7D' | '30D' | 'ALL';
}): Promise<Activity[]> => {
  try {
    const response = await api.get<ApiResponse<Activity[]>>(
      API_ENDPOINTS.activity,
      { params }
    );
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch activity:', error);
    throw error;
  }
};

/**
 * Get activity chart data
 */
export const getActivityChart = async (params?: {
  timeRange?: '24H' | '7D' | '30D';
}): Promise<ChartDataPoint[]> => {
  try {
    const response = await api.get<ApiResponse<ChartDataPoint[]>>(
      API_ENDPOINTS.activityChart,
      { params }
    );
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch activity chart:', error);
    throw error;
  }
};

// Types for activity
export interface Activity {
  id: string;
  type: 'REGISTER' | 'UPDATE' | 'USE';
  schemaName: string;
  schemaId: string;
  publisher: string;
  blockNumber: string;
  timestamp: number;
  transactionHash: string;
}

export interface ChartDataPoint {
  timestamp: number;
  count: number;
}
