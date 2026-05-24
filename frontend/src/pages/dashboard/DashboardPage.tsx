import { useEffect, useState } from 'react';
import {
  TrendingUp, Users, Home as HomeIcon, AlertCircle,
  Wallet, ArrowUpRight, ArrowDownRight, Clock
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatKpiCard, DashboardPanel } from '@/components/dashboard';
import { Link } from 'react-router-dom';
import { billApi } from '@/api/billApi';
import { roomApi } from '@/api/roomApi';
import { contractApi } from '@/api/contractApi';
import { formatCurrency } from '@/utils/format';


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

  const isPositiveChange = percentageChange >= 0;

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title="Tổng quan kinh doanh"
        description="Tình hình doanh thu, lấp đầy và việc cần xử lý — cập nhật theo dữ liệu thực tế."
        actions={
          <Link to="/landlord/reports">
            <Button variant="outline" size="sm" className="shadow-xs">
              Báo cáo chi tiết
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
        <StatKpiCard
          to="/landlord/reports"
          icon={<Wallet className="h-5 w-5" />}
          iconClassName="text-sky-600"
          label="Doanh thu (tháng này)"
          value={
            loading ? '…' : error ? 'Lỗi' : formatCurrency(thisMonthRevenue)
          }
          description={
            loading || error ? (
              '—'
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <span className={isPositiveChange ? 'font-semibold text-emerald-600' : 'font-semibold text-red-600'}>
                  {isPositiveChange ? <ArrowUpRight className="inline h-3.5 w-3.5" /> : <ArrowDownRight className="inline h-3.5 w-3.5" />}
                  {Math.abs(percentageChange).toFixed(1)}%
                </span>
                <span className="text-muted-foreground">so với tháng trước</span>
              </span>
            )
          }
        />

        <StatKpiCard
          to="/landlord/reports"
          icon={<TrendingUp className="h-5 w-5" />}
          iconClassName="text-primary"
          label="Dự kiến thu (tháng tới)"
          value={formatCurrency(insights?.projectedRevenue || 0)}
          description="Dựa trên hợp đồng đang hiệu lực"
        />

        <StatKpiCard
          to="/landlord/properties"
          icon={<AlertCircle className="h-5 w-5" />}
          iconClassName="text-red-600"
          label="Thất thoát (phòng trống)"
          value={`-${formatCurrency(insights?.opportunityCost || 0)}`}
          description="Ưu tiên tìm khách để giảm phần trống"
          className="border-l-4 border-l-red-500"
        />

        <StatKpiCard
          to="/landlord/properties"
          icon={<HomeIcon className="h-5 w-5" />}
          iconClassName="text-emerald-600"
          label="Tỷ lệ lấp đầy"
          value={`${occupancyLoading ? '…' : occupancyError ? '—' : `${occupancyRate}%`}`}
          footer={
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, occupancyRate)}%` }}
                />
              </div>
              <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                {occupiedRooms}/{totalRooms} phòng
              </span>
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DashboardPanel
          className="lg:col-span-2"
          title="Biểu đồ doanh thu 6 tháng"
          action={
            <span className="rounded-lg border border-border/60 bg-muted/30 px-3 py-1 text-xs font-semibold text-muted-foreground">
              {new Date().getFullYear()}
            </span>
          }
        >
          <div className="min-h-[300px] w-full px-4 pb-5 pt-2 sm:px-6">
            <ResponsiveContainer width="100%" height={300} minWidth={1} minHeight={1}>
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
        </DashboardPanel>

        <DashboardPanel
          title="Cần xử lý ngay"
          description="Ưu tiên thu nợ, gia hạn và lấp phòng trống"
          action={<AlertCircle className="h-5 w-5 shrink-0 text-amber-500" aria-hidden />}
        >
          <div className="flex flex-1 flex-col space-y-4 p-4 sm:p-5">
            {overdueCount > 0 && (
              <Link to="/landlord/finance" className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100 hover:border-red-300 hover:shadow-sm transition-all duration-200 group">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-900 group-hover:text-red-600 transition-colors">{overdueCount} hóa đơn quá hạn</p>
                  <p className="text-xs text-red-700">Tổng cộng {overdueAmount.toLocaleString()}đ chưa thu hồi.</p>
                </div>
              </Link>
            )}

            {insights?.expiringContractsCount > 0 && (
              <div className="space-y-2">
                <Link to="/landlord/contracts" className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100 hover:border-amber-300 hover:shadow-sm transition-all duration-200 group">
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
              <Link to="/landlord/properties" className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100 hover:border-blue-300 hover:shadow-sm transition-all duration-200 group">
                <HomeIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-blue-900 group-hover:text-blue-600 transition-colors">Phòng trống cần cho thuê</p>
                  <p className="text-xs text-blue-700">Còn {totalRooms - occupiedRooms} phòng đang trống.</p>
                </div>
              </Link>
            )}
            
            {insights?.latePaymentRoomsCount > 0 && (
              <Link to="/landlord/contracts" className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl border border-purple-100 hover:border-purple-300 hover:shadow-sm transition-all duration-200 group">
                <Users className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-purple-900 group-hover:text-purple-600 transition-colors">{insights.latePaymentRoomsCount} phòng đóng tiền trễ</p>
                  <p className="text-xs text-purple-700">Cần có biện pháp nhắc nhở hoặc đánh giá uy tín.</p>
                </div>
              </Link>
            )}

            <Link to="/landlord/contracts" className="mt-auto block w-full pt-2">
              <Button variant="outline" className="w-full shadow-xs">
                Xem tất cả công việc
              </Button>
            </Link>
          </div>
        </DashboardPanel>
      </div>

    </div>
  );
}
