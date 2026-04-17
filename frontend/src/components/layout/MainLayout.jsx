import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const MainLayout = () => {
  return (
    <div className="min-h-screen bg-[#F7F9F8] dark:bg-dark-bg overflow-x-hidden">
      <div className="p-4 pb-24 lg:p-8 lg:pb-8">
        <div className="max-w-[1800px] mx-auto">
          <div className="flex gap-6">
            {/* Desktop Sidebar - Sticky */}
            <div className="hidden lg:block flex-shrink-0 sticky top-8 self-start h-[calc(100vh-4rem)]">
              <Sidebar />
            </div>

            {/* Main Content */}
            <main className="flex-1 min-w-0 bg-white dark:bg-dark-card rounded-3xl shadow-lg border border-slate-100 dark:border-dark-border">
              <Outlet />
            </main>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation - Fixed */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#F7F9F8] dark:bg-dark-bg p-2 safe-area-pb">
        <Sidebar />
      </div>
    </div>
  );
};

export default MainLayout;
