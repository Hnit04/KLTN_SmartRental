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

// --- CONTRACT PAGES ---
import ContractsPage from "./pages/contract/ContractsPage"; 
import ContractDetailPage from "./pages/contract/ContractDetailPage";
// ✅ Import trang tạo hợp đồng
import CreateContractPage from "./pages/contract/CreateContractPage"; 

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
    return <Navigate to="/dashboard" replace />; // Hoặc về /properties tùy bạn
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
            
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            
            {/* AUTH ROUTES (Chỉ dành cho khách chưa đăng nhập) */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>
          </Route>

          {/* ─── GROUP: PROTECTED PAGES (Cần đăng nhập) ─── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
 
              <Route path="/profile" element={<ProfilePage />} />
              
              {/* === CONTRACT ROUTES (SỬA LẠI THỨ TỰ) === */}
              
              {/* 1. Route tĩnh (Cụ thể) phải đặt TRƯỚC */}
              <Route path="/contracts/create" element={<CreateContractPage />} />
              
              {/* 2. Route động (Dynamic ID) đặt SAU */}
              <Route path="/contracts/:id" element={<ContractDetailPage />} />
              
              {/* 3. Route danh sách */}
              <Route path="/contracts" element={<ContractsPage />} />
              
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>

      {/* 🔥 TOASTER CONFIG */}
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