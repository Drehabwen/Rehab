const API_HOST = import.meta.env.VITE_API_HOST || 'localhost:8000';
const API_URL = import.meta.env.VITE_API_URL || `http://${API_HOST}`;
const WS_URL = import.meta.env.VITE_WS_URL || `ws://${API_HOST}/ws/analyze`;

export const config = {
  apiHost: API_HOST,
  apiUrl: API_URL,
  wsUrl: WS_URL,
  
  getApiUrl: (path: string) => `${API_URL}${path}`,
  getWsUrl: (path: string) => `ws://${API_HOST}${path}`,
} as const;

export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
