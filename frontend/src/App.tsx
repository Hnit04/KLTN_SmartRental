// App.tsx
import { useEffect, useState } from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext"; // KHÔNG cần import AuthProvider nữa
import { Toaster } from "sonner"; 


import MainLayout from "./components/layout/MainLayout";
import PublicLayout from "./components/layout/PublicLayout";
import HomePage from "./pages/core/HomePage";
import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
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
import PropertyRoomDetailPage from "./pages/property/PropertyRoomDetailPage";
import TopLandlordsPage from "./pages/property/TopLandlordsPage";
import LandlordPropertiesPage from "./pages/property/LandlordPropertiesPage";
// --- CONTRACT & DASHBOARD PAGES ---
import ContractsPage from "./pages/contract/ContractsPage"; 
import ContractDetailPage from "./pages/contract/ContractDetailPage";
import CreateContractPage from "./pages/contract/CreateContractPage"; 
import { ContractSigningWizardPage } from "./flows/contract-signing";
import { ContractSettlementWizardPage } from "./flows/contract-settlement";
import { PaymentIntentPage } from "./flows/payment-intent";
import DashboardPage from "./pages/dashboard/DashboardPage";
import TenantDashboardPage from "./pages/dashboard/TenantDashboardPage";
import ReportsPage from "./pages/dashboard/ReportsPage";
import MyRoomPage from "./pages/tenant/MyRoomPage";
import RentalHistoryPage from "./pages/tenant/RentalHistoryPage";

// --- ADMIN PAGES ---
import AdminDashboardPage from "./pages/admin/AdminPage";
import UserManagementPage from "./pages/admin/UserManagementPage";
import BlockchainLogsPage from "./pages/admin/BlockchainLogsPage";
import AdminApprovalPage from "./pages/admin/AdminApprovalPage";
import AiAnalyticsPage from "./pages/admin/AiAnalyticsPage";
import AdminSettlementPage from "./pages/admin/AdminSettlementPage";
import AdminReportPage from "./pages/admin/AdminReportPage";
import AppointmentManagePage from "./pages/interaction/AppointmentManagePage";
import AiChatBot from "./components/shared/AiChatBot"; // Nhúng Chatbot Toàn cầu
import VerifyOtpPage from "./pages/auth/VerifyOtpPage";
import ScrollToTop from "./components/shared/ScrollToTop";
import FavoritesPage from "./pages/tenant/FavoritesPage";
import VipPlansPage from "./pages/landlord/VipPlansPage";
import { CompareProvider } from "./context/CompareContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import CompareBar from "./components/property/CompareBar";
import CompareRoomsModal from "./components/property/CompareRoomsModal";
import PageLoader from "./components/shared/PageLoader";

// 1. ProtectedRoute (yêu cầu đăng nhập)
const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <PageLoader />;
  return isAuthenticated ? <Outlet /> : <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} />;
};

// 2. PublicRoute (chặn login/register khi đã đăng nhập)
const PublicRoute = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return null;

  if (isAuthenticated && (location.pathname === "/login" || location.pathname === "/register")) {
    if (user?.role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    
    if (user?.role === 'LANDLORD') {
      return <Navigate to="/landlord/dashboard" replace />;
    }
    
    if (user?.role === 'TENANT') {
      return <Navigate to="/tenant/dashboard" replace />;
    }
    
    return <Navigate to="/" replace />;

  }

  return <Outlet />;
};

// 3. RoleRoute (phân quyền theo role)
const RoleRoute = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  
  if (!allowedRoles.includes(user.role ?? '')) {
    if (user?.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    if (user?.role === 'LANDLORD') return <Navigate to="/landlord/dashboard" replace />;
     if (user?.role === 'TENANT') return <Navigate to="/tenant/dashboard" replace />;
    return <Navigate to="/" replace />;

  }
  
  return <Outlet />;
};

const RoleBasedContractRouteRedirect = ({ target }: { target: "sign" | "payment-intent" | "settle" }) => {
  const { user } = useAuth();
  const location = useLocation();
  const pathParts = location.pathname.split("/").filter(Boolean);
  const contractId = pathParts.at(-2);
  if (!contractId) return <Navigate to="/" replace />;
  if (user?.role === "ADMIN") return <Navigate to="/admin/dashboard" replace />;
  const prefix = user?.role === "LANDLORD" ? "/landlord" : user?.role === "TENANT" ? "/tenant" : null;
  if (!prefix) return <Navigate to="/" replace />;
  return <Navigate to={`${prefix}/contracts/${contractId}/${target}`} replace />;
};

