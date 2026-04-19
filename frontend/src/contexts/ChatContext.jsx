import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getChatSessions, getChatHistory, deleteChatSession, updateChatSessionTitle } from '../services/api';

const ChatContext = createContext(null);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [currentMessages, setCurrentMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load all sessions when user changes
  const loadSessions = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getChatSessions();
      setSessions(data || []);
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
      setSessions([]);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadSessions();
    } else {
      setSessions([]);
      setCurrentSession(null);
      setCurrentMessages([]);
    }
  }, [user, loadSessions]);

  // Load messages for a specific session
  const loadSessionMessages = useCallback(async (sessionId) => {
    if (!sessionId || !user) return [];
    setIsLoading(true);
    try {
      const messages = await getChatHistory(sessionId);
      const loadedMessages = (messages || []).map((msg, idx) => ({
        id: idx + 1,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.createdAt),
        dbId: msg._id
      }));
      setCurrentMessages(loadedMessages);
      return loadedMessages;
    } catch (error) {
      console.error('Failed to load session messages:', error);
      setCurrentMessages([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Select a session
  const selectSession = useCallback(async (session) => {
    if (session?._id === currentSession?._id && currentMessages.length > 0) {
      // Already on this session, don't reload
      return true;
    }

    setCurrentSession(session);
    if (session?._id) {
      await loadSessionMessages(session._id);
      return true;
    } else {
      setCurrentMessages([]);
      return true;
    }
  }, [loadSessionMessages, currentSession, currentMessages]);

  // Delete a session
  const removeSession = useCallback(async (sessionId) => {
    try {
      await deleteChatSession(sessionId);
      setSessions(prev => prev.filter(s => s._id !== sessionId));
      if (currentSession?._id === sessionId) {
        setCurrentSession(null);
        setCurrentMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }, [currentSession]);

  // Start a new session
  const startNewSession = useCallback(() => {
    setCurrentSession(null);
    setCurrentMessages([]);
  }, []);

  // Add a message to current session
  const addMessage = useCallback((message) => {
    setCurrentMessages(prev => [...prev, message]);
  }, []);

  // Update sessions list after sending a message (when a new session is created)
  const refreshSessions = useCallback(async () => {
    await loadSessions();
  }, [loadSessions]);

  // Update session title
  const updateSessionTitle = useCallback(async (sessionId, newTitle) => {
    try {
      await updateChatSessionTitle(sessionId, newTitle);
      // Update sessions list
      setSessions(prev => prev.map(s =>
        s._id === sessionId ? { ...s, title: newTitle } : s
      ));
      // Update current session if it's the one being renamed
      if (currentSession?._id === sessionId) {
        setCurrentSession(prev => prev ? { ...prev, title: newTitle } : prev);
      }
    } catch (error) {
      console.error('Failed to update session title:', error);
      throw error;
    }
  }, [currentSession]);

  const value = {
    sessions,
    currentSession,
    currentMessages,
    isLoading,
    loadSessions,
    selectSession,
    setCurrentSession,
    removeSession,
    startNewSession,
    addMessage,
    refreshSessions,
    setCurrentMessages,
    updateSessionTitle
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext;
