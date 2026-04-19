import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useChat } from '../contexts/ChatContext';
import { sendChatMessageStream } from '../services/api';

const markdownComponents = {
  p: ({ children }) => <p className="mb-3 last:mb-0 text-sm leading-relaxed text-slate-700">{children}</p>,
  ul: ({ children }) => (
    <ul className="my-3 ml-1 list-disc space-y-1.5 pl-5 text-sm text-slate-700 marker:text-[#6B8E7B]">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 ml-1 list-decimal space-y-1.5 pl-5 text-sm text-slate-700 marker:font-semibold marker:text-[#6B8E7B]">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed pl-0.5">{children}</li>,
  strong: ({ children }) => <strong className="font-bold text-slate-800">{children}</strong>,
  em: ({ children }) => <em className="italic text-slate-700">{children}</em>,
  h1: ({ children }) => <h3 className="mb-2 mt-4 first:mt-0 text-base font-bold text-slate-800">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-2 mt-4 first:mt-0 text-base font-bold text-slate-800">{children}</h3>,
  h3: ({ children }) => <h4 className="mb-2 mt-3 first:mt-0 text-sm font-bold text-slate-800">{children}</h4>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-4 border-[#8EB19D]/60 bg-slate-50/80 py-2 pl-3 text-sm text-slate-600">{children}</blockquote>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <pre className="my-3 overflow-x-auto rounded-lg bg-slate-800 p-3 text-xs text-slate-100">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      );
    }
    return (
      <code className="rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-xs text-slate-800" {...props}>
        {children}
      </code>
    );
  },
  a: ({ href, children }) => (
    <a href={href} className="font-medium text-[#6B8E7B] underline decoration-[#6B8E7B]/40 underline-offset-2 hover:text-[#5A7A69]" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  hr: () => <hr className="my-4 border-slate-200" />
};

function normalizeAssistantMarkdown(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/([:：])\s*-\s/g, '$1\n\n- ')
    .replace(/([.!?])\s+-\s/g, '$1\n\n- ');
}

function AssistantMessageBody({ content }) {
  const normalized = normalizeAssistantMarkdown(content);

  if (!normalized || normalized.trim() === '') {
    return (
      <div className="text-slate-400 italic">No response content</div>
    );
  }

  return (
    <div className="chat-markdown max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {normalized}
      </ReactMarkdown>
    </div>
  );
}

const STORAGE_KEY = 'advising_chat_conversation';

const Chat = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const {
    currentMessages,
    setCurrentMessages,
    currentSession,
    setCurrentSession,
    selectSession,
    loadSessions,
    refreshSessions,
    isLoading,
    updateSessionTitle
  } = useChat();

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Load conversation on mount
  useEffect(() => {
    if (!user || hasInitialized) return;

    const loadConversation = async () => {
      // Load all sessions
      await loadSessions();

      // Get stored conversation ID from localStorage
      const storedConversationId = localStorage.getItem(STORAGE_KEY);

      if (storedConversationId) {
        // Try to restore the stored conversation
        await selectSession({ _id: storedConversationId });
      }
      // else: If no stored session, just show greeting (empty messages)

      setHasInitialized(true);
    };

    loadConversation();
  }, [user, hasInitialized, loadSessions, selectSession]);

  // Sync session changes to local state
  useEffect(() => {
    if (currentSession?._id) {
      setConversationId(currentSession._id);
      localStorage.setItem(STORAGE_KEY, currentSession._id);
    }
  }, [currentSession?._id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (currentMessages.length > 0) {
      scrollToBottom();
    }
  }, [currentMessages]);

  // Start renaming session
  const handleStartRename = () => {
    if (currentSession?._id) {
      setNewTitle(currentSession.title || '');
      setIsRenaming(true);
    }
  };

  // Save renamed title
  const handleSaveRename = async () => {
    if (newTitle.trim() && currentSession?._id) {
      try {
        await updateSessionTitle(currentSession._id, newTitle.trim());
      } catch (error) {
        console.error('Failed to rename session:', error);
      }
    }
    setIsRenaming(false);
    setNewTitle('');
  };

  // Cancel renaming
  const handleCancelRename = () => {
    setIsRenaming(false);
    setNewTitle('');
  };

  const handleNewChat = () => {
    // Clear localStorage for current conversation
    localStorage.removeItem(STORAGE_KEY);
    setCurrentSession(null);
    setCurrentMessages([]);
    setConversationId(null);
    // The greeting will be shown when currentMessages is empty
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const text = input.trim();
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    // Immediately update messages
    setCurrentMessages(prev => [...prev, userMessage]);
    setInput('');

    // 构建 Dify 所需的 inputs（用户档案信息）
    const inputs = {
      student_id: user?.studentId || '',
      email: user?.email || '',
      first_name: user?.firstName || '',
      family_name: user?.familyName || '',
      entry_year: user?.entryYear || new Date().getFullYear(),
      expected_graduation: user?.expectedGraduation || '',
      department: user?.department || '',
      major: user?.major || '',
      gpa: user?.gpa || 0,
      total_credits: user?.totalCredits || 0
    };

    // Create placeholder for streaming AI message
    const aiMessageId = Date.now() + 1;
    const aiMessage = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };

    setCurrentMessages(prev => [...prev, aiMessage]);
    setIsTyping(true);

    // Refresh sessions list to show the conversation in history
    // even if it's still in progress
    refreshSessions();

    try {
      await sendChatMessageStream(
        text,
        inputs,
        { conversationId: conversationId || undefined },
        {
          onMessage: (chunk, difyCid, eventType) => {
            // Handle session_created event
            if (eventType === 'session_created' && chunk) {
              const sessionId = chunk;
              if (sessionId && sessionId !== conversationId) {
                setConversationId(sessionId);
                localStorage.setItem(STORAGE_KEY, sessionId);
                setCurrentSession({ _id: sessionId });
              }
              return;
            }
            // Update conversation ID if received
            if (difyCid && difyCid !== conversationId) {
              setConversationId(difyCid);
              localStorage.setItem(STORAGE_KEY, difyCid);
              // Update session in context
              setCurrentSession({ _id: difyCid });
            }
            // Append chunk to message content
            setCurrentMessages(prev => prev.map(msg =>
              msg.id === aiMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg
            ));
          },
          onDone: (finalConversationId) => {
            if (finalConversationId && finalConversationId !== conversationId) {
              setConversationId(finalConversationId);
              localStorage.setItem(STORAGE_KEY, finalConversationId);
              setCurrentSession({ _id: finalConversationId });
            }
            // Refresh sessions list to ensure the new session appears
            refreshSessions();
            setIsTyping(false);
          },
          onError: (error) => {
            console.error('Chat error:', error);
            const errorText = error?.message || t('chat.errorService');
            setCurrentMessages(prev => prev.map(msg =>
              msg.id === aiMessageId
                ? { ...msg, content: errorText }
                : msg
            ));
            setIsTyping(false);
          }
        }
      );
    } catch (error) {
      console.error('Chat error:', error);
      const errorText = error?.response?.data?.message || error?.message || t('chat.errorService');
      setCurrentMessages(prev => prev.map(msg =>
        msg.id === aiMessageId
          ? { ...msg, content: errorText }
          : msg
      ));
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action) => {
    setInput(action);
    setTimeout(() => handleSend(), 100);
  };

  // Determine if we should show greeting
  const showGreeting = currentMessages.length === 0;
  const greetingMessage = showGreeting ? {
    id: 'greeting',
    role: 'assistant',
    content: t('chat.greeting').replace('{name}', user?.firstName || 'Student'),
    timestamp: new Date()
  } : null;

  return (
    <div className="h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] flex flex-col p-3 sm:p-4 gap-4 animate-slide-in">
      {/* Chat Section */}
      <section className="flex-1 min-h-0 bg-white rounded-2xl flex flex-col shadow-sm border border-[#F5F8FA] overflow-hidden">
        <header className="p-3 sm:p-5 border-b border-[#F2F4F2] flex items-center justify-between flex-shrink-0 bg-white/90 backdrop-blur">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#F2F4F2] rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
              <span className="iconify text-2xl sm:text-3xl" data-icon="flat-color-icons:assistant"></span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-[#2C3E50] text-base sm:text-lg truncate">
                {isRenaming ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename();
                        if (e.key === 'Escape') handleCancelRename();
                      }}
                      className="px-2 py-1 text-sm border border-[#8EB19D] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8EB19D]/50 w-40 sm:w-64"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveRename}
                      className="p-1 text-[#6B8E7B] hover:text-[#5A7A69]"
                    >
                      <span className="iconify text-lg" data-icon="solar:check-circle-bold"></span>
                    </button>
                    <button
                      onClick={handleCancelRename}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      <span className="iconify text-lg" data-icon="solar:close-circle-bold"></span>
                    </button>
                  </div>
                ) : conversationId ? (
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[150px] sm:max-w-[200px]">
                      {currentSession?.title || t('chat.newSession')}
                    </span>
                    <button
                      onClick={handleStartRename}
                      className="p-1 text-slate-400 hover:text-[#6B8E7B] flex-shrink-0"
                      title="Rename session"
                    >
                      <span className="iconify text-base" data-icon="solar:pen-bold"></span>
                    </button>
                  </div>
                ) : (
                  t('chat.title')
                )}
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#6BC4A6] rounded-full animate-pulse flex-shrink-0"></span>
                <span className="text-[10px] sm:text-xs text-[#95A5A6] font-medium truncate">
                  {conversationId ? t('chat.historyLoaded') : t('chat.newSession')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={handleNewChat}
              className="hidden sm:flex px-3 sm:px-5 py-2 sm:py-2.5 bg-[#F5F8FA] text-[#6B8E7B] rounded-xl text-xs sm:text-sm font-bold items-center gap-2 hover:bg-[#E8F0EB] transition-all border border-[#6B8E7B]/10"
            >
              <span className="iconify" data-icon="flat-color-icons:plus"></span>
              <span className="hidden md:inline">{t('chat.newChat')}</span>
            </button>
            <button className="px-3 sm:px-5 py-2 sm:py-2.5 bg-[#6B8E7B] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 hover:bg-[#5A7A69] shadow-md transition-all">
              <span className="iconify" data-icon="flat-color-icons:template"></span>
              <span className="hidden sm:inline">{t('chat.reportIssues')}</span>
            </button>
          </div>
        </header>

        {/* Messages area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 hide-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <div className="flex gap-1 mb-2">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              </div>
              <span className="text-sm">Loading conversation...</span>
            </div>
          ) : (
            <>
              {greetingMessage && (
                <div className="flex gap-4 max-w-2xl">
                  <div className="w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center bg-[#E8F0EB] text-[#6B8E7B]">
                    <span className="iconify text-xl" data-icon="solar:star-fall-2-bold-duotone"></span>
                  </div>
                  <div className="bg-[#F5F8FA] p-4 rounded-2xl rounded-tl-none shadow-lg">
                    <AssistantMessageBody content={greetingMessage.content} />
                  </div>
                </div>
              )}
              {currentMessages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 max-w-2xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                  <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center ${
                    msg.role === 'assistant' ? 'bg-[#E8F0EB] text-[#6B8E7B]' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <span className="iconify text-xl" data-icon={msg.role === 'assistant' ? 'solar:star-fall-2-bold-duotone' : 'solar:user-bold'}></span>
                  </div>
                  <div className={`${msg.role === 'user' ? 'bg-[#8EB19D] text-white' : 'bg-[#F5F8FA]'} p-4 rounded-2xl ${msg.role === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'} shadow-lg`}>
                    {msg.role === 'assistant' ? (
                      isTyping && !msg.content ? (
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                        </div>
                      ) : (
                        <AssistantMessageBody content={msg.content} />
                      )
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {currentMessages.length === 0 && (
          <div className="px-6 pb-4 flex-shrink-0">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => handleQuickAction('Graduation Gap Check')} className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-600 hover:border-[#8EB19D] hover:text-[#6B8E7B] transition-all">{t('chat.quickGraduationGap')}</button>
              <button onClick={() => handleQuickAction('WIE Application')} className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-600 hover:border-[#8EB19D] hover:text-[#6B8E7B] transition-all">{t('chat.quickWIE')}</button>
              <button onClick={() => handleQuickAction('Subject Choice Advice')} className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-600 hover:border-[#8EB19D] hover:text-[#6B8E7B] transition-all">{t('chat.quickSubjectChoice')}</button>
            </div>
          </div>
        )}

        {/* Input */}
        <footer className="p-3 sm:p-4 bg-white border-t border-slate-100 flex-shrink-0">
          <div className="max-w-4xl mx-auto relative">
            <input
              className="w-full bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 pr-24 sm:pr-32 focus:outline-none focus:ring-2 focus:ring-[#8EB19D]/20 focus:border-[#8EB19D] transition-all text-sm"
              placeholder={t('chat.placeholder')}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            />
            <div className="absolute right-2 top-1.5 sm:top-2 flex gap-1">
              <button className="p-2 sm:p-2.5 text-slate-400 hover:text-[#6B8E7B] hover:bg-white rounded-xl">
                <span className="iconify text-xl sm:text-2xl" data-icon="solar:attachment-bold"></span>
              </button>
              <button
                className="bg-[#6B8E7B] text-white p-2 sm:p-2.5 rounded-xl hover:bg-[#5A7A69] shadow-md transition-all flex items-center justify-center"
                onClick={handleSend}
                aria-label={t('chat.send')}
              >
                <span className="iconify text-xl sm:text-2xl" data-icon="solar:arrow-right-bold"></span>
              </button>
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
};

export default Chat;
