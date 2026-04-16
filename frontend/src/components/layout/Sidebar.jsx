import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const Sidebar = () => {
  const { user } = useAuth();
  const { t, language, setLanguage, languageNames } = useLanguage();

  const navItems = [
    { path: '/chat', icon: 'solar:chat-round-dots-bold-duotone', labelKey: 'nav.chat' },
    { path: '/profile', icon: 'solar:user-circle-bold-duotone', labelKey: 'nav.profile' },
    { path: '/tickets', icon: 'solar:ticket-bold-duotone', labelKey: 'nav.tickets' },
    { path: '/resources', icon: 'solar:library-bold-duotone', labelKey: 'nav.resources' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden lg:flex w-72 h-full bg-[#8EB19D] rounded-3xl shadow-lg border border-[#7B9D8A] flex-col items-stretch py-8 transition-all duration-300">
        {/* Logo Section */}
        <div className="px-6 mb-10 flex items-center gap-3 border-b border-[#A7C4B5] pb-6">
          <div className="w-10 h-10 bg-[#FFFFFF] rounded-xl flex items-center justify-center text-[#8EB19D]">
            <span className="iconify text-2xl" data-icon="flat-color-icons:graduation-cap"></span>
          </div>
          <h1 className="font-bold text-lg leading-tight text-white">
            PolyU Advising + Wellness
          </h1>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-3 space-y-1">
          <div className="nav-group mb-4">
            {navItems.map(item => (
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
            ))}
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
