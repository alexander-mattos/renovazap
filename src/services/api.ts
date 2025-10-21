import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    // Handle unauthorized errors (401) by attempting refresh token
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        return axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
          .then((res) => {
            const { token, refreshToken: newRefresh } = res.data;
            localStorage.setItem('token', token);
            if (newRefresh) localStorage.setItem('refreshToken', newRefresh);
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return axios(originalRequest);
          })
          .catch((refreshErr) => {
            // If refresh fails, clear storage and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            return Promise.reject(refreshErr);
          });
      }
      // no refresh token -> logout
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;