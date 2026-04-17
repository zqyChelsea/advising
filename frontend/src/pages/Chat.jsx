import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { sendChatMessage, getChatHistory, saveChatMessage, deleteChatSession } from '../services/api';

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
  return (
    <div className="chat-markdown max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {normalized}
      </ReactMarkdown>
    </div>
  );
}

const SESSION_ID_KEY = 'advising_sessionId';
const CONVERSATION_ID_KEY = 'advising_conversationId';

const Chat = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(SESSION_ID_KEY) || null);
  const [conversationId, setConversationId] = useState(() => localStorage.getItem(CONVERSATION_ID_KEY) || null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (!user) return;

    const firstName = user.firstName || 'Student';
    const greeting = {
      id: 1,
      role: 'assistant',
      content: t('chat.greeting').replace('{name}', firstName),
      timestamp: new Date()
    };

    if (conversationId && sessionId) {
      setIsLoadingHistory(true);
      getChatHistory(sessionId)
        .then((history) => {
          if (history && history.length > 0) {
            setMessages(history.map((msg, idx) => ({
              id: idx + 1,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.createdAt)
            })));
            setTimeout(() => scrollToBottom('instant'), 50);
          } else {
            setMessages([greeting]);
          }
        })
        .catch(() => {
          setMessages([greeting]);
        })
        .finally(() => {
          setIsLoadingHistory(false);
        });
    } else {
      setMessages([greeting]);
    }
  }, [user, t]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const startNewSession = () => {
    const newSid = String(Date.now());
    localStorage.setItem(SESSION_ID_KEY, newSid);
    localStorage.setItem(CONVERSATION_ID_KEY, '');
    setSessionId(newSid);
    setConversationId(null);
    setMessages([]);
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

    const currentSessionId = sessionId || String(Date.now());
    if (!sessionId) {
      localStorage.setItem(SESSION_ID_KEY, currentSessionId);
      setSessionId(currentSessionId);
    }

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const data = await sendChatMessage(text, { conversationId: conversationId || undefined });

      const difyCid = data?.conversation_id;
      if (difyCid) {
        localStorage.setItem(CONVERSATION_ID_KEY, difyCid);
        setConversationId(difyCid);
      }

      const aiContent = data?.answer || data?.message || t('chat.errorResponse');

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: aiContent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      const sid = data?._sessionId || currentSessionId;
      await saveChatMessage({ sessionId: sid, role: 'user', content: text }).catch(() => {});
      await saveChatMessage({ sessionId: sid, role: 'assistant', content: aiContent }).catch(() => {});
    } catch (error) {
      console.error('Chat error:', error);
      const errorText = error?.response?.data?.message || error?.message || t('chat.errorService');

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: errorText,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action) => {
    setInput(action);
    setTimeout(() => handleSend(), 100);
  };

  return (
    <div className="h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] flex flex-col p-3 sm:p-4 gap-4 animate-slide-in">
      {/* Chat Section */}
      <section className="flex-1 min-h-0 bg-white rounded-2xl flex flex-col shadow-sm border border-[#F5F8FA] overflow-hidden">
        <header className="p-3 sm:p-5 border-b border-[#F2F4F2] flex items-center justify-between flex-shrink-0 bg-white/90 backdrop-blur">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#F2F4F2] rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
              <span className="iconify text-2xl sm:text-3xl" data-icon="flat-color-icons:assistant"></span>
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-[#2C3E50] text-base sm:text-lg truncate">{t('chat.title')}</h3>
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
              onClick={startNewSession}
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
          {isLoadingHistory && (
            <div className="flex justify-center py-4">
              <span className="iconify text-2xl text-[#6B8E7B] animate-spin" data-icon="solar:loading-bold"></span>
              <span className="ml-2 text-sm text-slate-500">{t('chat.loadingHistory')}</span>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 max-w-2xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center ${
                msg.role === 'assistant' ? 'bg-[#E8F0EB] text-[#6B8E7B]' : 'bg-slate-100 text-slate-500'
              }`}>
                <span className="iconify text-xl" data-icon={msg.role === 'assistant' ? 'solar:star-fall-2-bold-duotone' : 'solar:user-bold'}></span>
              </div>
              <div className={`${msg.role === 'user' ? 'bg-[#8EB19D] text-white' : 'bg-[#F5F8FA]'} p-4 rounded-2xl ${msg.role === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'} shadow-lg`}>
                {msg.role === 'assistant' ? (
                  <AssistantMessageBody content={msg.content} />
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-4 max-w-2xl">
              <div className="w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center bg-[#E8F0EB] text-[#6B8E7B]">
                <span className="iconify text-xl" data-icon="solar:star-fall-2-bold-duotone"></span>
              </div>
              <div className="bg-[#F5F8FA] p-4 rounded-2xl rounded-tl-none">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {!isLoadingHistory && messages.length <= 1 && (
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
