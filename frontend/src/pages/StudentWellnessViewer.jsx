import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const StudentWellnessViewer = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="h-full flex flex-col bg-slate-100 dark:bg-dark-bg">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card border-b border-slate-200 dark:border-dark-border px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/resources')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-dark-border rounded-lg transition-colors"
          >
            <span className="iconify text-xl text-slate-600 dark:text-dark-muted" data-icon="solar:arrow-left-bold"></span>
          </button>
          <div>
            <h1 className="font-bold text-slate-800 dark:text-dark-text">Student Wellness Resources</h1>
            <p className="text-xs text-slate-500 dark:text-dark-muted">PolyU Student Support Services</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <iframe
          src="/StudentWellness/index.html"
          title="Student Wellness Resources"
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
};

export default StudentWellnessViewer;
