import axios from 'axios';

// Use ngrok URL if available, fallback to localhost
const getBaseUrl = () => {
  // Check for various ways the ngrok URL might be provided
  // Priority: VITE_API_URL > VITE_NGROK_URL > localhost
  const ngrokUrl = import.meta.env.VITE_NGROK_URL;
  if (ngrokUrl) {
    return `${ngrokUrl}/api`;
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
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

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Dify chatbot API
export const sendChatMessage = async (query, inputs = {}) => {
  const response = await api.post('/chat/dify', { query, inputs });
  return response.data;
};

// Save a chat message
export const saveChatMessage = async (data) => {
  const response = await api.post('/chat', data);
  return response.data;
};

// Get chat history for a session
export const getChatHistory = async (sessionId) => {
  const response = await api.get(`/chat/${sessionId}`);
  return response.data;
};

// Get all chat sessions
export const getChatSessions = async () => {
  const response = await api.get('/chat/sessions/list');
  return response.data;
};

// Delete a chat session
export const deleteChatSession = async (sessionId) => {
  const response = await api.delete(`/chat/sessions/${sessionId}`);
  return response.data;
};

export default api;
