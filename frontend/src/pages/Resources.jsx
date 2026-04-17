import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const Resources = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const resources = [
    {
      id: 1,
      title: 'Student Handbook 2025/26',
      description: 'University-wide academic policies and procedures for undergraduate programs.',
      category: 'Handbook',
      icon: 'solar:document-bold',
      color: 'bg-blue-50 text-blue-500',
      link: '/resources/student-handbook'
    },
    {
      id: 2,
      title: 'GUR Subject Catalog',
      description: 'Complete list of General University Requirements with descriptions and credits.',
      category: 'Curriculum',
      icon: 'solar:books-bold',
      color: 'bg-emerald-50 text-emerald-500',
      externalLink: 'https://www.polyu.edu.hk/cus/GURSubjects/'
    },
    {
      id: 3,
      title: 'WIE Guidelines',
      description: 'Work-Integrated Education requirements, procedures, and approved host organizations.',
      category: 'Internship',
      icon: 'solar:case-bold',
      color: 'bg-amber-50 text-amber-500',
      link: '/resources/wie-handbook',
      websiteLink: 'https://www.polyu.edu.hk/sao/careers-and-placement-section/work-integrated-education/'
    },
    {
      id: 4,
      title: 'Credit Transfer Policy',
      description: 'Procedures for transferring credits from other institutions or prior learning.',
      category: 'Policy',
      icon: 'solar:refresh-bold',
      color: 'bg-purple-50 text-purple-500',
      websiteLink: 'https://www.polyu.edu.hk/ar/students-in-taught-programmes/credit-transfer/'
    },
    {
      id: 5,
      title: 'Program Requirement Document',
      description: 'Programme curriculum requirements and course structures for each academic year.',
      category: 'Curriculum',
      icon: 'solar:checklist-bold',
      color: 'bg-rose-50 text-rose-500',
      link: '/resources/prd'
    },
    {
      id: 6,
      title: 'Student Wellness Resources',
      description: 'Mental health support, counseling services, and wellness programs.',
      category: 'Support',
      icon: 'solar:heart-bold',
      color: 'bg-pink-50 text-pink-500',
      link: '/resources/student-wellness'
    }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-full animate-slide-in">
      <header className="mb-6 lg:mb-10">
        <h2 className="text-2xl lg:text-3xl font-black text-slate-900">{t('resources.title')}</h2>
        <p className="text-slate-500 mt-2 text-sm lg:text-base">{t('resources.subtitle')}</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {resources.map((resource) => (
          <div
            key={resource.id}
            className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-lg hover:border-[#8EB19D]/30 transition-all cursor-pointer group"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${resource.color}`}>
              <span className="iconify text-3xl" data-icon={resource.icon}></span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase tracking-wider">
                {resource.category}
              </span>
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-2 group-hover:text-[#6B8E7B] transition-colors">
              {resource.title}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              {resource.description}
            </p>
            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between flex-wrap gap-2">
              {resource.externalLink ? (
                <a
                  href={resource.externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#6B8E7B] text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all"
                >
                  <span>{t('resources.visitGURLibrary')}</span>
                  <span className="iconify" data-icon="solar:arrow-right-bold"></span>
                </a>
              ) : resource.link ? (
                <button
                  onClick={() => navigate(resource.link)}
                  className="text-[#6B8E7B] text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all"
                >
                  <span>{t('resources.view')}</span>
                  <span className="iconify" data-icon="solar:arrow-right-bold"></span>
                </button>
              ) : null}
              {resource.websiteLink && (
                <a
                  href={resource.websiteLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#6B8E7B] text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all"
                >
                  <span>{t('resources.visitWebsite')}</span>
                  <span className="iconify" data-icon="solar:global-bold"></span>
                </a>
              )}
              <span className="text-xs text-slate-400">{t('resources.updated')}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 lg:mt-12 bg-gradient-to-r from-[#8EB19D] to-[#6B8E7B] rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-6">
          <div className="text-center lg:text-left">
            <h3 className="text-xl lg:text-2xl font-bold mb-2">{t('resources.needHelp')}</h3>
            <p className="text-white/80 text-sm lg:text-base">{t('resources.needHelpDesc')}</p>
          </div>
          <button
            onClick={() => navigate('/chat')}
            className="w-full sm:w-auto px-6 lg:px-8 py-3 bg-white text-[#6B8E7B] rounded-xl lg:rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all whitespace-nowrap"
          >
            <span className="iconify" data-icon="solar:chat-round-dots-bold-duotone"></span>
            {t('resources.askAI')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Resources;
