import axios from 'axios';

const api = axios.create({
  baseURL: 'https://dealclose-ai.onrender.com/api', // Your live Render backend URL
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

export default api;