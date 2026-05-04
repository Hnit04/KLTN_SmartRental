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
import { contractApi } from '@/api/contractApi';

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
  const [insights, setInsights] = useState<any>(null);
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
    const fetchDashboardInsights = async () => {
      try {
        const response = await contractApi.getDashboardInsights();
        setInsights(response.data);
      } catch (error) {
        console.error("Lỗi khi lấy thông tin chi tiết dashboard:", error);
      }
    };

    const fetchAllStats = () => {
      fetchRevenueLast6Months();
      fetchOverdueStats();
      fetchRevenue();
      fetchOccupancy();
      fetchDashboardInsights();
    };

    fetchAllStats();

    const handleRefresh = (e: any) => {
      console.log("🔄 [Realtime] Refreshing Dashboard Stats...", e.detail);
      fetchAllStats();
    };

    window.addEventListener('app:refresh-data', handleRefresh);
    return () => window.removeEventListener('app:refresh-data', handleRefresh);
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
        <Link to="/landlord/reports" className="bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 group-hover:text-primary transition-colors">Doanh thu (Tháng này)</p>
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
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            {loading || error ? (
              <span className="text-gray-400">—</span>
            ) : (
              <>
                <span
                  className={`flex items-center font-medium ${isPositiveChange ? 'text-green-600' : 'text-red-600'
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
        </Link>

        {/* Dự kiến thu (Tháng tới) */}
        <Link to="/landlord/reports" className="bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 group-hover:text-primary transition-colors">Dự kiến thu (Tháng tới)</p>
              <h3 className="text-2xl font-bold text-blue-600 mt-1">
                {formatCurrency(insights?.projectedRevenue || 0)}
              </h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            Dựa trên các hợp đồng đang hiệu lực
          </p>
        </Link>

        {/* Tiền thất thoát (Phòng trống) */}
        <Link to="/landlord/properties" className="bg-white p-6 rounded-2xl border shadow-sm border-l-4 border-l-red-500 hover:shadow-md transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 text-red-600">Thất thoát (Phòng trống)</p>
              <h3 className="text-2xl font-bold text-red-600 mt-1">
                -{formatCurrency(insights?.opportunityCost || 0)}
              </h3>
            </div>
            <div className="p-2 bg-red-50 rounded-lg text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-xs text-red-400 font-medium">
             Cần đẩy nhanh việc tìm khách thuê
          </p>
        </Link>

        {/* Tỷ lệ lấp đầy */}
        <Link to="/landlord/properties" className="bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 group-hover:text-primary transition-colors">Tỷ lệ lấp đầy</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {occupancyRate}%
              </h3>
            </div>
            <div className="p-2 bg-green-50 rounded-lg text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all">
              <HomeIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${occupancyRate}%` }} />
            </div>
            <span className="text-xs text-gray-400 font-medium">{occupiedRooms}/{totalRooms} phòng</span>
          </div>
        </Link>
      </div>

      {/* Phần còn lại giữ nguyên (biểu đồ + to-do list) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* BIỂU ĐỒ DOANH THU */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Biểu đồ doanh thu 6 tháng</h3>
            <span className="text-sm text-gray-500 font-medium bg-gray-50 px-3 py-1.5 rounded-lg border">{new Date().getFullYear()}</span>
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
            {overdueCount > 0 && (
              <Link to="/landlord/finance" className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100 hover:border-red-300 transition-all group">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-900 group-hover:text-red-600 transition-colors">{overdueCount} hóa đơn quá hạn</p>
                  <p className="text-xs text-red-700">Tổng cộng {overdueAmount.toLocaleString()}đ chưa thu hồi.</p>
                </div>
              </Link>
            )}

            {insights?.expiringContractsCount > 0 && (
              <div className="space-y-2">
                <Link to="/landlord/contracts" className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100 hover:border-amber-300 transition-all group">
                  <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-900 group-hover:text-amber-600 transition-colors">{insights.expiringContractsCount} hợp đồng sắp hết hạn</p>
                    <p className="text-xs text-amber-700">Trong 30 ngày tới. Cần liên hệ khách sớm.</p>
                  </div>
                </Link>
                {insights.expiringContracts?.slice(0, 3).map((c: any) => (
                  <Link
                    key={c.contractId}
                    to={`/landlord/contracts/${c.contractId}`}
                    className="flex items-center gap-3 p-2.5 bg-amber-50/50 rounded-lg border border-amber-50 hover:border-amber-200 transition-all ml-8 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-800">Phòng {c.roomName}</span>
                      <span className="text-gray-400 mx-1">·</span>
                      <span className="text-gray-500">{c.tenantName}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      c.daysLeft <= 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      còn {c.daysLeft} ngày
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {occupancyRate < 100 && (
              <Link to="/landlord/properties" className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100 hover:border-blue-300 transition-all group">
                <HomeIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-blue-900 group-hover:text-blue-600 transition-colors">Phòng trống cần cho thuê</p>
                  <p className="text-xs text-blue-700">Còn {totalRooms - occupiedRooms} phòng đang trống.</p>
                </div>
              </Link>
            )}
            
            {insights?.latePaymentRoomsCount > 0 && (
              <Link to="/landlord/contracts" className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl border border-purple-100 hover:border-purple-300 transition-all group">
                <Users className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-purple-900 group-hover:text-purple-600 transition-colors">{insights.latePaymentRoomsCount} phòng đóng tiền trễ</p>
                  <p className="text-xs text-purple-700">Cần có biện pháp nhắc nhở hoặc đánh giá uy tín.</p>
                </div>
              </Link>
            )}
          </div>

          <Link to="/landlord/contracts" className="w-full mt-4 block">
            <Button variant="outline" className="w-full">
              Xem tất cả công việc
            </Button>
          </Link>
        </div>
      </div>

    </div>
  );
}