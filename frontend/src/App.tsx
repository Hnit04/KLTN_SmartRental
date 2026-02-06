import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "sonner"; 

import MainLayout from "./components/layout/MainLayout";
import PublicLayout from "./components/layout/PublicLayout";
import PropertyDetailPage from "./pages/property/PropertyDetailPage";
import HomePage from "./pages/core/HomePage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ContactPage from "./pages/core/ContactPage";
import HelpCenter from "./pages/core/HelpCenter";
import FAQPage from "./pages/core/FAQPage";
import PrivacyPage from "./pages/core/PrivacyPage";
import TermsPage from "./pages/core/TermsPage";
import ProfilePage from "./pages/user/ProfilePage";
import ContractsPage from "./pages/contract/ContractsPage"; 
import ContractDetailPage from "./pages/contract/ContractDetailPage";// 1. IMPORT TRANG DANH SÁCH PHÒNG
import PropertiesPage from "./pages/property/PropertiesPage";

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="h-screen flex items-center justify-center">Đang tải...</div>;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

const PublicRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;

  if (
    isAuthenticated &&
    (location.pathname === "/login" || location.pathname === "/register")
  ) {
    return <Navigate to="/dashboard" replace />;
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
            
            {/* 2. THÊM ROUTE CHO TRANG PHÒNG */}
            <Route path="/properties" element={<PropertiesPage />} />
            <Route path="/properties/:id" element={<PropertyDetailPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            {/* ─── GROUP: AUTH PAGES ─── */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          </Route>

          

          {/* ─── GROUP: PROTECTED PAGES (Dashboard) ─── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
 
              <Route path="/profile" element={<ProfilePage />} />
              
              {/* 1. Route cho Sidebar (Danh sách) */}
              <Route path="/contracts" element={<ContractsPage />} />
              
              {/* 2. Route cho Chi tiết (File bạn vừa gửi) */}
              <Route path="/contracts/:id" element={<ContractDetailPage />} />
              
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>

      {/* 🔥 TOASTER DUY NHẤT */}
      <Toaster
        position="top-right"
        richColors
        closeButton
        duration={5000}
        visibleToasts={5}
      />
    </AuthProvider>
  );
}

export default App;