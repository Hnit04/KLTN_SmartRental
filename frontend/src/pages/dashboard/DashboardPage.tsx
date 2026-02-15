import { Home, Users, Wallet, AlertCircle, TrendingUp, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const DashboardPage = () => {
    const { user } = useAuth();

    // Dữ liệu giả lập (Sau này lấy từ API)
    const stats = [
        { title: 'Khu trọ / Phòng', value: '2 / 15', icon: Home, color: 'text-blue-500', bg: 'bg-blue-100' },
        { title: 'Khách đang thuê', value: '12', icon: Users, color: 'text-green-500', bg: 'bg-green-100' },
        { title: 'Doanh thu tháng này', value: '32.500.000đ', icon: Wallet, color: 'text-purple-500', bg: 'bg-purple-100' },
        { title: 'Hóa đơn chưa thanh toán', value: '3', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100' },
    ];

    return (
        <div className="space-y-6">
            {/* Tiêu đề */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Tổng quan hệ thống</h1>
                <p className="text-muted-foreground mt-1">
                    Xin chào {user?.fullName || 'Chủ trọ'}, chúc bạn một ngày làm việc hiệu quả!
                </p>
            </div>

            {/* 4 Widget thống kê */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div key={index} className="rounded-xl border bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${stat.bg}`}>
                                    <Icon className={`h-6 w-6 ${stat.color}`} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                                    <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Khung nội dung chính (Chia 2 cột) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Cột trái: Biểu đồ / Hoạt động gần đây (Chiếm 2 phần) */}
                <div className="lg:col-span-2 rounded-xl border bg-white shadow-sm overflow-hidden">
                    <div className="border-b px-6 py-4 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-800">Hợp đồng chờ duyệt</h2>
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Mới nhất</span>
                    </div>
                    <div className="p-6">
                        <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-lg bg-gray-50">
                            <Clock className="h-10 w-10 text-gray-400 mb-3" />
                            <p className="text-gray-500 font-medium">Chưa có hợp đồng nào đang chờ xử lý.</p>
                            <p className="text-sm text-gray-400 mt-1">Khi người thuê gửi yêu cầu ký, hợp đồng sẽ hiện ở đây.</p>
                        </div>
                    </div>
                </div>

                {/* Cột phải: Nhắc nhở (Chiếm 1 phần) */}
                <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                    <div className="border-b px-6 py-4">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-orange-500" />
                            Cần chú ý
                        </h2>
                    </div>
                    <div className="p-0">
                        <ul className="divide-y">
                            <li className="px-6 py-4 hover:bg-gray-50 transition-colors">
                                <p className="text-sm font-medium text-gray-800">Phòng 101 (Khu A) sắp hết hạn</p>
                                <p className="text-xs text-gray-500 mt-1">Hợp đồng kết thúc vào 20/03/2026</p>
                            </li>
                            <li className="px-6 py-4 hover:bg-gray-50 transition-colors">
                                <p className="text-sm font-medium text-gray-800">Nguyễn Văn A chưa đóng tiền</p>
                                <p className="text-xs text-gray-500 mt-1">Hóa đơn tháng 2 - 3.500.000đ</p>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;