// Konfigurasi API
export const API_CONFIG = {
  // Base URL untuk API
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  
  // Endpoint lengkap
  ENDPOINTS: {
    // Auth endpoints
    LOGIN: '/api/auth/login',
    ME: '/api/auth/me',
    CHANGE_PASSWORD: '/api/auth/change-password',
    
    // Orders endpoints
    ORDERS: '/api/orders',
    ORDER_DETAIL: (id: string | number) => `/api/orders/${id}`,
    
    // Settings endpoints
    SETTINGS: '/api/settings',
    SETTING_UPDATE: (key: string) => `/api/settings/${key}`,
    
    // Users endpoints
    USERS: '/api/users',
    USER_DETAIL: (id: string | number) => `/api/users/${id}`,
    USER_RESET_PASSWORD: (id: string | number) => `/api/users/${id}/reset-password`,
    
    // Machines endpoints
    MACHINES: '/api/machines',
    MACHINES_ALL: '/api/machines/all',
    MACHINE_DETAIL: (id: string | number) => `/api/machines/${id}`,
    
    // Dashboard endpoints
    DASHBOARD_STATS: '/api/dashboard/stats',
    
    // Reports endpoints
    REPORTS: '/api/reports',
    OPERATORS: '/api/operators',
    
    // Static files
    UPLOADS: '/uploads-pabrik-beras',
  }
};

// Helper function untuk membuat URL lengkap
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function untuk membuat URL dengan parameter
export const getApiUrlWithParams = (endpoint: string, params: Record<string, string>): string => {
  const url = new URL(`${API_CONFIG.BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.append(key, value);
  });
  return url.toString();
};
