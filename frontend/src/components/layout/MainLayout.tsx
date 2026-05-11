import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';

const MainLayout = () => {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar cố định bên trái — chỉ hiện trên md+ */}
      <Sidebar />

      {/* Phần nội dung chính — offset ml-64 chỉ khi có sidebar (md+) */}
      <div className="flex-1 flex flex-col md:ml-64 min-w-0 transition-all duration-300">
        <Header />
        
        {/* Main content — thêm pb-16 trên mobile để không bị MobileBottomNav che */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto pb-20 pt-4 md:pb-6 md:pt-6">
          <div className="page-shell motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-400">
            <Outlet /> 
          </div>
        </main>
      </div>

      {/* Bottom Navigation — chỉ hiện trên mobile (< md) */}
      <MobileBottomNav />
    </div>
  );
};

export default MainLayout;
