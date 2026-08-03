import axios from 'axios';

// Use the environment variable if deployed, otherwise fallback to local backend
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080/api';

const api = axios.create({
  baseURL: API_URL,
});

// Add a request interceptor to inject the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authAPI = {
  register: (name, email, password) => api.post('/auth/register', { name, email, password }),
  login: (username, password) => {
    const formData = new URLSearchParams();
    formData.append('username', username); // We use email here
    formData.append('password', password);
    return api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
};

export const chatAPI = {
  sendMessage: (msg, lat, lon) => api.post('/chat/chat', { msg, lat, lon }),
};

export const visionAPI = {
  detectConstellation: (file, lat, lon) => {
    const formData = new FormData();
    formData.append('file', file);
    if (lat !== null && lon !== null) {
      formData.append('lat', lat);
      formData.append('lon', lon);
    }
    return api.post('/vision/detect', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const paymentAPI = {
  createOrder: () => api.post('/payment/create-order'),
  verifyPayment: (data) => api.post('/payment/verify-payment', data),
};

export default api;