function AppRoutesAndChrome() {
  const [toasterNarrow, setToasterNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setToasterNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <>
      <ScrollToTop />
      <Routes>
          {/* ─── GROUP: PUBLIC PAGES (Có Header/Footer chung) ─── */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            
            {/* PROPERTY ROUTES (public) */}
            <Route path="/properties" element={<PropertiesPage />} />
            <Route path="/properties/:id" element={<PropertyDetailPage />} />
            <Route path="/rooms/:id" element={<RoomDetailPage />} />
            
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/top-landlords" element={<TopLandlordsPage />} />
            <Route path="/landlord/:username/properties" element={<LandlordPropertiesPage />} />

            {/* AUTH ROUTES (chặn nếu đã đăng nhập) */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-otp" element={<VerifyOtpPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>
          </Route>

          {/* ─── GROUP: PROTECTED PAGES (Yêu cầu đăng nhập, có Sidebar) ─── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
 
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/contracts/:id/sign" element={<RoleBasedContractRouteRedirect target="sign" />} />
              <Route path="/contracts/:id/settle" element={<RoleBasedContractRouteRedirect target="settle" />} />
              <Route path="/contracts/:id/payment-intent" element={<RoleBasedContractRouteRedirect target="payment-intent" />} />
              
              {/* === KHU VỰC DÀNH RIÊNG CHO CHỦ TRỌ (LANDLORD) === */}
              <Route path="/landlord" element={<RoleRoute allowedRoles={['LANDLORD']} />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="properties" element={<PropertiesManagePage />} />
                <Route path="properties/:id" element={<PropertyManageDetailPage />} />
                <Route path="properties/:propertyId/rooms/:roomId" element={<PropertyRoomDetailPage />} />
                
                <Route path="finance" element={<BillManagePage />} />
                <Route path="reports" element={<ReportsPage />} />
                
                {/* Hợp đồng & Lịch hẹn của chủ trọ */}
                <Route path="contracts" element={<ContractsPage />} />
                <Route path="contracts/create" element={<CreateContractPage />} />
                <Route path="contracts/:id" element={<ContractDetailPage />} />
                <Route path="contracts/:id/sign" element={<ContractSigningWizardPage />} />
                <Route path="contracts/:id/settle" element={<ContractSettlementWizardPage />} />
                <Route path="contracts/:id/payment-intent" element={<PaymentIntentPage />} />
                <Route path="appointments" element={<AppointmentManagePage />} />
                <Route path="vip" element={<VipPlansPage />} />
              </Route>

              {/* === KHU VỰC DÀNH RIÊNG CHO KHÁCH THUÊ (TENANT) === */}
              <Route path="/tenant" element={<RoleRoute allowedRoles={['TENANT']} />}>
                <Route path="dashboard" element={<TenantDashboardPage />} />
                <Route path="my-room" element={<MyRoomPage />} />
                <Route path="rental-history" element={<RentalHistoryPage />} />
                <Route path="favorites" element={<FavoritesPage />} />
                
                {/* Hợp đồng & Lịch hẹn của khách thuê */}
                <Route path="contracts" element={<ContractsPage />} />
                <Route path="contracts/create" element={<CreateContractPage />} />
                <Route path="contracts/:id" element={<ContractDetailPage />} />
                <Route path="contracts/:id/sign" element={<ContractSigningWizardPage />} />
                <Route path="contracts/:id/settle" element={<ContractSettlementWizardPage />} />
                <Route path="contracts/:id/payment-intent" element={<PaymentIntentPage />} />
                <Route path="appointments" element={<AppointmentManagePage />} />
              </Route>
              
              {/* === KHU VỰC ADMIN === */}
              <Route path="/admin" element={<RoleRoute allowedRoles={['ADMIN']} />}>
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="approvals" element={<AdminApprovalPage />} />
                <Route path="users" element={<UserManagementPage />} />
                <Route path="blockchain-logs" element={<BlockchainLogsPage />} />
                <Route path="ai-analytics" element={<AiAnalyticsPage />} />
                <Route path="settlements" element={<AdminSettlementPage />} />
                <Route path="reports" element={<AdminReportPage />} />
              </Route>
            </Route> 

            

          </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      <Toaster
        position={toasterNarrow ? "top-center" : "top-right"}
        richColors
        closeButton
        duration={5000}
        visibleToasts={5}
      />
      <AiChatBot />
      <CompareBar />
      <CompareRoomsModal />
    </>
  );
}

function App() {
  return (
    <FavoritesProvider>
      <CompareProvider>
        <AppRoutesAndChrome />
      </CompareProvider>
    </FavoritesProvider>
  );
}

export default App;
//test ci cd
