import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { userApi } from '@/api/userApi';
import { propertyApi } from '@/api/propertyApi';
import { contractApi } from '@/api/contractApi';
import { 
  Users, 
  Building, 
  ShieldCheck, 
  FileText,
  ChevronRight,
  Search,
  Loader2,
  AlertCircle,
  LayoutDashboard
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SystemAdminDashboard() {
  // 1. Fetch data from APIs
  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ['users', 'TENANT'],
    queryFn: () => userApi.getUsersByRole('TENANT'),
  });

  const { data: landlords = [], isLoading: landlordsLoading } = useQuery({
    queryKey: ['users', 'LANDLORD'],
    queryFn: () => userApi.getUsersByRole('LANDLORD'),
  });

  const { data: pendingProperties = [], isLoading: propsLoading } = useQuery({
    queryKey: ['properties', 'pending'],
    queryFn: async () => {
      const res = await propertyApi.getPendingProperties();
      return (res as any).data || res;
    },
  });

  const { data: pendingRooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms', 'pending'],
    queryFn: async () => {
      const res = await propertyApi.getPendingRooms();
      return (res as any).data || res;
    },
  });

  const { data: allContracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['contracts', 'all'],
    queryFn: async () => {
      const res = await contractApi.getAll();
      return (res as any).data || res;
    },
  });

  const isLoading = tenantsLoading || landlordsLoading || propsLoading || roomsLoading || contractsLoading;

  // 2. Process Calculations
  const totalUsers = tenants.length + landlords.length;
  const pendingKYC = [...tenants, ...landlords].filter(u => u.kycStatus === 'PENDING').length;
  const pendingApprovals = pendingProperties.length + pendingRooms.length;
  const activeContracts = (allContracts as any[]).filter(c => c.status === 'ACTIVE').length;

  const systemStats = [
    { 
      title: "Tổng Người dùng", 
      value: totalUsers, 
      growth: `+${tenants.length} khách, ${landlords.length} chủ`, 
      icon: <Users size={20}/>, 
      color: "text-indigo-600", 
      bg: "bg-indigo-50",
      link: "/admin/users"
    },
    { 
      title: "Tin đăng chờ duyệt", 
      value: pendingApprovals, 
      growth: `${pendingProperties.length} khu, ${pendingRooms.length} phòng`, 
      icon: <Building size={20}/>, 
      color: "text-amber-600", 
      bg: "bg-amber-50",
      link: "/admin/approvals"
    },
    { 
      title: "Định danh chờ duyệt", 
      value: pendingKYC, 
      growth: "Cần xác thực KYC", 
      icon: <ShieldCheck size={20}/>, 
      color: "text-emerald-600", 
      bg: "bg-emerald-50",
      link: "/admin/users" 
    },
    { 
      title: "Hợp đồng hiệu lực", 
      value: activeContracts, 
      growth: `${(allContracts as any[]).length} tổng số`, 
      icon: <FileText size={20}/>, 
      color: "text-blue-600", 
      bg: "bg-blue-50",
      link: "/admin/blockchain-logs"
    },
  ];

  // Latest Landlords (Merchants)
  const recentLandlords = [...landlords]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-500 font-medium">Đang tải dữ liệu hệ thống...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <LayoutDashboard className="text-indigo-600" />
              Hệ thống Quản trị SmartRental
            </h1>
            <p className="text-slate-500 text-sm mt-1">Tổng quan vận hành và kiểm duyệt Platform</p>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
            <input 
              type="text" 
              placeholder="Tìm kiếm nhanh..." 
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-64"
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
          {systemStats.map((s, i) => (
            <Link key={i} to={s.link} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className={`${s.bg} ${s.color} p-3 rounded-xl group-hover:scale-110 transition-transform`}>{s.icon}</div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded ${s.value > 0 ? 'text-amber-600 bg-amber-50' : 'text-slate-400 bg-slate-50'}`}>
                  {s.growth}
                </span>
              </div>
              <p className="text-slate-500 text-sm font-medium">{s.title}</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{s.value}</h3>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Merchants Management (LEFT - 2/3) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800 text-lg">Chủ trọ mới gia nhập</h2>
              <Link to="/admin/users" className="text-indigo-600 text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                Quản lý User <ChevronRight size={16}/>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Họ và tên</th>
                    <th className="px-6 py-4">Liên hệ</th>
                    <th className="px-6 py-4">Định danh (KYC)</th>
                    <th className="px-6 py-4">Uy tín</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentLandlords.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">Chưa có chủ trọ nào</td>
                    </tr>
                  ) : (
                    recentLandlords.map((m, i) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-700">{m.fullName || m.username}</div>
                          <div className="text-[10px] text-slate-400">ID: #{m.id}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-slate-600 text-sm">{m.phoneNumber || '—'}</div>
                          <div className="text-[11px] text-indigo-500">{m.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            m.kycStatus === 'VERIFIED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            m.kycStatus === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                          }`}>
                            {m.kycStatus || 'Chưa nộp'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`text-sm font-bold ${m.reputationScore >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                              {m.reputationScore}/100
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* System Alerts / Actions (RIGHT - 1/3) */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <AlertCircle size={18} className="text-amber-500" />
                Việc cần xử lý
              </h3>
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-xs text-amber-800 font-semibold uppercase tracking-wider mb-1">Tin đăng chờ duyệt</p>
                  <p className="text-sm text-amber-700">Hiện có <span className="font-bold text-lg">{pendingApprovals}</span> mục đang chờ bạn phê duyệt.</p>
                  <Link to="/admin/approvals" className="mt-2 block text-xs font-bold text-amber-900 underline">Đến trang phê duyệt →</Link>
                </div>
                
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-xs text-indigo-800 font-semibold uppercase tracking-wider mb-1">Xác thực danh tính</p>
                  <p className="text-sm text-indigo-700">Có <span className="font-bold text-lg">{pendingKYC}</span> hồ sơ KYC đang chờ kiểm tra thủ công.</p>
                  <Link to="/admin/users" className="mt-2 block text-xs font-bold text-indigo-900 underline">Kiểm tra ngay →</Link>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-2xl shadow-lg text-white">
              <h3 className="font-bold text-lg mb-2">Bảo mật & Blockchain</h3>
              <p className="text-indigo-100 text-sm mb-4">Mọi hợp đồng đều được giám sát tính toàn vẹn thông qua Smart Contract trên mạng Sepolia.</p>
              <Link to="/admin/blockchain-logs" className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold transition-all">
                Kiểm tra Logs <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}