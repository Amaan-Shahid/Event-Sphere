import axios from 'axios';

const axiosClient = axios.create({
  baseURL: 'http://localhost:5000/api', // backend base
  withCredentials: false,
});

// Attach token if available
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('es_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosClient;
