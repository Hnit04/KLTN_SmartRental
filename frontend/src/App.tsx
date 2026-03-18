import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "sonner"; 

import MainLayout from "./components/layout/MainLayout";
import PublicLayout from "./components/layout/PublicLayout";
import HomePage from "./pages/core/HomePage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ContactPage from "./pages/core/ContactPage";
import HelpCenter from "./pages/core/HelpCenter";
import FAQPage from "./pages/core/FAQPage";
import PrivacyPage from "./pages/core/PrivacyPage";
import TermsPage from "./pages/core/TermsPage";
import ProfilePage from "./pages/user/ProfilePage";

// --- PROPERTY PAGES ---
import PropertiesPage from "./pages/property/PropertiesPage";
import PropertyDetailPage from "./pages/property/PropertyDetailPage";
import RoomDetailPage from "./pages/property/RoomDetailPage";
import PropertiesManagePage from "./pages/property/PropertiesManagePage";
import PropertyManageDetailPage from "./pages/property/PropertyManageDetailPage";
import BillManagePage from "./pages/finance/BillManagePage";
// --- CONTRACT & DASHBOARD PAGES ---
import ContractsPage from "./pages/contract/ContractsPage"; 
import ContractDetailPage from "./pages/contract/ContractDetailPage";
import CreateContractPage from "./pages/contract/CreateContractPage"; 
import DashboardPage from "./pages/dashboard/DashboardPage";
import TenantDashboardPage from "./pages/dashboard/TenantDashboardPage";
import ReportsPage from "./pages/dashboard/ReportsPage";

// ✅ 1. IMPORT TRANG QUẢN LÝ LỊCH HẸN VÀO ĐÂY
import AppointmentManagePage from "./pages/interaction/AppointmentManagePage";
import AiChatBot from "./components/shared/AiChatBot"; // Nhúng Chatbot Toàn cầu

// 1. Bảo vệ các trang yêu cầu Đăng Nhập
const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="h-screen flex items-center justify-center">Đang tải...</div>;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

// 2. Chặn truy cập Login/Register khi ĐÃ Đăng Nhập
const PublicRoute = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return null;

  if (isAuthenticated && (location.pathname === "/login" || location.pathname === "/register")) {
    // Điều hướng dựa theo Role
    return <Navigate to={user?.role === 'LANDLORD' ? "/dashboard" : "/tenant-dashboard"} replace />; 
  }

  return <Outlet />;
};

// 3. Phân quyền truy cập các trang chuyên biệt theo Role
const RoleRoute = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  
  if (!allowedRoles.includes(user.role)) {
    // Redirect đúng theo role: Landlord → dashboard, Tenant → tenant-dashboard
    return <Navigate to={user.role === 'LANDLORD' ? '/dashboard' : '/tenant-dashboard'} replace />;
  }
  
  return <Outlet />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ─── GROUP: PUBLIC PAGES (Có Header/Footer chung) ─── */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            
            {/* PROPERTY ROUTES */}
            <Route path="/properties" element={<PropertiesPage />} />
            <Route path="/properties/:id" element={<PropertyDetailPage />} />
            <Route path="/rooms/:id" element={<RoomDetailPage />} />
            
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            
            {/* AUTH ROUTES */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>
          </Route>

          {/* ─── GROUP: PROTECTED PAGES (Cần đăng nhập - Dùng MainLayout) ─── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
 
              <Route path="/profile" element={<ProfilePage />} />
              
              {/* === KHU VỰC DÀNH RIÊNG CHO CHỦ TRỌ (LANDLORD) === */}
              <Route element={<RoleRoute allowedRoles={['LANDLORD']} />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/properties/manage" element={<PropertiesManagePage />} />
                <Route path="/properties/manage/:id" element={<PropertyManageDetailPage />} />
                
                <Route path="/finance" element={<BillManagePage />} />
                <Route path="/reports" element={<ReportsPage />} />
              </Route>

              {/* === KHU VỰC DÀNH RIÊNG CHO KHÁCH THUÊ (TENANT) === */}
              <Route element={<RoleRoute allowedRoles={['TENANT']} />}>
                <Route path="/tenant-dashboard" element={<TenantDashboardPage />} />
              </Route>
              
              {/* === CONTRACT & INTERACTION ROUTES (DÙNG CHUNG CẢ LANDLORD & TENANT) === */}
              <Route path="/contracts/create" element={<CreateContractPage />} />
              <Route path="/contracts/:id" element={<ContractDetailPage />} />
              <Route path="/contracts" element={<ContractsPage />} />
              
              {/* ✅ 2. THAY THẾ DIV GIỮ CHỖ BẰNG COMPONENT THẬT */}
              <Route path="/appointments" element={<AppointmentManagePage />} />
              
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>

      {/* 🔥 TOASTER CONFIG */}
      <Toaster position="top-right" richColors closeButton duration={5000} visibleToasts={5} />
      
      {/* 🤖 GLOBAL AI CHATBOT */}
      <AiChatBot />
    </AuthProvider>
  );
}

export default App;