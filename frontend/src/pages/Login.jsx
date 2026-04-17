import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const Login = () => {
  const navigate = useNavigate();
  const { login, register, user } = useAuth();
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    studentId: '',
    email: '',
    password: '',
    firstName: '',
    familyName: '',
    entryYear: '2024'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user) {
    return <Navigate to="/chat" replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isLogin) {
      const emailRegex = /@connect\.polyu\.hk|@polyu\.edu\.hk$/i;
      if (!emailRegex.test(formData.email)) {
        setError(t('login.emailError'));
        setLoading(false);
        return;
      }
    }

    try {
      if (isLogin) {
        await login(formData.studentId, formData.password);
      } else {
        await register(formData);
      }
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setFormData(prev => ({ ...prev, studentId: '23012345D', password: 'demo123' }));
  };

  return (
    <div className="min-h-screen bg-[#F2F4F2] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#8EB19D] rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#8EB19D]/30">
            <span className="iconify text-5xl text-white" data-icon="flat-color-icons:graduation-cap"></span>
          </div>
          <h1 className="text-2xl font-black text-[#2C3E50]">{t('login.title')}</h1>
          <p className="text-slate-500 mt-1">{t('login.subtitle')}</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50">
          <div className="flex gap-4 mb-6">
            <button
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${isLogin ? 'bg-[#8EB19D] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              onClick={() => setIsLogin(true)}
            >
              {t('login.login')}
            </button>
            <button
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${!isLogin ? 'bg-[#8EB19D] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              onClick={() => setIsLogin(false)}
            >
              {t('login.register')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('login.firstName')}</label>
                    <input
                      className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-[#8EB19D] focus:ring-0 outline-none transition-all font-medium"
                      type="text"
                      name="firstName"
                      placeholder={t('login.givenName')}
                      value={formData.firstName}
                      onChange={handleChange}
                      required={!isLogin}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('login.familyName')}</label>
                    <input
                      className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-[#8EB19D] focus:ring-0 outline-none transition-all font-medium"
                      type="text"
                      name="familyName"
                      placeholder={t('login.surname')}
                      value={formData.familyName}
                      onChange={handleChange}
                      required={!isLogin}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('login.email')}</label>
                  <input
                    className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-[#8EB19D] focus:ring-0 outline-none transition-all font-medium"
                    type="email"
                    name="email"
                    placeholder={t('login.schoolEmail')}
                    value={formData.email}
                    onChange={handleChange}
                    required={!isLogin}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('login.entryYear')}</label>
                  <select
                    className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-[#8EB19D] focus:ring-0 outline-none transition-all font-medium"
                    name="entryYear"
                    value={formData.entryYear}
                    onChange={handleChange}
                  >
                    <option value="2022">2022</option>
                    <option value="2023">2023</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                  </select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('login.studentId')}</label>
              <input
                className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-[#8EB19D] focus:ring-0 outline-none transition-all font-medium"
                type="text"
                name="studentId"
                placeholder={t('login.enterStudentId')}
                value={formData.studentId}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('login.password')}</label>
              <div className="relative">
              <input
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 pr-12 focus:border-[#8EB19D] focus:ring-0 outline-none transition-all font-medium"
                  type={showPassword ? "text" : "password"}
                name="password"
                placeholder={t('login.enterPassword')}
                value={formData.password}
                onChange={handleChange}
                required
              />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="iconify text-xl" data-icon={showPassword ? "mdi:eye-off" : "mdi:eye"}></span>
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-[#8EB19D] text-white rounded-2xl font-bold text-lg shadow-lg shadow-[#8EB19D]/30 hover:bg-[#7B9D8A] hover:shadow-xl hover:shadow-[#8EB19D]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⟳</span> {t('login.processing')}
                </span>
              ) : (
                isLogin ? t('login.signIn') : t('login.createAccount')
              )}
            </button>
          </form>

          {isLogin && (
            <div className="mt-4 text-center">
              <button
                className="text-sm text-[#6B8E7B] hover:text-[#8EB19D] font-medium"
                onClick={fillDemoCredentials}
              >
                {t('login.useDemo')}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-400 mt-8">
          {t('login.terms')}
        </p>
      </div>
    </div>
  );
};

export default Login;
