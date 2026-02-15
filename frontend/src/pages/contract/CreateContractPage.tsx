import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Calendar, Clock, CreditCard, ShieldCheck, User, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { toast } from "sonner";
import { propertyApi } from "@/api/propertyApi"; 
import { contractApi } from "@/api/contractApi";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";

export default function CreateContractPage() {
  const { user } = useAuth(); // Lấy thông tin user để biết là LANDLORD hay TENANT
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomId = searchParams.get("roomId");

  const [isLoading, setIsLoading] = useState(false);
  const [room, setRoom] = useState<any>(null);

  // Form data dùng chung cho cả Khách thuê và Chủ nhà
  const [formData, setFormData] = useState({
    startDate: new Date().toISOString().split('T')[0], 
    duration: 6, 
    tenantEmail: "", // Dành riêng cho Chủ nhà nhập
  });

  // 1. Load thông tin phòng
  useEffect(() => {
    if (!roomId) {
      toast.error("Không tìm thấy phòng!");
      navigate("/properties");
      return;
    }
    
    const fetchRoomInfo = async () => {
        try {
            const res = await propertyApi.getRoomDetail(roomId); 
            setRoom((res as any).data || res);
        } catch (error) {
            toast.error("Lỗi tải thông tin phòng");
        }
    };
    fetchRoomInfo();
  }, [roomId, navigate]);

  // 2. Xử lý gửi yêu cầu tạo hợp đồng
  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      
      // Nếu là Chủ nhà thao tác -> Bắt buộc nhập Email khách
      if (user?.role === 'LANDLORD' && !formData.tenantEmail) {
        toast.warning("Vui lòng nhập Email của khách thuê để gán hợp đồng!");
        return;
      }

      // Chuẩn bị Payload
      const payload = {
          roomId: Number(roomId),
          startDate: formData.startDate,
          duration: Number(formData.duration),
          // Chỉ gửi email lên nếu người tạo là Chủ nhà
          tenantEmail: user?.role === 'LANDLORD' ? formData.tenantEmail : undefined 
      };

      const res = await contractApi.createContract(payload);
      
      toast.success(user?.role === 'LANDLORD' ? "Đã tạo hợp đồng nháp thành công!" : "Đã gửi yêu cầu thuê thành công!");
      
      // Chuyển hướng tới trang chi tiết hợp đồng vừa tạo
      const newContractId = (res as any).data?.id || (res as any).id;
      navigate(`/contracts/${newContractId}`); 
      
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi tạo hợp đồng.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!room) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto max-w-3xl">
        <div className="bg-white rounded-xl shadow-lg border overflow-hidden">
          
          {/* Header */}
          <div className="bg-primary/5 p-6 border-b border-primary/10">
            <h1 className="text-2xl font-bold text-gray-900">
                {user?.role === 'LANDLORD' ? 'Tạo hợp đồng thuê mới' : 'Xác nhận thuê phòng'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
                {user?.role === 'LANDLORD' ? 'Thiết lập các thông số cơ bản để gửi cho khách thuê ký.' : 'Vui lòng kiểm tra kỹ thông tin trước khi gửi yêu cầu.'}
            </p>
          </div>

          <div className="p-8 grid md:grid-cols-2 gap-8">
            
            {/* CỘT TRÁI: THÔNG TIN PHÒNG (READ-ONLY) */}
            <div className="space-y-6">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-green-600" /> 
                    Thông tin phòng (Cố định)
                </h3>
                
                <div className="bg-gray-50 p-4 rounded-lg space-y-4 border">
                    <div>
                        <span className="text-xs text-gray-500 uppercase font-bold">Phòng</span>
                        <p className="font-bold text-lg text-primary">{room.name}</p>
                        <p className="text-sm text-gray-600">{room.propertyName || room.property?.address || 'Đang cập nhật địa chỉ'}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <span className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1">
                                <CreditCard className="h-3 w-3" /> Giá thuê
                            </span>
                            <p className="font-semibold text-gray-900">
                                {new Intl.NumberFormat('vi-VN').format(room.price)}đ/tháng
                            </p>
                         </div>
                         <div>
                            <span className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" /> Tiền cọc
                            </span>
                            <p className="font-semibold text-gray-900">
                                {new Intl.NumberFormat('vi-VN').format(room.price)}đ (1 tháng)
                            </p>
                         </div>
                    </div>

                    <div className="pt-2 border-t mt-2">
                         <span className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1 mb-1">
                             <User className="h-3 w-3" /> Chủ nhà
                         </span>
                         <p className="text-sm font-medium">{room.landlordName || room.property?.landlordName || 'Chủ trọ'}</p>
                    </div>
                </div>
            </div>

            {/* CỘT PHẢI: INPUT FORM */}
            <div className="space-y-6">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" /> 
                    {user?.role === 'LANDLORD' ? 'Thiết lập hợp đồng' : 'Thông tin đăng ký'}
                </h3>

                <div className="space-y-4">
                    
                    {/* KHU VỰC DÀNH RIÊNG CHO CHỦ TRỌ (Nhập email khách) */}
                    {user?.role === 'LANDLORD' && (
                       <div className="space-y-2 p-4 bg-purple-50 rounded-lg border border-purple-100">
                          <Label className="text-purple-800">Email Khách Thuê (Bắt buộc)</Label>
                          <p className="text-xs text-purple-600 mb-2">Khách cần có tài khoản trên hệ thống để ký số.</p>
                          <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
                              <Input 
                                  type="email" 
                                  placeholder="Nhập email khách hàng..."
                                  className="pl-9 border-purple-200 focus-visible:ring-purple-400 bg-white"
                                  value={formData.tenantEmail}
                                  onChange={(e) => setFormData({...formData, tenantEmail: e.target.value})}
                              />
                          </div>
                      </div>
                    )}

                    <div className="space-y-2">
                        <Label>Ngày bắt đầu ở</Label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input 
                                type="date" 
                                className="pl-9"
                                value={formData.startDate}
                                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Thời hạn thuê (Tháng)</Label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <select 
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={formData.duration}
                                onChange={(e) => setFormData({...formData, duration: Number(e.target.value)})}
                            >
                                <option value={1}>1 Tháng (Ngắn hạn)</option>
                                <option value={3}>3 Tháng</option>
                                <option value={6}>6 Tháng</option>
                                <option value={12}>12 Tháng (1 Năm)</option>
                                <option value={24}>24 Tháng (2 Năm)</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 border border-blue-100 mt-2">
                        <p className="font-semibold">Tổng thanh toán dự kiến tháng đầu:</p>
                        <p className="text-xl font-bold mt-1">
                            {new Intl.NumberFormat('vi-VN').format(room.price * 2)}đ
                        </p>
                        <p className="text-xs text-blue-600 mt-1">(Bao gồm 1 tháng cọc + 1 tháng tiền nhà)</p>
                    </div>
                </div>

                <div className="pt-4">
                    <Button onClick={handleSubmit} isLoading={isLoading} className="w-full h-12 text-base shadow-lg shadow-primary/20">
                        {user?.role === 'LANDLORD' ? 'Tạo Hợp Đồng Nháp' : 'Gửi yêu cầu & Xem hợp đồng'}
                    </Button>
                    <Button variant="ghost" onClick={() => navigate(-1)} className="w-full mt-2">
                        Hủy bỏ
                    </Button>
                </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}