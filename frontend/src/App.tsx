import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Import Layouts
import MainLayout from './components/layout/MainLayout';
import PublicLayout from './components/layout/PublicLayout'; // <-- Import mới

// Import Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ContactPage from './pages/ContactPage';
import HelpCenter from './pages/HelpCenter';
import FAQPage from './pages/FAQPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="h-screen flex items-center justify-center">Đang tải...</div>;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

const PublicRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return isAuthenticated ? <Navigate to="/dashboard" /> : <Outlet />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          
          {/* ─── GROUP: PUBLIC PAGES (Có Header/Footer chung) ─── */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
          </Route>

          {/* ─── GROUP: AUTH PAGES (Login/Register) ─── */}
          <Route element={<PublicRoute />}>
             {/* Auth pages thường không cần Header/Footer rườm rà, hoặc dùng layout riêng */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* ─── GROUP: PROTECTED PAGES (Dashboard Admin) ─── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              {/* Nếu PropertyList ở đây là bản quản lý (Admin), nó sẽ dùng Sidebar */}
              {/* <Route path="/properties" element={<PropertyList />} /> */}
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;