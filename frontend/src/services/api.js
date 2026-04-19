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

// Dify chatbot API (blocking mode)
export const sendChatMessage = async (query, inputs = {}, options = {}) => {
  const { conversationId } = options;
  const response = await api.post('/chat/dify', { query, inputs, conversationId });
  return response.data;
};

// Dify chatbot API (streaming mode)
export const sendChatMessageStream = async (query, inputs = {}, options = {}, callbacks = {}) => {
  const { conversationId } = options;
  const { onMessage, onDone, onError } = callbacks;

  const token = localStorage.getItem('token');
  const baseURL = getBaseUrl().replace('/api', '');
  const url = `${baseURL}/api/chat/dify`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({ query, inputs, conversationId, streaming: true })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Chat service error');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let conversationIdResult = conversationId || '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          try {
            const data = JSON.parse(dataStr);

            if (data.event === 'session_created') {
              // Handle session created event - pass session_id to onMessage
              onMessage?.(data.session_id, null, 'session_created');
            } else if (data.event === 'message' || data.event === 'agent_message') {
              if (data.answer) {
                onMessage?.(data.answer, data.conversation_id);
              }
              if (data.conversation_id) {
                conversationIdResult = data.conversation_id;
              }
            } else if (data.event === 'message_end' || data.event === 'done') {
              onDone?.(conversationIdResult);
            }
          } catch (parseError) {
            // Ignore malformed JSON
          }
        }
      }
    }

    return { conversation_id: conversationIdResult };
  } catch (error) {
    onError?.(error);
    throw error;
  }
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

// Update chat session title
export const updateChatSessionTitle = async (sessionId, title) => {
  const response = await api.patch(`/chat/sessions/${sessionId}`, { title });
  return response.data;
};

export default api;
