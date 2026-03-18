import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';

const MainLayout = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar cố định bên trái — chỉ hiện trên md+ */}
      <Sidebar />

      {/* Phần nội dung chính — offset ml-64 chỉ khi có sidebar (md+) */}
      <div className="flex-1 flex flex-col md:ml-64 min-w-0 transition-all duration-300">
        <Header />
        
        {/* Main content — thêm pb-16 trên mobile để không bị MobileBottomNav che */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-20 md:pb-6">
          <div className="max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-300">
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