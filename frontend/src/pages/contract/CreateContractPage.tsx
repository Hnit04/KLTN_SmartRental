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
import type { CreateContractPayload } from "@/types"; // Import interface chuẩn

export default function CreateContractPage() {
  const { user } = useAuth(); 
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomId = searchParams.get("roomId");

  const [isLoading, setIsLoading] = useState(false);
  const [room, setRoom] = useState<any>(null);

  // Form data
  const [formData, setFormData] = useState({
    startDate: new Date().toISOString().split('T')[0], 
    duration: 6, 
    tenantEmail: "", 
    additionalTerms: "" 
  });

  // ✅ DANH SÁCH GỢI Ý ĐIỀU KHOẢN (Click để nối thêm vào)
  const LANDLORD_SUGGESTED_TERMS = [
    "Không nuôi thú cưng (chó, mèo...).",
    "Giữ yên tĩnh chung sau 22h00 đêm.",
    "Báo trước 30 ngày trước khi trả phòng.",
    "Bồi thường 100% nếu làm hỏng tài sản phòng.",
    "Chậm tiền nhà quá 5 ngày phạt 5%."
  ];

  const TENANT_SUGGESTED_TERMS = [
    "Yêu cầu dọn vệ sinh phòng trước khi bàn giao.",
    "Cấp thêm 1 chìa khóa cổng/phòng.",
    "Hỗ trợ sửa chữa thiết bị hỏng trước khi dọn vào.",
    "Miễn phí gửi xe cho 1 xe máy.",
    "Xin phép nuôi thú cưng nhỏ (mèo/chuột hamster)."
  ];

  const handleAddTerm = (term: string) => {
    if (formData.additionalTerms.includes(term)) {
      toast.info("Điều khoản này đã được thêm rồi!");
      return;
    }
    setFormData(prev => ({
      ...prev,
      additionalTerms: prev.additionalTerms 
        ? `${prev.additionalTerms}\n- ${term}` 
        : `- ${term}`
    }));
  };

  // 1. TẢI THÔNG TIN PHÒNG VÀ AUTO-FILL ĐIỀU KHOẢN MẪU
  useEffect(() => {
    if (!roomId) {
      toast.error("Không tìm thấy phòng!");
      navigate("/properties");
      return;
    }
    
    const fetchRoomInfo = async () => {
        try {
            const res = await propertyApi.getRoomDetail(roomId); 
            const roomData = (res as any).data || res;
            setRoom(roomData);

            // ✅ NẾU LÀ CHỦ TRỌ: LẤY ĐIỀU KHOẢN MẪU CỦA PHÒNG ĐIỀN VÀO LUÔN
            if (user?.role === 'LANDLORD') {
               // Mẫu dự phòng nếu DB chưa có defaultTerms
               const systemTemplate = `I. NỘI QUY CHUNG:\n- Giữ gìn vệ sinh chung, đổ rác đúng nơi quy định.\n- Không gây ồn ào sau 22h00.\n- Không chứa chấp người lạ qua đêm khi chưa báo cáo Chủ nhà.\n\nII. TRÁCH NHIỆM TÀI SẢN:\n- Bồi thường 100% giá trị nếu làm hư hỏng tài sản có sẵn trong phòng.\n- Trả phòng phải báo trước ít nhất 30 ngày, nếu không sẽ mất cọc.\n\nIII. THANH TOÁN:\n- Thanh toán tiền nhà và dịch vụ từ ngày 01 đến ngày 05 hàng tháng. Chậm trễ phạt 5%.`;
               
               setFormData(prev => ({
                 ...prev,
                 additionalTerms: roomData.defaultTerms || systemTemplate
               }));
            }
        } catch (error) {
            toast.error("Lỗi tải thông tin phòng");
        }
    };
    fetchRoomInfo();
  }, [roomId, navigate, user?.role]);

  // 2. GỬI YÊU CẦU TẠO HỢP ĐỒNG (ĐÃ FIX LỖI TYPESCRIPT)
  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      
      if (user?.role === 'LANDLORD' && !formData.tenantEmail) {
        toast.warning("Vui lòng nhập Email của khách thuê để gán hợp đồng!");
        return;
      }

      // ✅ TÍNH TOÁN NGÀY KẾT THÚC DỰA VÀO SỐ THÁNG
      const start = new Date(formData.startDate);
      const end = new Date(start.setMonth(start.getMonth() + Number(formData.duration)));
      const endDateStr = end.toISOString().split('T')[0];

      // ✅ PAYLOAD ĐẦY ĐỦ KHỚP VỚI INTERFACE MỚI NHẤT
      const payload: CreateContractPayload = {
          roomId: Number(roomId),
          startDate: formData.startDate,
          endDate: endDateStr, 
          depositAmount: room.price, 
          signMethod: 'TRADITIONAL', 
          additionalTerms: formData.additionalTerms,
          tenantEmail: user?.role === 'LANDLORD' ? formData.tenantEmail : undefined 
      };

      const res = await contractApi.createContract(payload);
      
      toast.success(user?.role === 'LANDLORD' ? "Đã tạo hợp đồng nháp thành công!" : "Đã gửi yêu cầu thuê thành công!");
      
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

                    {/* KHU VỰC ĐIỀU KHOẢN BỔ SUNG */}
                    <div className="space-y-3 pt-4 border-t mt-4">
                        <div className="flex justify-between items-center">
                            <Label className="text-gray-900 font-bold">Điều khoản & Nội quy</Label>
                            <span className="text-xs text-gray-400">Có thể chỉnh sửa</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-2">
                            {(user?.role === 'LANDLORD' ? LANDLORD_SUGGESTED_TERMS : TENANT_SUGGESTED_TERMS).map((term, idx) => {
                                const isAdded = formData.additionalTerms.includes(term);
                                return (
                                    <span
                                        key={idx}
                                        onClick={() => !isAdded && handleAddTerm(term)}
                                        className={`text-[11px] px-3 py-1.5 rounded-full transition-all shadow-sm flex items-center gap-1 border ${
                                            isAdded 
                                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                : user?.role === 'LANDLORD'
                                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 cursor-pointer active:scale-95'
                                                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300 cursor-pointer active:scale-95'
                                        }`}
                                    >
                                        <span className={`font-bold ${isAdded ? 'text-gray-400' : 'text-primary'}`}>
                                            {isAdded ? '✓' : '+'}
                                        </span> 
                                        {term.substring(0, 30)}...
                                    </span>
                                );
                            })}
                        </div>

                        {/* Ô nhập liệu dài cho điều khoản */}
                        <textarea 
                            className="flex w-full rounded-xl border border-input bg-gray-50/50 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[220px] resize-y placeholder:text-gray-400"
                            placeholder={user?.role === 'LANDLORD' ? "Đang tải điều khoản mẫu..." : "Nhập các yêu cầu riêng với chủ nhà..."}
                            value={formData.additionalTerms}
                            onChange={(e) => setFormData({...formData, additionalTerms: e.target.value})}
                        />
                    </div>
                </div>

                <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 border border-blue-100 mt-2">
                    <p className="font-semibold">Tổng thanh toán dự kiến tháng đầu:</p>
                    <p className="text-xl font-bold mt-1">
                        {new Intl.NumberFormat('vi-VN').format(room.price * 2)}đ
                    </p>
                    <p className="text-xs text-blue-600 mt-1">(Bao gồm 1 tháng cọc + 1 tháng tiền nhà)</p>
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