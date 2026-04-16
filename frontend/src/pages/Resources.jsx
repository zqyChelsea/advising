const Resources = () => {
  const resources = [
    {
      id: 1,
      title: 'Academic Regulations 2024-2025',
      description: 'University-wide academic policies and procedures for undergraduate programs.',
      category: 'Handbook',
      icon: 'solar:document-bold',
      color: 'bg-blue-50 text-blue-500'
    },
    {
      id: 2,
      title: 'GUR Subject Catalog',
      description: 'Complete list of General University Requirements with descriptions and credits.',
      category: 'Curriculum',
      icon: 'solar:books-bold',
      color: 'bg-emerald-50 text-emerald-500'
    },
    {
      id: 3,
      title: 'WIE Guidelines',
      description: 'Work-Integrated Education requirements, procedures, and approved host organizations.',
      category: 'Internship',
      icon: 'solar:case-bold',
      color: 'bg-amber-50 text-amber-500'
    },
    {
      id: 4,
      title: 'Credit Transfer Policy',
      description: 'Procedures for transferring credits from other institutions or prior learning.',
      category: 'Policy',
      icon: 'solar:refresh-bold',
      color: 'bg-purple-50 text-purple-500'
    },
    {
      id: 5,
      title: 'Exam Timetable & Rules',
      description: 'Examination schedule, venues, and examination regulations.',
      category: 'Exam',
      icon: 'solar:calendar-bold',
      color: 'bg-rose-50 text-rose-500'
    },
    {
      id: 6,
      title: 'Student Wellness Resources',
      description: 'Mental health support, counseling services, and wellness programs.',
      category: 'Support',
      icon: 'solar:heart-bold',
      color: 'bg-pink-50 text-pink-500'
    }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-full animate-slide-in">
      <header className="mb-6 lg:mb-10">
        <h2 className="text-2xl lg:text-3xl font-black text-slate-900">Resources and Useful Links</h2>
        <p className="text-slate-500 mt-2 text-sm lg:text-base">Explore University guidelines and handbooks curated for 2026.</p>
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
            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
              <button className="text-[#6B8E7B] text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                <span>View Document</span>
                <span className="iconify" data-icon="solar:arrow-right-bold"></span>
              </button>
              <span className="text-xs text-slate-400">Updated Jan 2026</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 lg:mt-12 bg-gradient-to-r from-[#8EB19D] to-[#6B8E7B] rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-6">
          <div className="text-center lg:text-left">
            <h3 className="text-xl lg:text-2xl font-bold mb-2">Need Help Finding Resources?</h3>
            <p className="text-white/80 text-sm lg:text-base">Our AI advisor can help you find the right documents and answer your questions.</p>
          </div>
          <button className="w-full sm:w-auto px-6 lg:px-8 py-3 bg-white text-[#6B8E7B] rounded-xl lg:rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all whitespace-nowrap">
            <span className="iconify" data-icon="solar:chat-round-dots-bold-duotone"></span>
            Ask AI Advisor
          </button>
        </div>
      </div>
    </div>
  );
};

export default Resources;
