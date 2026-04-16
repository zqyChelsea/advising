import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const Settings = () => {
  const { user, logout } = useAuth();
  const { t, language, setLanguage, languageNames } = useLanguage();
  const [settings, setSettings] = useState({
    notifications: true,
    emailUpdates: true,
    darkMode: false,
    language: language
  });

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setSettings(prev => ({ ...prev, language: newLang }));
    setLanguage(newLang);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-4xl mx-auto animate-slide-in">
      <header className="mb-6 lg:mb-10">
        <h2 className="text-2xl lg:text-3xl font-black text-slate-900">{t('settings.title')}</h2>
        <p className="text-slate-500 mt-2 text-sm lg:text-base">{t('settings.subtitle')}</p>
      </header>

      <div className="space-y-6">
        {/* Notifications Section */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#F2F4F2] rounded-xl flex items-center justify-center">
              <span className="iconify text-xl text-[#6B8E7B]" data-icon="solar:bell-bold"></span>
            </div>
            <div>
              <h3 className="font-bold text-slate-800">{t('settings.notifications')}</h3>
              <p className="text-sm text-slate-500">{t('settings.notificationsDesc')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-50">
              <div>
                <p className="font-medium text-slate-700">{t('settings.pushNotifications')}</p>
                <p className="text-sm text-slate-500">{t('settings.pushNotificationsDesc')}</p>
              </div>
              <button
                className={`w-12 h-6 rounded-full transition-colors ${settings.notifications ? 'bg-[#6B8E7B]' : 'bg-slate-200'}`}
                onClick={() => handleToggle('notifications')}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${settings.notifications ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
              </button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-700">{t('settings.emailUpdates')}</p>
                <p className="text-sm text-slate-500">{t('settings.emailUpdatesDesc')}</p>
              </div>
              <button
                className={`w-12 h-6 rounded-full transition-colors ${settings.emailUpdates ? 'bg-[#6B8E7B]' : 'bg-slate-200'}`}
                onClick={() => handleToggle('emailUpdates')}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${settings.emailUpdates ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
              </button>
            </div>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#F2F4F2] rounded-xl flex items-center justify-center">
              <span className="iconify text-xl text-[#6B8E7B]" data-icon="solar:pallete-bold"></span>
            </div>
            <div>
              <h3 className="font-bold text-slate-800">{t('settings.appearance')}</h3>
              <p className="text-sm text-slate-500">{t('settings.appearanceDesc')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-50">
              <div>
                <p className="font-medium text-slate-700">{t('settings.darkMode')}</p>
                <p className="text-sm text-slate-500">{t('settings.darkModeDesc')}</p>
              </div>
              <button
                className={`w-12 h-6 rounded-full transition-colors ${settings.darkMode ? 'bg-[#6B8E7B]' : 'bg-slate-200'}`}
                onClick={() => handleToggle('darkMode')}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${settings.darkMode ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
              </button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-700">{t('settings.language')}</p>
                <p className="text-sm text-slate-500">{t('settings.languageDesc')}</p>
              </div>
              <select
                className="border-2 border-slate-100 rounded-xl px-4 py-2 focus:border-[#6B8E7B] outline-none"
                value={settings.language}
                onChange={handleLanguageChange}
              >
                {Object.entries(languageNames).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Account Section */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#F2F4F2] rounded-xl flex items-center justify-center">
              <span className="iconify text-xl text-[#6B8E7B]" data-icon="solar:user-circle-bold"></span>
            </div>
            <div>
              <h3 className="font-bold text-slate-800">{t('settings.account')}</h3>
              <p className="text-sm text-slate-500">{t('settings.accountDesc')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <span className="iconify text-xl text-slate-400 group-hover:text-[#6B8E7B]" data-icon="solar:key-bold"></span>
                <span className="font-medium text-slate-700">{t('settings.changePassword')}</span>
              </div>
              <span className="iconify text-xl text-slate-300 group-hover:text-[#6B8E7B]" data-icon="solar:arrow-right-bold"></span>
            </button>

            <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <span className="iconify text-xl text-slate-400 group-hover:text-[#6B8E7B]" data-icon="solar:download-bold"></span>
                <span className="font-medium text-slate-700">{t('settings.exportData')}</span>
              </div>
              <span className="iconify text-xl text-slate-300 group-hover:text-[#6B8E7B]" data-icon="solar:arrow-right-bold"></span>
            </button>

            <button
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-50 transition-colors flex items-center justify-between group"
              onClick={logout}
            >
              <div className="flex items-center gap-3">
                <span className="iconify text-xl text-red-400 group-hover:text-red-500" data-icon="solar:logout-bold"></span>
                <span className="font-medium text-red-600">{t('settings.signOut')}</span>
              </div>
              <span className="iconify text-xl text-red-300 group-hover:text-red-500" data-icon="solar:arrow-right-bold"></span>
            </button>
          </div>
        </div>

        {/* App Info */}
        <div className="text-center py-4">
          <p className="text-sm text-slate-400">{t('settings.version')}</p>
          <p className="text-xs text-slate-300 mt-1">{t('settings.academicYear')}</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
