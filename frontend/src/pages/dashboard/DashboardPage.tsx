import { 
  TrendingUp, Users, Home as HomeIcon, AlertCircle, 
  Wallet, ArrowUpRight, Clock 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';

// Dữ liệu Mock cho Biểu đồ Doanh thu (Sẽ thay bằng API sau)
const REVENUE_DATA = [
  { name: 'T10/25', total: 45000000 },
  { name: 'T11/25', total: 52000000 },
  { name: 'T12/25', total: 48000000 },
  { name: 'T01/26', total: 61000000 },
  { name: 'T02/26', total: 59000000 },
  { name: 'T03/26', total: 65000000 },
];

export default function DashboardPage() {
  // Trong thực tế, bạn sẽ dùng useEffect gọi API ở đây để lấy các con số thống kê thực tế

  return (
    <div className="space-y-6 pb-20">
      
      {/* --- HEADER --- */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tổng quan kinh doanh</h1>
        <p className="text-sm text-gray-500 mt-1">Xin chào, đây là tình hình khu trọ của bạn hôm nay.</p>
      </div>

      {/* --- 4 THẺ THỐNG KÊ (KPI CARDS) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Doanh thu tháng này */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Doanh thu (Tháng này)</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">65.000.000đ</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Wallet className="h-5 w-5" /></div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="flex items-center text-green-600 font-medium">
              <ArrowUpRight className="h-4 w-4 mr-1" /> 12.5%
            </span>
            <span className="text-gray-400 ml-2">so với tháng trước</span>
          </div>
        </div>

        {/* Tỷ lệ lấp đầy (Dựa vào Room Status) */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Tỷ lệ lấp đầy</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">85%</h3>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><HomeIcon className="h-5 w-5" /></div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-600 font-medium">17/20 Phòng</span>
            <span className="text-gray-400 ml-2">đang có khách thuê</span>
          </div>
        </div>

        {/* Khách thuê đang ở (Dựa vào Contract ACTIVE) */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Khách thuê</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">42</h3>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><Users className="h-5 w-5" /></div>
          </div>
          <div className="mt-4 flex items-center text-sm">
             <span className="text-gray-400">Dựa trên hợp đồng đang hiệu lực</span>
          </div>
        </div>

        {/* Cảnh báo nợ đọng (Dựa vào BillStatus) */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Hóa đơn chưa thu</p>
              <h3 className="text-2xl font-bold text-red-600 mt-1">3</h3>
            </div>
            <div className="p-2 bg-red-50 rounded-lg text-red-600"><AlertCircle className="h-5 w-5" /></div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-red-600 font-medium">~ 12.500.000đ</span>
            <span className="text-gray-400 ml-2">đang chờ thanh toán</span>
          </div>
        </div>
      </div>

      {/* --- KHU VỰC BIỂU ĐỒ & DANH SÁCH --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* BIỂU ĐỒ DOANH THU */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Biểu đồ doanh thu 6 tháng</h3>
            <select className="text-sm border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary">
              <option>Năm nay</option>
              <option>Năm ngoái</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  tickFormatter={(value) => `${value / 1000000}M`}
                />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  // ✅ Fix lỗi formatter bằng cách gán type any hoặc dùng Number()
                  formatter={(value: any) => [`${Number(value).toLocaleString()} đ`, 'Doanh thu']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DANH SÁCH CẦN CHÚ Ý (TO-DO LIST) */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" /> Cần xử lý ngay
          </h3>
          
          <div className="space-y-4 flex-1">
            {/* Hóa đơn quá hạn */}
            <div className="p-3 border rounded-lg bg-red-50/50 border-red-100 flex gap-3 items-start">
               <div className="bg-red-100 p-2 rounded text-red-600 shrink-0"><Clock className="h-4 w-4" /></div>
               <div>
                 <p className="text-sm font-bold text-gray-900">Phòng 202 quá hạn thanh toán</p>
                 <p className="text-xs text-gray-500 mt-0.5">Hóa đơn T02/2026 - Trễ 5 ngày</p>
                 <Link to="/finance" className="text-xs font-bold text-red-600 mt-2 inline-block hover:underline">Gửi nhắc nhở &rarr;</Link>
               </div>
            </div>

            {/* Hợp đồng chờ ký */}
            <div className="p-3 border rounded-lg bg-yellow-50/50 border-yellow-100 flex gap-3 items-start">
               <div className="bg-yellow-100 p-2 rounded text-yellow-700 shrink-0"><TrendingUp className="h-4 w-4" /></div>
               <div>
                 <p className="text-sm font-bold text-gray-900">Yêu cầu thuê mới: Phòng 105</p>
                 <p className="text-xs text-gray-500 mt-0.5">Khách: Lê Văn Dũng</p>
                 <Link to="/contracts" className="text-xs font-bold text-yellow-700 mt-2 inline-block hover:underline">Xem hợp đồng nháp &rarr;</Link>
               </div>
            </div>

            {/* Phòng sắp trống */}
            <div className="p-3 border rounded-lg bg-gray-50 flex gap-3 items-start">
               <div className="bg-gray-200 p-2 rounded text-gray-600 shrink-0"><HomeIcon className="h-4 w-4" /></div>
               <div>
                 <p className="text-sm font-bold text-gray-900">Phòng 301 sắp hết hạn</p>
                 <p className="text-xs text-gray-500 mt-0.5">Hết hạn vào: 15/03/2026</p>
               </div>
            </div>
          </div>

          {/* ✅ Fix lỗi asChild bằng cách bọc Link bên ngoài Button */}
          <Link to="/contracts" className="w-full mt-4 block">
            <Button variant="outline" className="w-full">
              Xem tất cả công việc
            </Button>
          </Link>
        </div>
      </div>

    </div>
  );
}