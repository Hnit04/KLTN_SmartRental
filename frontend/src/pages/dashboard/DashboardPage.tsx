import { useEffect, useState } from 'react';
import { 
  TrendingUp, Users, Home as HomeIcon, AlertCircle, 
  Wallet, ArrowUpRight, ArrowDownRight, Clock 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';
import { billApi } from '@/api/billApi'; 
import { roomApi } from '@/api/roomApi';

// Dữ liệu Mock cho Biểu đồ Doanh thu (Sẽ thay bằng API sau nếu cần)
const REVENUE_DATA = [
  { name: 'T10/25', total: 45000000 },
  { name: 'T11/25', total: 52000000 },
  { name: 'T12/25', total: 48000000 },
  { name: 'T01/26', total: 61000000 },
  { name: 'T02/26', total: 59000000 },
  { name: 'T03/26', total: 65000000 },
];

export default function DashboardPage() {
  const [thisMonthRevenue, setThisMonthRevenue] = useState<number>(0);
  const [lastMonthRevenue, setLastMonthRevenue] = useState<number>(0);
  const [percentageChange, setPercentageChange] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [occupiedRooms, setOccupiedRooms] = useState<number>(0);
  const [totalRooms, setTotalRooms] = useState<number>(0);
  const [occupancyRate, setOccupancyRate] = useState<number>(0);
  const [totalTenants, setTotalTenants] = useState<number>(0);
  const [occupancyLoading, setOccupancyLoading] = useState<boolean>(true);
  const [occupancyError, setOccupancyError] = useState<string | null>(null);
  const [overdueCount, setOverdueCount] = useState<number>(0);
  const [overdueAmount, setOverdueAmount] = useState<number>(0);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        setLoading(true);
        const response = await billApi.getRevenueThisAndLastMonth();
        const data = response.data;
        
        const thisRev = data.thisMonth?.totalRevenue || 0;
        const lastRev = data.lastMonth?.totalRevenue || 0;

        setThisMonthRevenue(thisRev);
        setLastMonthRevenue(lastRev);

        // Tính % thay đổi
        if (lastRev > 0) {
          const change = ((thisRev - lastRev) / lastRev) * 100;
          setPercentageChange(change);
        } else if (thisRev > 0) {
          setPercentageChange(100); 
        } else {
          setPercentageChange(0);
        }
      } catch (err: any) {
        console.error("Lỗi khi lấy doanh thu:", err);
        setError("Không thể tải dữ liệu doanh thu");
      } finally {
        setLoading(false);
      }
    };

    const fetchOccupancy = async () => {
      try {
        setOccupancyLoading(true);
        const response = await roomApi.getLandlordRoomStats();
        const data = response.data;
        setOccupiedRooms(data.rentedRooms || 0);
        setTotalRooms(data.totalRooms || 0);
        setOccupancyRate(
          data.totalRooms > 0
            ? Number(((data.rentedRooms / data.totalRooms) * 100).toFixed(2))
            : 0
        );      
        setTotalTenants(data.totalTenants || 0);
      } catch (err: any) {
        console.error("Lỗi khi lấy thống kê phòng:", err);
        setOccupancyError("Không thể tải dữ liệu phòng");
      } finally {
        setOccupancyLoading(false);
      }
    };

    const fetchOverdueStats = async () => {
      try {
        const response = await billApi.getOverdueStats();
        const data = response.data;
        setOverdueCount(data.overdueBillCount || 0);
        setOverdueAmount(data.overdueAmount || 0);
      } catch (err: any) {
        console.error("Lỗi khi lấy thống kê nợ đọng:", err);
      }
    };

    const fetchRevenueLast6Months = async () => {
      try {
            const response = await billApi.getRevenueLast6Months();
            setRevenueData(response.data);
            console.log("Dữ liệu doanh thu 6 tháng:", response.data);
        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu doanh thu:", error);
        }
    };
    fetchRevenueLast6Months();

    fetchOverdueStats();

    fetchRevenue();
    fetchOccupancy();
  }, []);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('vi-VN') + 'đ';
  };

  const isPositiveChange = percentageChange >= 0;

  return (
    <div className="space-y-6 pb-20">
      
      {/* --- HEADER --- */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tổng quan kinh doanh</h1>
        <p className="text-sm text-gray-500 mt-1">Xin chào, đây là tình hình khu trọ của bạn hôm nay.</p>
      </div>

      {/* --- 4 THẺ THỐNG KÊ (KPI CARDS) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Doanh thu tháng này - Dùng dữ liệu từ API */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Doanh thu (Tháng này)</p>
              {loading ? (
                <h3 className="text-2xl font-bold text-gray-900 mt-1">Đang tải...</h3>
              ) : error ? (
                <h3 className="text-2xl font-bold text-red-600 mt-1">Lỗi</h3>
              ) : (
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(thisMonthRevenue)}
                </h3>
              )}
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            {loading || error ? (
              <span className="text-gray-400">—</span>
            ) : (
              <>
                <span 
                  className={`flex items-center font-medium ${
                    isPositiveChange ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {isPositiveChange ? (
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 mr-1" />
                  )}
                  {Math.abs(percentageChange).toFixed(1)}%
                </span>
                <span className="text-gray-400 ml-2">so với tháng trước</span>
              </>
            )}
          </div>
        </div>

        {/* Tỷ lệ lấp đầy */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Tỷ lệ lấp đầy</p>
              {occupancyLoading ? (
                <h3 className="text-2xl font-bold text-gray-900 mt-1">Đang tải...</h3>
              ) : occupancyError ? (
                <h3 className="text-2xl font-bold text-red-600 mt-1">Lỗi</h3>
              ) : (
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {occupancyRate}%
                </h3>
              )}
            </div>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <HomeIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            {occupancyLoading || occupancyError ? (
              <span className="text-gray-400">—</span>
            ) : (
              <span className="text-gray-600 font-medium">{occupiedRooms}/{totalRooms} Phòng</span>
            )}
            <span className="text-gray-400 ml-2">đang có khách thuê</span>
          </div>
        </div>

        {/* Khách thuê đang ở */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Khách thuê</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalTenants}</h3>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-400">Dựa trên hợp đồng đang hiệu lực</span>
          </div>
        </div>

        {/* Cảnh báo nợ đọng */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Hóa đơn quá hạn</p>
              {loading ? (
                <h3 className="text-2xl font-bold text-red-600 mt-1">Đang tải...</h3>
              ) : (
                <h3 className="text-2xl font-bold text-red-600 mt-1">
                  {overdueCount}
                </h3>
              )}
            </div>
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-red-600 font-medium">
              {overdueAmount.toLocaleString('vi-VN')}đ
            </span>
            <span className="text-gray-400 ml-2">đang chờ thanh toán</span>
          </div>
</div>
      </div>

      {/* Phần còn lại giữ nguyên (biểu đồ + to-do list) */}
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
              <BarChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  formatter={(value: any) => [`${Number(value).toLocaleString()} đ`, 'Doanh thu']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DANH SÁCH CẦN CHÚ Ý */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" /> Cần xử lý ngay
          </h3>
          
          <div className="space-y-4 flex-1">
            {/* ... giữ nguyên nội dung to-do list ... */}
          </div>

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