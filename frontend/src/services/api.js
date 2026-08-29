import axios from 'axios';

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.DEV) return 'http://localhost:5000/api';
  return '/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
});

// Request interceptor for API calls to attach JWT token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 Unauthorized globally without breaking public or mobile routes
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      const currentPath = window.location.pathname;
      const isPublicOrMobile = 
        currentPath === '/login' || 
        currentPath === '/register' || 
        currentPath === '/' || 
        currentPath.startsWith('/mobile') || 
        currentPath.startsWith('/app') || 
        currentPath.startsWith('/card') || 
        currentPath.startsWith('/digital-card');

      if (!isPublicOrMobile) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
