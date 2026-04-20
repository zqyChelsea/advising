import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../services/api';
import ImageCropper from '../components/common/ImageCropper';
import MonthYearPicker from '../components/common/MonthYearPicker';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const fileInputRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [userData, setUserData] = useState({
    firstName: '',
    familyName: '',
    studentId: '23012345D',
    entryYear: new Date().getFullYear(),
    expectedGraduation: '06/2028',
    department: 'Computing',
    major: 'BSc (Honours) Degree in Computer Science',
    gpa: '',
    totalCredits: '',
    avatar: ''
  });

  const currentYear = new Date().getFullYear();
  const entryYearOptions = useMemo(() => {
    const years = [];
    for (let year = currentYear - 5; year <= currentYear; year++) {
      years.push(year);
    }
    return years;
  }, [currentYear]);
  const [stats, setStats] = useState({
    gpa: 3.72,
    totalCredits: 45,
    gurProgress: 60
  });
  const [isSaving, setIsSaving] = useState(false);

  const formatGraduationDate = (dateStr) => {
    if (!dateStr) return `06/${currentYear + 4}`;
    if (dateStr.match(/^\d{2}\/\d{4}$/)) return dateStr;
    if (dateStr.match(/^\d{4}\/\d{2}$/)) {
      const [year, month] = dateStr.split('/');
      return `${month}/${year}`;
    }
    return `06/${currentYear + 4}`;
  };

  useEffect(() => {
    if (user) {
      setUserData({
        firstName: user.firstName || '',
        familyName: user.familyName || '',
        studentId: user.studentId || '23012345D',
        entryYear: user.entryYear || currentYear,
        expectedGraduation: formatGraduationDate(user.expectedGraduation),
        department: user.department || 'Department of Computing',
        major: user.major || 'BSc (Hons) in Computing',
        gpa: user.gpa !== undefined ? user.gpa.toString() : '',
        totalCredits: user.totalCredits !== undefined ? user.totalCredits.toString() : '',
        avatar: user.avatar || ''
      });
      setAvatarPreview(user.avatar || '');
      setStats({
        gpa: user.gpa || 0,
        totalCredits: user.totalCredits || 0,
        gurProgress: user.gurProgress || 60
      });
    }
  }, [user, currentYear]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(t('profile.selectImageError'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(t('profile.imageSizeError'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      setSelectedImage(result);
      setShowCropper(true);
    };
    reader.onerror = () => {
      console.error('Error reading file');
      alert(t('profile.errorReadingFile'));
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  const handleCropComplete = async (croppedImage) => {
    setShowCropper(false);
    setSelectedImage(null);
    setIsUploading(true);

    try {
      const response = await api.put('/auth/avatar', { avatar: croppedImage });
      setAvatarPreview(response.data.avatar);
      setUserData(prev => ({ ...prev, avatar: response.data.avatar }));
      updateUser({ avatar: response.data.avatar });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert(error.response?.data?.message || t('profile.errorUploadingAvatar'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setSelectedImage(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await api.put('/auth/profile', {
        firstName: userData.firstName,
        familyName: userData.familyName,
        expectedGraduation: userData.expectedGraduation,
        department: userData.department,
        major: userData.major,
        gpa: userData.gpa !== '' ? parseFloat(userData.gpa) : null,
        totalCredits: userData.totalCredits !== '' ? parseInt(userData.totalCredits, 10) : null
      });
      updateUser(response.data);
      setAvatarPreview(response.data.avatar || userData.avatar);
      setStats({
        gpa: response.data.gpa || 0,
        totalCredits: response.data.totalCredits || 0,
        gurProgress: response.data.gurProgress || 60
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      alert(error.response?.data?.message || t('profile.errorSavingProfile'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setUserData({
        firstName: user.firstName || '',
        familyName: user.familyName || '',
        studentId: user.studentId || '23012345D',
        entryYear: user.entryYear || currentYear,
        expectedGraduation: formatGraduationDate(user.expectedGraduation),
        department: user.department || 'Department of Computing',
        major: user.major || 'BSc (Hons) in Computing',
        gpa: user.gpa !== undefined ? user.gpa.toString() : '',
        totalCredits: user.totalCredits !== undefined ? user.totalCredits.toString() : '',
        avatar: user.avatar || ''
      });
      setAvatarPreview(user.avatar || '');
      setStats({
        gpa: user.gpa || 0,
        totalCredits: user.totalCredits || 0,
        gurProgress: user.gurProgress || 60
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-5xl mx-auto animate-slide-in">
      <header className="mb-6 lg:mb-10">
        <h2 className="text-2xl lg:text-3xl font-black text-slate-900">{t('profile.title')}</h2>
        <p className="text-slate-500 mt-2 text-sm lg:text-base">{t('profile.subtitle')}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-[#F5F8FA] shadow-sm space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('profile.firstName')}</label>
                <input
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-[#6B8E7B] focus:ring-0 outline-none transition-all font-medium"
                  type="text"
                  name="firstName"
                  value={userData.firstName}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('profile.familyName')}</label>
                <input
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-[#6B8E7B] focus:ring-0 outline-none transition-all font-medium"
                  type="text"
                  name="familyName"
                  value={userData.familyName}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('profile.studentId')}</label>
                <input
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-[#6B8E7B] focus:ring-0 outline-none transition-all font-medium bg-slate-50"
                  type="text"
                  name="studentId"
                  value={userData.studentId}
                  disabled
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('profile.entryYear')}</label>
                <select
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-[#6B8E7B] focus:ring-0 outline-none transition-all font-medium"
                  name="entryYear"
                  value={userData.entryYear}
                  onChange={handleChange}
                >
                  {entryYearOptions.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('profile.expectedGraduation')}</label>
                <MonthYearPicker
                  value={userData.expectedGraduation}
                  onChange={(value) => setUserData(prev => ({ ...prev, expectedGraduation: value }))}
                  minYear={currentYear}
                  maxYear={currentYear + 10}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('profile.department')}</label>
                <select
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-[#6B8E7B] focus:ring-0 outline-none transition-all font-medium"
                  name="department"
                  value={userData.department}
                  onChange={handleChange}
                >
                  <option value="Computing">Computing</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('profile.major')}</label>
                <select
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-[#6B8E7B] focus:ring-0 outline-none transition-all font-medium"
                  name="major"
                  value={userData.major}
                  onChange={handleChange}
                >
                  <option value="BSc (Honours) Degree in Computer Science">BSc (Honours) Degree in Computer Science</option>
                  <option value="BSc (Honours) Degree in Enterprise Information Systems">BSc (Honours) Degree in Enterprise Information Systems</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Optional Fields for AI Advisor</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    {t('profile.gpa')} <span className="text-slate-300 font-normal">(Optional)</span>
                  </label>
                  <input
                    className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-[#6B8E7B] focus:ring-0 outline-none transition-all font-medium"
                    type="number"
                    name="gpa"
                    step="0.01"
                    min="0"
                    max="4.3"
                    placeholder="e.g. 3.72"
                    value={userData.gpa}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    {t('profile.totalCredits')} <span className="text-slate-300 font-normal">(Optional)</span>
                  </label>
                  <input
                    className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-[#6B8E7B] focus:ring-0 outline-none transition-all font-medium"
                    type="number"
                    name="totalCredits"
                    step="1"
                    min="0"
                    max="200"
                    placeholder="e.g. 45"
                    value={userData.totalCredits}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50 flex justify-end gap-3">
              <button
                className="px-6 py-2.5 rounded-xl text-slate-500 font-bold hover:bg-slate-50 transition-all"
                onClick={handleCancel}
              >
                {t('profile.cancel')}
              </button>
              <button
                className="px-8 py-2.5 rounded-xl bg-[#6B8E7B] text-white font-bold shadow-lg shadow-[#6B8E7B]/10 hover:bg-[#5A7A69] transition-all flex items-center gap-2"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin">⟳</span> {t('profile.saving')}
                  </>
                ) : (
                  t('profile.save')
                )}
              </button>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-[#6B8E7B] rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-2">{t('profile.advisingIntelligence')}</h3>
              <p className="text-[#E8F0EB] text-sm mb-6">{t('profile.advisingSubtitle')}</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur">
                  <p className="text-xs text-[#E8F0EB] mb-1">{t('profile.gpa')}</p>
                  <p className="text-2xl font-black">{stats.gpa}</p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur">
                  <p className="text-xs text-[#E8F0EB] mb-1">{t('profile.totalCredits')}</p>
                  <p className="text-2xl font-black">{stats.totalCredits} / 120</p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur">
                  <p className="text-xs text-[#E8F0EB] mb-1">{t('profile.gurDone')}</p>
                  <p className="text-2xl font-black">{stats.gurProgress}%</p>
                </div>
              </div>
            </div>
            <span className="iconify absolute -bottom-10 -right-10 text-[200px] text-white/5" data-icon="solar:chart-bold"></span>
          </div>
        </div>

        {/* Sidebar Section */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm text-center">
            <div className="relative inline-block mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <div
                className="w-32 h-32 bg-slate-100 rounded-full border-4 border-white shadow-md mx-auto flex items-center justify-center overflow-hidden cursor-pointer group"
                onClick={handleAvatarClick}
              >
                <img
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  id="img-1"
                  src={avatarPreview || userData.avatar || "https://modao.cc/agent-py/media/generated_images/2026-01-03/0eebdb43cffd4cd9b7c2fbff00947d1e.jpg"}
                />
                <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="iconify text-white text-2xl" data-icon="solar:camera-bold"></span>
                </div>
              </div>
              <button
                className="absolute bottom-1 right-1 w-8 h-8 bg-[#6B8E7B] text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:bg-[#5A7A69] transition-all cursor-pointer"
                onClick={handleAvatarClick}
                disabled={isUploading}
                title={t('profile.uploadAvatar')}
              >
                {isUploading ? (
                  <span className="animate-spin text-xs">⟳</span>
                ) : (
                  <span className="iconify" data-icon="solar:camera-bold"></span>
                )}
              </button>
            </div>
            <h4 className="font-bold text-slate-800 text-lg">{userData.firstName} {userData.familyName}</h4>
            <p className="text-sm text-slate-400">{t('profile.computerScience')} - {t('profile.year')} 2</p>
          </div>

          <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                <span className="iconify text-xl" data-icon="solar:heart-bold"></span>
              </div>
              <h4 className="font-bold text-emerald-900">{t('profile.wellnessNote')}</h4>
            </div>
            <p className="text-sm text-emerald-800 leading-relaxed mb-4">
              {t('profile.finalWeekApproaching')}
            </p>
            <a
              href="https://www.polyu.edu.hk/sao/counselling-and-wellness-section/student-counselling/counselling/meeting-with-our-counsellors/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-white text-emerald-600 rounded-xl py-2 text-sm font-bold border border-emerald-200 hover:bg-emerald-100 transition-all block text-center"
            >
              {t('profile.contactSAO')}
            </a>
          </div>
        </div>
      </div>

      {/* Image Cropper Modal */}
      {showCropper && selectedImage && (
        <ImageCropper
          image={selectedImage}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
};

export default Profile;
