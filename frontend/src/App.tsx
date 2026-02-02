import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
// Lưu ý: Nếu bạn đã tạo component custom ở bước trước thì dùng: import { Toaster } from "@/components/ui/sonner";
import { Toaster } from "sonner"; 

import MainLayout from "./components/layout/MainLayout";
import PublicLayout from "./components/layout/PublicLayout";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ContactPage from "./pages/ContactPage";
import HelpCenter from "./pages/HelpCenter";
import FAQPage from "./pages/FAQPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";

// 1. IMPORT TRANG DANH SÁCH PHÒNG
import PropertiesPage from "./pages/PropertiesPage";

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
            
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
          </Route>

          {/* ─── GROUP: AUTH PAGES ─── */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* ─── GROUP: PROTECTED PAGES (Dashboard) ─── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              {/* <Route path="/dashboard" element={<Dashboard />} /> */}
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