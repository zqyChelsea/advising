import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useChat } from '../../contexts/ChatContext';
import { useState, useRef, useEffect } from 'react';

const Sidebar = () => {
  const { user } = useAuth();
  const { t, language, setLanguage, languageNames } = useLanguage();
  const { sessions, currentSession, selectSession, removeSession, startNewSession, loadSessions } = useChat();
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const historyRef = useRef(null);
  const navigate = useNavigate();

  // Close history panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (historyRef.current && !historyRef.current.contains(event.target)) {
        setShowChatHistory(false);
      }
    };
    if (showChatHistory) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showChatHistory]);

  // Load sessions when component mounts
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const navItems = [
    { path: '/chat', icon: 'solar:chat-round-dots-bold-duotone', labelKey: 'nav.chat', hasSubMenu: true },
    { path: '/profile', icon: 'solar:user-circle-bold-duotone', labelKey: 'nav.profile' },
    { path: '/tickets', icon: 'solar:ticket-bold-duotone', labelKey: 'nav.tickets' },
    { path: '/resources', icon: 'solar:library-bold-duotone', labelKey: 'nav.resources' },
  ];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t('chat.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('chat.yesterday');
    } else {
      return date.toLocaleDateString(language === 'zh-CN' ? 'zh-CN' : language === 'zh-TW' ? 'zh-TW' : 'en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const truncateText = (text, maxLength = 40) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleSessionClick = (session) => {
    selectSession(session);
    setShowChatHistory(false);
  };

  const handleNewChat = () => {
    startNewSession();
    localStorage.removeItem('advising_chat_conversation');
    setShowChatHistory(false);
    navigate('/chat');
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    setDeletingId(sessionId);
    try {
      await removeSession(sessionId);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleChatHistory = () => {
    setShowChatHistory(!showChatHistory);
  };

  const handleChatNavClick = (e) => {
    // Check if we're already on the chat page
    const isOnChatPage = window.location.pathname === '/chat';
    if (isOnChatPage) {
      e.preventDefault();
      toggleChatHistory();
    } else {
      // Navigate to chat page, the chat history will show based on current state
      setShowChatHistory(true);
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden lg:flex w-72 h-full bg-[#8EB19D] rounded-3xl shadow-lg border border-[#7B9D8A] flex-col items-stretch py-8 transition-all duration-300">
        {/* Logo Section */}
        <div className="px-6 mb-6 flex items-center gap-3 border-b border-[#A7C4B5] pb-6">
          <div className="w-10 h-10 bg-[#FFFFFF] rounded-xl flex items-center justify-center text-[#8EB19D]">
            <span className="iconify text-2xl" data-icon="flat-color-icons:graduation-cap"></span>
          </div>
          <h1 className="font-bold text-lg leading-tight text-white">
            PolyU Advising + Wellness
          </h1>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-3 space-y-1 overflow-y-auto hide-scrollbar">
          <div className="nav-group mb-4">
            {navItems.map(item => {
              // Special handling for Chat item with submenu
              if (item.hasSubMenu) {
                return (
                  <div key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={handleChatNavClick}
                      className={({ isActive }) =>
                        `group flex items-center gap-4 w-full px-4 py-3 rounded-xl transition-all font-medium ${
                          isActive ? 'bg-white/20 text-white' : 'text-white hover:bg-white/5'
                        }`
                      }
                    >
                      <span className="iconify text-2xl" data-icon={item.icon}></span>
                      <span>{t(item.labelKey)}</span>
                      <span className={`ml-auto transition-transform duration-200 ${showChatHistory ? 'rotate-90' : ''}`}>
                        <span className="iconify text-lg" data-icon="solar:alt-arrow-right-bold"></span>
                      </span>
                    </NavLink>

                    {/* Chat History Submenu - Slides down when expanded */}
                    <div
                      ref={historyRef}
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        showChatHistory ? 'max-h-[300px] opacity-100 ml-2' : 'max-h-0 opacity-0 ml-2'
                      }`}
                    >
                      <div className="space-y-1 mt-1">
                        {/* New Chat Button */}
                        <button
                          onClick={handleNewChat}
                          className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all text-sm ${
                            !currentSession ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span className="iconify text-lg" data-icon="solar:pen-new-square-bold-duotone"></span>
                          <span>{t('chat.startNewChat')}</span>
                        </button>

                        {/* Session List */}
                        {sessions.length > 0 ? (
                          sessions.map((session) => (
                            <div
                              key={session._id}
                              onClick={() => handleSessionClick(session)}
                              className={`relative group w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all cursor-pointer text-sm ${
                                currentSession?._id === session._id ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              <span className="iconify text-lg flex-shrink-0" data-icon="solar:chat-round-dots-bold-duotone"></span>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="font-medium truncate">{truncateText(session.title || session.firstUserMessage)}</p>
                                <p className="text-xs opacity-60">{formatDate(session.createdAt)}</p>
                              </div>
                              <button
                                onClick={(e) => handleDeleteSession(e, session._id)}
                                disabled={deletingId === session._id}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/20 transition-all flex-shrink-0"
                                title={t('chat.deleteConversation')}
                              >
                                {deletingId === session._id ? (
                                  <span className="iconify text-sm animate-spin" data-icon="solar:loader-bold"></span>
                                ) : (
                                  <span className="iconify text-sm" data-icon="solar:trash-bin-trash-bold"></span>
                                )}
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-white/60 py-3 px-4">
                            <span className="iconify text-2xl mb-1 block opacity-50" data-icon="solar:chat-square-unread-bold-duotone"></span>
                            <p className="text-xs">{t('chat.noHistory')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // Regular nav items
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `group flex items-center gap-4 w-full px-4 py-3 rounded-xl transition-all font-medium ${
                      isActive ? 'bg-white/20 text-white' : 'text-white hover:bg-white/5'
                    }`
                  }
                >
                  <span className="iconify text-2xl" data-icon={item.icon}></span>
                  <span>{t(item.labelKey)}</span>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Settings & User Section */}
        <div className="mt-auto px-3 border-t border-white/10 pt-6 space-y-2">
          <NavLink to="/settings" className="flex items-center gap-4 w-full px-4 py-3 rounded-xl text-white hover:bg-white/5 transition-all font-medium">
            <span className="iconify text-2xl" data-icon="flat-color-icons:settings"></span>
            <span>{t('nav.settings')}</span>
          </NavLink>
          <div className="p-4 bg-white/5 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden flex-shrink-0">
              <img
                alt="User"
                className="object-cover w-full h-full"
                src={user?.avatar || "https://modao.cc/agent-py/media/generated_images/2026-01-03/0eebdb43cffd4cd9b7c2fbff00947d1e.jpg"}
              />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-white text-sm font-bold truncate">{user?.fullName || 'Li Ming'}</p>
              <button
                className="text-[10px] text-white flex items-center gap-1 hover:text-[#E67E22]"
                onClick={() => {
                  const langs = ['en', 'zh-CN', 'zh-TW'];
                  const currentIndex = langs.indexOf(language);
                  const nextLang = langs[(currentIndex + 1) % langs.length];
                  setLanguage(nextLang);
                }}
              >
                <span className="iconify" data-icon="solar:global-linear"></span>
                <span>{languageNames[language]}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden w-full bg-[#8EB19D] rounded-2xl shadow-lg border border-[#7B9D8A] px-2 py-2">
        <div className="flex items-center justify-around">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                  isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/5'
                }`
              }
            >
              <span className="iconify text-xl" data-icon={item.icon}></span>
              <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
            </NavLink>
          ))}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/5'
              }`
            }
          >
            <span className="iconify text-xl" data-icon="flat-color-icons:settings"></span>
            <span className="text-[10px] font-medium">{t('nav.settings')}</span>
          </NavLink>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
