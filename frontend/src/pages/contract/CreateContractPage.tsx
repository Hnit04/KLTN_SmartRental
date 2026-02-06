import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Calendar, Clock, CreditCard, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { toast } from "sonner";
import { propertyApi } from "@/api/propertyApi"; // Giả sử có API lấy chi tiết phòng
import { contractApi } from "@/api/contractApi";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

export default function CreateContractPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomId = searchParams.get("roomId");

  const [isLoading, setIsLoading] = useState(false);
  const [room, setRoom] = useState<any>(null); // Thông tin phòng (Giá, Cọc, Chủ nhà...)

  // Form data người thuê nhập
  const [formData, setFormData] = useState({
    startDate: new Date().toISOString().split('T')[0], // Mặc định hôm nay
    duration: 6, // Mặc định 6 tháng
  });

  // 1. Load thông tin phòng (Dữ liệu từ Chủ nhà)
  useEffect(() => {
    if (!roomId) {
      toast.error("Không tìm thấy phòng!");
      navigate("/properties");
      return;
    }
    
    const fetchRoomInfo = async () => {
        try {
            // Gọi API lấy chi tiết Room để hiển thị giá, cọc...
            const res = await propertyApi.getRoomDetail(roomId); 
            setRoom(res.data || res);
        } catch (error) {
            toast.error("Lỗi tải thông tin phòng");
        }
    };
    fetchRoomInfo();
  }, [roomId]);

  // 2. Xử lý gửi yêu cầu
  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      
      const res = await contractApi.createContract({
          roomId: Number(roomId),
          startDate: formData.startDate,
          duration: Number(formData.duration)
      });
      
      toast.success("Đã gửi yêu cầu thuê thành công!");
      
      // ✅ SỬA LẠI DÒNG NÀY: Thêm .data vào trước .id
      navigate(`/contracts/${res.data.id}`); 
      
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
            <h1 className="text-2xl font-bold text-gray-900">Xác nhận thuê phòng</h1>
            <p className="text-gray-500 text-sm mt-1">Vui lòng kiểm tra kỹ thông tin trước khi gửi yêu cầu.</p>
          </div>

          <div className="p-8 grid md:grid-cols-2 gap-8">
            
            {/* CỘT TRÁI: THÔNG TIN TỪ CHỦ NHÀ (READ-ONLY) */}
            <div className="space-y-6">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-green-600" /> 
                    Thông tin phòng (Cố định)
                </h3>
                
                <div className="bg-gray-50 p-4 rounded-lg space-y-4 border">
                    <div>
                        <span className="text-xs text-gray-500 uppercase font-bold">Phòng</span>
                        <p className="font-bold text-lg text-primary">{room.name}</p>
                        <p className="text-sm text-gray-600">{room.property?.address}</p>
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
                         <p className="text-sm font-medium">{room.property?.landlordName}</p>
                    </div>
                </div>
                
                <p className="text-xs text-gray-500 italic">
                    * Các điều khoản về giá và tiền cọc được thiết lập bởi chủ nhà và không thể thay đổi tại bước này.
                </p>
            </div>

            {/* CỘT PHẢI: NGƯỜI THUÊ NHẬP (INPUT) */}
            <div className="space-y-6">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" /> 
                    Thông tin đăng ký
                </h3>

                <div className="space-y-4">
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

                    <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 border border-blue-100">
                        <p className="font-semibold">Tổng thanh toán dự kiến:</p>
                        <p className="text-xl font-bold mt-1">
                            {new Intl.NumberFormat('vi-VN').format(room.price * 2)}đ
                        </p>
                        <p className="text-xs text-blue-600 mt-1">(Bao gồm 1 tháng cọc + 1 tháng tiền nhà đầu tiên)</p>
                    </div>
                </div>

                <div className="pt-4">
                    <Button onClick={handleSubmit} isLoading={isLoading} className="w-full h-12 text-base shadow-lg shadow-primary/20">
                        Gửi yêu cầu & Xem hợp đồng
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