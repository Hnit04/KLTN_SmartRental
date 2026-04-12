import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  Download, Calendar, TrendingUp, Filter,
  DollarSign, FileText, Building2, ArrowUpRight, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { billApi } from '@/api/billApi';
import { contractApi } from '@/api/contractApi';
import { toast } from 'sonner';

export default function ReportsPage() {
  const [year, setYear] = useState('2026');
  const [data, setData] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [reportRes, insightsRes] = await Promise.all([
          billApi.getAnnualReport(parseInt(year)),
          contractApi.getDashboardInsights()
        ]);
        setData(reportRes.data);
        setInsights(insightsRes.data);
      } catch (error) {
        console.error("Failed to fetch reports data:", error);
        toast.error("Không thể tải báo cáo doanh thu.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [year]);

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-gray-500 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-medium">Đang tổng hợp dữ liệu báo cáo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
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
              className="pl-9 pr-8 py-2 border rounded-lg bg-white text-sm focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              <option value="2026">Năm 2026</option>
              <option value="2025">Năm 2025</option>
              <option value="2024">Năm 2024</option>
            </select>
          </div>
          <Button variant="outline" className="flex items-center gap-2" onClick={() => toast.info("Tính năng xuất Excel đang được phát triển.")}>
            <Download className="h-4 w-4" /> Xuất báo cáo
          </Button>
        </div>
      </div>

      {/* --- TỔNG QUAN NHANH --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Tổng doanh thu năm</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {data?.totalAnnualRevenue?.toLocaleString()}đ
            </h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Tăng trưởng so với năm trước</p>
            <h3 className={`text-2xl font-bold ${data?.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data?.growthRate >= 0 ? '+' : ''}{data?.growthRate?.toFixed(1)}%
            </h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="h-12 w-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Khu trọ hiệu quả nhất</p>
            <h3 className="text-lg font-bold text-gray-800 line-clamp-1">
              {data?.bestPerformingProperty || "N/A"}
            </h3>
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
              <BarChart data={data?.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(v) => `${v / 1000000}M`} />
                <Tooltip 
                   formatter={(value: any) => [`${value.toLocaleString()} đ`, '']}
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
            <Filter className="h-5 w-5 text-orange-600" /> Cơ cấu nguồn thu (%)
          </h3>
          <div className="h-[350px] w-full flex flex-col md:flex-row items-center">
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.distribution}
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data?.distribution?.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-4 min-w-[150px]">
               {data?.distribution?.map((item: any) => (
                 <div key={item.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <div className="text-sm">
                       <p className="text-gray-500">{item.name}</p>
                       <p className="font-bold">{item.value?.toFixed(1)}%</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* --- BIỂU ĐỒ TỶ LỆ LẤP ĐẦY (Mới) --- */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-600" /> Xu hướng phát triển (Tỷ lệ lấp đầy)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={insights?.occupancyTrend}>
                <defs>
                  <linearGradient id="colorO" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} unit="%" domain={[0, 100]} />
                <Tooltip 
                   formatter={(value: any) => [`${value.toFixed(1)} %`, 'Tỷ lệ lấp đầy']}
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="rate" stroke="#6366f1" fillOpacity={1} fill="url(#colorO)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-4 text-sm text-gray-500 text-center">
            Biểu đồ thể hiện khả năng tối ưu hóa tài sản trong 6 tháng gần nhất.
          </p>
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
               {data?.propertyDetails?.map((item: any) => (
                 <tr key={item.name} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{item.totalRooms}</td>
                    <td className="px-6 py-4 text-right font-bold text-primary">{item.revenue?.toLocaleString()}đ</td>
                    <td className="px-6 py-4">
                       <div className="flex justify-center">
                        {item.trend === 'up' ? (
                          <span className="flex items-center text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                            <ArrowUpRight className="h-3 w-3 mr-1" /> Tăng
                          </span>
                        ) : (
                          <span className="flex items-center text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
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
          {(!data?.propertyDetails || data.propertyDetails.length === 0) && (
            <div className="p-10 text-center text-gray-400">
              Chưa có dữ liệu hóa đơn nào được ghi nhận trong năm này.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}