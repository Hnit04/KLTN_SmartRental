import { useState, useEffect } from 'react';
import { 
  Calendar, Clock, MapPin, User, Video, 
  CheckCircle2, XCircle, MessageSquare, Search, 
  Loader2, FileText, X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { appointmentApi } from '@/api/appointmentApi';
import type { AppointmentResponse } from '@/types'; 
// import { useAuth } from '@/context/AuthContext'; // Nhớ import hook auth của bạn để lấy user ID

export default function AppointmentManagePage() {
  // const { user } = useAuth(); // Lấy thông tin chủ trọ đang đăng nhập
  const landlordId = 1; // Tạm fix cứng ID = 1 để test, sau này thay bằng user?.id

  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State Tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');
  
  // State Modal Chi tiết
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingApt, setViewingApt] = useState<AppointmentResponse | null>(null);

  // Lấy dữ liệu từ Backend
  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      const res = await appointmentApi.getPendingByLandlord(landlordId); 
      
      // ✅ FIX Ở ĐÂY: Bóc tách dữ liệu an toàn
      let data = (res as any)?.data !== undefined ? (res as any).data : res;
      
      // ✅ KIỂM TRA NGẶT NGHÈO: Nếu không phải là Array (do BE trả về 204), ép nó thành Mảng rỗng
      if (!Array.isArray(data)) {
        data = [];
      }

      setAppointments(data);
    } catch (error) {
      toast.error("Không thể tải danh sách lịch hẹn!");
      setAppointments([]); // Nếu lỗi cũng ép về mảng rỗng để không bị crash
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Xử lý Cập nhật trạng thái (Duyệt / Từ chối)
  const handleUpdateStatus = async (id: number, status: 'CONFIRMED' | 'REJECTED' | 'CANCELLED') => {
    try {
      // Gọi API cập nhật xuống Spring Boot
      await appointmentApi.updateStatus(id, status);
      
      toast.success(status === 'CONFIRMED' ? "Đã xác nhận lịch hẹn!" : "Đã từ chối lịch hẹn!");
      
      // Xóa lịch hẹn khỏi danh sách chờ duyệt hiện tại (hoặc update trạng thái nếu BE trả về tất cả)
      setAppointments(prev => prev.filter(apt => apt.id !== id));
      
      if (isDetailModalOpen) setIsDetailModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại!");
    }
  };

  const openDetailModal = (apt: AppointmentResponse) => {
    setViewingApt(apt);
    setIsDetailModalOpen(true);
  };

  // Logic Tìm kiếm theo tên phòng, tên khách, SĐT
  const filteredAppointments = appointments.filter(apt => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (apt.roomName?.toLowerCase().includes(searchLower)) || 
      (apt.tenantName?.toLowerCase().includes(searchLower)) ||
      (apt.tenantPhone?.includes(searchTerm))
    );
  });

  // Tính toán số liệu cho Thẻ thống kê (KPIs)
  // Lưu ý: API hiện tại chỉ trả về "PENDING", nếu BE có API trả về tất cả thì các số này mới > 0
  const pendingCount = appointments.filter(a => a.status === 'PENDING').length;
  const confirmedCount = appointments.filter(a => a.status === 'CONFIRMED').length;
  const rejectedCount = appointments.filter(a => a.status === 'REJECTED' || a.status === 'CANCELLED').length;
  const totalCount = appointments.length;

  return (
    <div className="space-y-6 pb-20">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" /> Quản lý Lịch hẹn
          </h1>
          <p className="text-sm text-gray-500 mt-1">Sắp xếp thời gian dẫn khách xem phòng và phản hồi yêu cầu.</p>
        </div>
        <Button onClick={fetchAppointments} variant="outline" className="bg-gray-50 text-gray-700 hover:text-primary">
          <Clock className="h-4 w-4 mr-2" /> Làm mới dữ liệu
        </Button>
      </div>

      {/* --- THỐNG KÊ --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Tổng yêu cầu hiển thị" value={totalCount} color="text-blue-600" bg="bg-blue-50" />
        <StatCard title="Chờ duyệt (PENDING)" value={pendingCount} color="text-yellow-600" bg="bg-yellow-50" />
        <StatCard title="Đã chốt lịch (CONFIRMED)" value={confirmedCount} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Đã hủy / Từ chối" value={rejectedCount} color="text-red-600" bg="bg-red-50" />
      </div>

      {/* --- BẢNG DANH SÁCH LỊCH HẸN --- */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50">
          <h3 className="font-bold text-gray-800">Danh sách yêu cầu xem phòng</h3>
          
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              className="pl-9 h-9 text-sm" 
              placeholder="Tìm tên khách, số điện thoại, phòng..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
               <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                <Calendar className="h-8 w-8 mb-2 opacity-20" />
                <p>{searchTerm ? "Không tìm thấy lịch hẹn phù hợp." : "Chưa có yêu cầu xem phòng nào đang chờ duyệt."}</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-100/50">
                <tr>
                  <th className="px-6 py-4 font-semibold">Phòng</th>
                  <th className="px-6 py-4 font-semibold">Khách hàng</th>
                  <th className="px-6 py-4 font-semibold">Thời gian hẹn</th>
                  <th className="px-6 py-4 font-semibold">Hình thức</th>
                  <th className="px-6 py-4 font-semibold text-center">Trạng thái</th>
                  <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Cột Phòng */}
                    <td className="px-6 py-4 font-bold text-gray-900">{apt.roomName}</td>
                    
                    {/* Cột Khách Hàng */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{apt.tenantName || 'Chưa cập nhật tên'}</div>
                      <div className="text-gray-500 text-xs mt-0.5">{apt.tenantPhone || 'Không có SĐT'}</div>
                    </td>

                    {/* Cột Thời gian */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-primary">
                        {apt.meetTime ? new Date(apt.meetTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '---'}
                      </div>
                      <div className="text-gray-600 text-xs mt-0.5">
                        {apt.meetTime ? new Date(apt.meetTime).toLocaleDateString('vi-VN') : '---'}
                      </div>
                    </td>

                    {/* Cột Hình thức */}
                    <td className="px-6 py-4">
                      {apt.meetingLink ? (
                        <span className="inline-flex items-center gap-1 text-purple-700 font-medium"><Video className="h-4 w-4" /> Online</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-green-700 font-medium"><MapPin className="h-4 w-4" /> Tại phòng</span>
                      )}
                    </td>

                    {/* Cột Trạng thái */}
                    <td className="px-6 py-4 text-center">
                      {apt.status === 'PENDING' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-yellow-100 text-yellow-700"><Clock className="h-3.5 w-3.5" /> Chờ duyệt</span>}
                      {apt.status === 'CONFIRMED' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-green-100 text-green-700"><CheckCircle2 className="h-3.5 w-3.5" /> Đã chốt lịch</span>}
                      {(apt.status === 'REJECTED' || apt.status === 'CANCELLED') && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700"><XCircle className="h-3.5 w-3.5" /> Đã từ chối</span>}
                    </td>

                    {/* Cột Thao tác */}
                    <td className="px-6 py-4 text-right space-x-2">
                      {apt.status === 'PENDING' ? (
                        <>
                          <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 border-red-200" onClick={() => handleUpdateStatus(apt.id, 'REJECTED')}>
                             <XCircle className="h-4 w-4" />
                          </Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleUpdateStatus(apt.id, 'CONFIRMED')}>
                             <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-gray-500 hover:text-primary" onClick={() => openDetailModal(apt)}>
                             <FileText className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" className="text-gray-600 hover:text-primary" onClick={() => openDetailModal(apt)}>
                          <FileText className="h-4 w-4 mr-1" /> Chi tiết
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* --- MODAL CHI TIẾT LỊCH HẸN --- */}
      {isDetailModalOpen && viewingApt && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
           <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 relative">
              <button onClick={() => setIsDetailModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-white/50 rounded-full p-1 z-10 transition-colors">
                <X className="h-5 w-5" />
              </button>

              <div className="bg-primary/5 px-6 pt-8 pb-6 text-center border-b border-primary/10">
                 <div className="bg-white w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-primary/10">
                    <Calendar className="h-7 w-7 text-primary" />
                 </div>
                 <h2 className="text-xl font-bold text-gray-900">Chi tiết Lịch hẹn</h2>
                 <p className="text-sm font-medium text-gray-500 mt-1">Phòng {viewingApt.roomName}</p>
                 <div className="mt-3">
                   {viewingApt.status === 'PENDING' && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700"><Clock className="h-3.5 w-3.5" /> Chờ xác nhận</span>}
                   {viewingApt.status === 'CONFIRMED' && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700"><CheckCircle2 className="h-3.5 w-3.5" /> Đã chốt lịch hẹn</span>}
                   {(viewingApt.status === 'REJECTED' || viewingApt.status === 'CANCELLED') && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700"><XCircle className="h-3.5 w-3.5" /> Đã từ chối</span>}
                 </div>
              </div>

              <div className="p-6 space-y-5">
                 <div className="flex items-start gap-4 pb-4 border-b">
                    <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600"><User className="h-5 w-5" /></div>
                    <div>
                       <p className="text-xs text-gray-500 uppercase font-semibold">Thông tin Khách hàng</p>
                       <p className="font-bold text-gray-900 mt-1">{viewingApt.tenantName}</p>
                       <p className="text-sm text-gray-600">{viewingApt.tenantPhone}</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                    <div>
                       <p className="text-xs text-gray-500 uppercase font-semibold">Ngày xem</p>
                       <p className="font-bold text-gray-900 mt-1">{viewingApt.meetTime ? new Date(viewingApt.meetTime).toLocaleDateString('vi-VN') : '---'}</p>
                    </div>
                    <div>
                       <p className="text-xs text-gray-500 uppercase font-semibold">Giờ hẹn</p>
                       <p className="font-bold text-primary mt-1">{viewingApt.meetTime ? new Date(viewingApt.meetTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '---'}</p>
                    </div>
                 </div>

                 <div className="pb-4 border-b">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Hình thức gặp</p>
                    {viewingApt.meetingLink ? (
                       <div className="bg-purple-50 border border-purple-100 p-3 rounded-lg">
                          <p className="text-sm font-bold text-purple-800 flex items-center gap-2"><Video className="h-4 w-4" /> Video Call Online</p>
                          <a href={viewingApt.meetingLink} target="_blank" rel="noreferrer" className="text-xs text-purple-600 mt-1 block break-all hover:underline">{viewingApt.meetingLink}</a>
                       </div>
                    ) : (
                       <div className="bg-gray-50 border p-3 rounded-lg">
                          <p className="text-sm font-bold text-gray-800 flex items-center gap-2"><MapPin className="h-4 w-4 text-green-600" /> Trực tiếp tại Phòng trọ</p>
                       </div>
                    )}
                 </div>

                 {viewingApt.note && (
                 <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-2 flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> Lời nhắn từ khách</p>
                    <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm italic border border-yellow-100">
                       "{viewingApt.note}"
                    </div>
                 </div>
                 )}

                 {/* Nút thao tác nhanh trong Modal nếu đang PENDING */}
                 {viewingApt.status === 'PENDING' && (
                 <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 bg-white" onClick={() => handleUpdateStatus(viewingApt.id, 'REJECTED')}>
                       Từ chối
                    </Button>
                    <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleUpdateStatus(viewingApt.id, 'CONFIRMED')}>
                       Chấp nhận lịch
                    </Button>
                 </div>
                 )}
              </div>
           </div>
         </div>
      )}
    </div>
  );
}

// CÁC COMPONENT PHỤ
const StatCard = ({ title, value, color, bg }: any) => (
  <div className={`${bg} rounded-xl p-4 border border-black/5`}>
    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{title}</p>
    <p className={`text-2xl font-black ${color}`}>{value}</p>
  </div>
);