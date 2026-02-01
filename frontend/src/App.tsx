import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Import Layouts
import MainLayout from './components/layout/MainLayout';

// Import Pages (Public)
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';


// Component bảo vệ Route
const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }
  
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

// Component ngăn user đã login quay lại trang login/register
const PublicRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  // Nếu đã login thì đẩy về dashboard
  return isAuthenticated ? <Navigate to="/dashboard" /> : <Outlet />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ─── PUBLIC ROUTES (Ai cũng xem được) ───────────────────────────── */}
          <Route path="/" element={<HomePage />} />
          
          {/* ─── AUTH ROUTES (Chỉ xem khi CHƯA login) ───────────────────────── */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* ─── PROTECTED ROUTES (Phải login mới xem được) ─────────────────── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              
              {/* Các route khác (Bỏ comment khi đã tạo file) */}
              {/* <Route path="/contracts" element={<ContractList />} /> */}
              {/* <Route path="/contracts/create" element={<CreateContract />} /> */}
            </Route>
          </Route>

          {/* ─── FALLBACK (Nhập link linh tinh thì về trang chủ) ────────────── */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;