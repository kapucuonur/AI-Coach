import axios from 'axios';

const client = axios.create({
    baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api', // Backend URL
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add JWT token
client.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle token expiration
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('access_token');
        }
        return Promise.reject(error);
    }
);

export default client;
