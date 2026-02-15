import { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  Download, Filter, Calendar, TrendingUp, 
  DollarSign, FileText, Building2, ArrowUpRight 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Mock data cho báo cáo doanh thu theo tháng
const MONTHLY_REVENUE = [
  { month: 'T10', rent: 40, service: 12 },
  { month: 'T11', rent: 45, service: 15 },
  { month: 'T12', rent: 42, service: 14 },
  { month: 'T01', rent: 50, service: 18 },
  { month: 'T02', rent: 48, service: 16 },
  { month: 'T03', rent: 55, service: 20 },
];

// Dữ liệu phân bổ nguồn thu
const REVENUE_DISTRIBUTION = [
  { name: 'Tiền phòng', value: 70, color: '#3b82f6' },
  { name: 'Tiền điện', value: 15, color: '#f59e0b' },
  { name: 'Tiền nước', value: 8, color: '#0ea5e9' },
  { name: 'Dịch vụ khác', value: 7, color: '#10b981' },
];

export default function ReportsPage() {
  const [year, setYear] = useState('2026');

  return (
    <div className="space-y-6 pb-20">
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Báo cáo doanh thu</h1>
          <p className="text-sm text-gray-500 mt-1">Phân tích chi tiết dòng tiền và hiệu quả kinh doanh.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select 
              className="pl-9 pr-4 py-2 border rounded-lg bg-white text-sm focus:ring-2 focus:ring-primary outline-none"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              <option value="2026">Năm 2026</option>
              <option value="2025">Năm 2025</option>
            </select>
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Xuất báo cáo (Excel)
          </Button>
        </div>
      </div>

      {/* --- TỔNG QUAN NHANH --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Tổng doanh thu năm</p>
            <h3 className="text-2xl font-bold text-gray-900">750.000.000đ</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Tăng trưởng so với 2025</p>
            <h3 className="text-2xl font-bold text-blue-600">+15.2%</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Khu trọ hiệu quả nhất</p>
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">Trọ KTX Sinh Viên</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* --- BIỂU ĐỒ DOANH THU KẾT HỢP --- */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" /> Phân tích doanh thu hàng tháng
          </h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_REVENUE}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(v) => `${v}M`} />
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar name="Tiền phòng" dataKey="rent" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar name="Dịch vụ" dataKey="service" fill="#93c5fd" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* --- BIỂU ĐỒ CƠ CẤU NGUỒN THU --- */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Filter className="h-5 w-5 text-orange-600" /> Cơ cấu nguồn thu
          </h3>
          <div className="h-[350px] w-full flex flex-col md:flex-row items-center">
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={REVENUE_DISTRIBUTION}
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {REVENUE_DISTRIBUTION.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-4 min-w-[150px]">
               {REVENUE_DISTRIBUTION.map((item) => (
                 <div key={item.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <div className="text-sm">
                       <p className="text-gray-500">{item.name}</p>
                       <p className="font-bold">{item.value}%</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>

      {/* --- BẢNG CHI TIẾT THEO KHU VỰC --- */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b">
           <h3 className="font-bold text-gray-900">Chi tiết doanh thu theo Khu trọ</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold">
              <tr>
                <th className="px-6 py-4">Khu trọ</th>
                <th className="px-6 py-4 text-center">Tổng phòng</th>
                <th className="px-6 py-4 text-right">Doanh thu năm</th>
                <th className="px-6 py-4 text-center">Trạng thái</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
               {[
                 { name: 'Trọ KTX Sinh Viên', total: 20, revenue: 420000000, trend: 'up' },
                 { name: 'Chung cư Mini Gò Vấp', total: 10, revenue: 210000000, trend: 'up' },
                 { name: 'Nhà Nguyên Căn Quận 12', total: 5, revenue: 120000000, trend: 'down' },
               ].map((item) => (
                 <tr key={item.name} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{item.total}</td>
                    <td className="px-6 py-4 text-right font-bold text-primary">{item.revenue.toLocaleString()}đ</td>
                    <td className="px-6 py-4">
                       <div className="flex justify-center">
                        {item.trend === 'up' ? (
                          <span className="flex items-center text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                            <ArrowUpRight className="h-3 w-3 mr-1" /> Tăng
                          </span>
                        ) : (
                          <span className="flex items-center text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                             Ổn định
                          </span>
                        )}
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <Button variant="ghost" size="sm" className="text-gray-400 hover:text-primary">
                          <FileText className="h-4 w-4" />
                       </Button>
                    </td>
                 </tr>
               ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}