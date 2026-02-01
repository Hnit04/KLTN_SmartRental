import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const MainLayout = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar cố định bên trái */}
      <Sidebar />

      {/* Phần nội dung chính bên phải */}
      <div className="flex-1 flex flex-col ml-64 min-w-0 transition-all duration-300">
        <Header />
        
        {/* Outlet là nơi nội dung của Dashboard/ContractList sẽ hiện ra */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <Outlet /> 
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;