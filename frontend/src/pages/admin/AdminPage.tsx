import React from 'react';
import { 
  LayoutDashboard, 
  Store, 
  Users, 
  CreditCard, 
  ShieldAlert, 
  Server, 
  ChevronRight,
  Search
} from 'lucide-react';

export default function SystemAdminDashboard() {
  // Thống kê cấp hệ thống
  const systemStats = [
    { title: "Tổng Chủ Trọ (Merchants)", value: "1,240", growth: "+12", icon: <Store size={20}/>, color: "text-indigo-600", bg: "bg-indigo-50" },
    { title: "Tổng Khách Thuê", value: "15,600", growth: "+156", icon: <Users size={20}/>, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Doanh thu Platform (MRR)", value: "$12,500", growth: "+8.4%", icon: <CreditCard size={20}/>, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Yêu cầu hỗ trợ", value: "18", growth: "5 khẩn cấp", icon: <ShieldAlert size={20}/>, color: "text-rose-600", bg: "bg-rose-50" },
  ];

  const merchants = [
    { name: "Phòng trọ Hoa Mai", owner: "Nguyễn Văn A", package: "Pro Plan", status: "Active", rooms: 120 },
    { name: "CHDV Harmony", owner: "Lê Thị B", package: "Enterprise", status: "Active", rooms: 450 },
    { name: "Nhà trọ Sinh Viên Q9", owner: "Trần Văn C", package: "Free", status: "Expired", rooms: 15 },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">


      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
            <input 
              type="text" 
              placeholder="Tìm chủ trọ, email..." 
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-64"
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
          {systemStats.map((s, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-default">
              <div className="flex justify-between items-start mb-4">
                <div className={`${s.bg} ${s.color} p-3 rounded-xl`}>{s.icon}</div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">{s.growth}</span>
              </div>
              <p className="text-slate-500 text-sm font-medium">{s.title}</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{s.value}</h3>
            </div>
          ))}
        </div>

        {/* Merchants Management */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h2 className="font-bold text-slate-800 text-lg text-left">Danh sách Chủ trọ mới nhất</h2>
            <button className="text-indigo-600 text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all">
              Tất cả đối tác <ChevronRight size={16}/>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Tên Cơ Sở</th>
                  <th className="px-6 py-4">Chủ Sở Hữu</th>
                  <th className="px-6 py-4">Gói Dịch Vụ</th>
                  <th className="px-6 py-4">Quy Mô</th>
                  <th className="px-6 py-4">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {merchants.map((m, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-700">{m.name}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{m.owner}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        m.package === 'Enterprise' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {m.package}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{m.rooms} phòng</td>
                    <td className="px-6 py-4 text-left">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${m.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        <span className="text-sm font-medium text-slate-700">{m.status}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}