import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Calendar, Clock, CreditCard, ShieldCheck, User, Mail, Info, Eye, X, FileSignature, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { toast } from "sonner";
import { propertyApi } from "@/api/propertyApi"; 
import { contractApi } from "@/api/contractApi";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import type { CreateContractPayload } from "@/types"; 

export default function CreateContractPage() {
  const { user } = useAuth(); 
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomId = searchParams.get("roomId");

  const [isLoading, setIsLoading] = useState(false);
  const [room, setRoom] = useState<any>(null);
  const [existingContract, setExistingContract] = useState<any>(null);

  // --- THÊM STATE CHO MODAL PREVIEW ---
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [formData, setFormData] = useState({
    startDate: new Date().toISOString().split('T')[0], 
    duration: 6, 
    tenantEmail: "", 
    additionalTerms: "" 
  });

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

  useEffect(() => {
    if (!roomId) {
      toast.error("Không tìm thấy phòng!");
      navigate("/properties");
      return;
    }
    
    const fetchRoomInfo = async () => {
        try {
            // ✅ Kiểm tra tenant đã có hợp đồng chưa
            if (user?.role === 'TENANT') {
              try {
                const currentRes = await contractApi.getMyCurrentRoom();
                const currentData = (currentRes as any)?.data || currentRes;
                if (currentData && currentData.id && !currentData.message) {
                  setExistingContract(currentData);
                }
              } catch { /* ignore */ }
            }

            const res = await propertyApi.getRoomDetail(roomId); 
            const roomData = (res as any).data || res;
            setRoom(roomData);

            const systemTemplate = `I. NỘI QUY CHUNG:\n- Giữ gìn vệ sinh chung, đổ rác đúng nơi quy định.\n- Không gây ồn ào sau 22h00.\n- Không chứa chấp người lạ qua đêm khi chưa báo cáo Chủ nhà.\n\nII. TRÁCH NHIỆM TÀI SẢN:\n- Bồi thường 100% giá trị nếu làm hư hỏng tài sản có sẵn trong phòng.\n- Trả phòng phải báo trước ít nhất 30 ngày, nếu không sẽ mất cọc.\n\nIII. THANH TOÁN:\n- Thanh toán tiền nhà và dịch vụ từ ngày 01 đến ngày 05 hàng tháng. Chậm trễ phạt 5%.`;
            
            const defaultText = roomData.defaultTerms || systemTemplate;

            const formattedTerms = user?.role === 'TENANT' 
                ? `--- NỘI QUY MẪU TỪ CHỦ TRỌ ---\n${defaultText}\n\n--- YÊU CẦU THÊM CỦA KHÁCH THUÊ ---\n`
                : defaultText;

            setFormData(prev => ({
                ...prev,
                additionalTerms: formattedTerms
            }));

        } catch (error) {
            toast.error("Lỗi tải thông tin phòng");
        }
    };
    fetchRoomInfo();
  }, [roomId, navigate, user?.role]);

  // HÀM TÍNH NGÀY KẾT THÚC (Dùng chung cho Submit và Preview)
  const calculateEndDate = () => {
    const start = new Date(formData.startDate);
    const end = new Date(start.setMonth(start.getMonth() + Number(formData.duration)));
    return end.toISOString().split('T')[0];
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      
      if (user?.role === 'LANDLORD' && !formData.tenantEmail) {
        toast.warning("Vui lòng nhập Email của khách thuê để gán hợp đồng!");
        return;
      }

      const endDateStr = calculateEndDate();

      const payload: CreateContractPayload = {
          roomId: Number(roomId),
          startDate: formData.startDate,
          endDate: endDateStr, 
          depositAmount: room.price, 
          signMethod: 'TRADITIONAL', 
          additionalTerms: formData.additionalTerms,
          tenantEmail: user?.role === 'LANDLORD' ? formData.tenantEmail : undefined 
      };

      const res = await contractApi.createContract(payload as any);
      
      toast.success(user?.role === 'LANDLORD' ? "Đã tạo hợp đồng nháp thành công!" : "Đã gửi yêu cầu thuê thành công!");
      
      const newContractId = (res as any).data?.id || (res as any).id;
      const prefix = user?.role === 'LANDLORD' ? '/landlord' : '/tenant';
      navigate(`${prefix}/contracts/${newContractId}`); 
      
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

        {/* ❌ CẢNH BÁO NẾU ĐÃ CÓ HỢP ĐỒNG */}
        {existingContract && user?.role === 'TENANT' && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-800 text-lg">Bạn đã có phòng đang thuê!</h3>
                <p className="text-sm text-red-700 mt-1">
                  Bạn đang có hợp đồng <strong>{existingContract.status === 'ACTIVE' ? 'đang thuê' : 'chờ ký'}</strong> tại phòng{' '}
                  <strong>{existingContract.roomName || `#${existingContract.roomId}`}</strong>.
                  Mỗi người chỉ được thuê 1 phòng tại một thời điểm.
                </p>
                <div className="mt-4 flex gap-3">
                  <Link to={`/tenant/contracts/${existingContract.id}`}>
                    <Button size="sm" className="gap-1 bg-red-600 hover:bg-red-700">
                      Xem hợp đồng hiện tại
                    </Button>
                  </Link>
                  <Button size="sm" variant="outline" onClick={() => navigate(-1)} className="text-red-700 border-red-300 hover:bg-red-100">
                    Quay lại
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={`bg-white rounded-xl shadow-lg border overflow-hidden ${existingContract && user?.role === 'TENANT' ? 'opacity-50 pointer-events-none select-none' : ''}`}>
          
          <div className="bg-primary/5 p-6 border-b border-primary/10">
            <h1 className="text-2xl font-bold text-gray-900">
                {user?.role === 'LANDLORD' ? 'Tạo hợp đồng thuê mới' : 'Xác nhận thuê phòng'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
                {user?.role === 'LANDLORD' ? 'Thiết lập các thông số cơ bản để gửi cho khách thuê ký.' : 'Vui lòng kiểm tra kỹ thông tin trước khi gửi yêu cầu.'}
            </p>
          </div>

          <div className="p-8 grid md:grid-cols-2 gap-8">
            
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

            <div className="space-y-6">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" /> 
                    {user?.role === 'LANDLORD' ? 'Thiết lập hợp đồng' : 'Thông tin đăng ký'}
                </h3>

                <div className="space-y-4">
                    
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

                    <div className="space-y-3 pt-4 border-t mt-4">
                        <div className="flex flex-col gap-2 mb-1">
                            <Label className="text-gray-900 font-bold text-base">
                                {user?.role === 'LANDLORD' ? 'Điều khoản & Nội quy hợp đồng' : 'Nội quy Chủ nhà & Yêu cầu của bạn'}
                            </Label>
                            
                            {user?.role === 'TENANT' && (
                                <div className="bg-blue-50/80 text-blue-700 text-xs p-3 rounded-lg border border-blue-100 flex gap-2 items-start leading-relaxed">
                                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                                    <p>
                                        Đoạn văn bản bên dưới là <strong>Nội quy mẫu do Chủ trọ thiết lập</strong>. Bạn có thể đọc, giữ nguyên hoặc gõ thêm các đề xuất của riêng mình vào phần dưới cùng.
                                    </p>
                                </div>
                            )}
                            {user?.role === 'LANDLORD' && (
                                <p className="text-xs text-gray-500">
                                    Dưới đây là Nội quy mẫu của phòng. Bạn có thể chỉnh sửa cho phù hợp với khách này.
                                </p>
                            )}
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

                        <textarea 
                            className="flex w-full rounded-xl border border-input bg-gray-50/50 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[220px] resize-y placeholder:text-gray-400"
                            placeholder={user?.role === 'LANDLORD' ? "Đang tải điều khoản mẫu..." : "Nhập các yêu cầu riêng với chủ nhà..."}
                            value={formData.additionalTerms}
                            onChange={(e) => setFormData({...formData, additionalTerms: e.target.value})}
                        />
                    </div>
                </div>

                <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 border border-blue-100 mt-2">
                    <p className="font-semibold">Thanh toán Cọc dự kiến (khi ký hợp đồng):</p>
                    <p className="text-xl font-bold mt-1">
                        {new Intl.NumberFormat('vi-VN').format(room.price)}đ
                    </p>
                    <p className="text-xs text-blue-600 mt-1">(Tiền nhà tháng đầu sẽ thu chung với Tiền Điện/Nước vào cuối tháng)</p>
                </div>

                <div className="pt-4 space-y-3">
                    {/* ✅ NÚT XEM TRƯỚC HỢP ĐỒNG */}
                    <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full h-11 text-indigo-600 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100"
                        onClick={() => setIsPreviewOpen(true)}
                    >
                        <Eye className="w-4 h-4 mr-2" /> Xem trước bản hợp đồng
                    </Button>

                    <Button onClick={handleSubmit} isLoading={isLoading} className="w-full h-12 text-base shadow-lg shadow-primary/20">
                        {user?.role === 'LANDLORD' ? 'Tạo Hợp Đồng Nháp' : 'Gửi yêu cầu & Xem hợp đồng'}
                    </Button>
                    <Button variant="ghost" onClick={() => navigate(-1)} className="w-full h-11">
                        Hủy bỏ
                    </Button>
                </div>
            </div>

          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL XEM TRƯỚC BẢN HỢP ĐỒNG */}
      {/* ======================================================== */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white max-w-4xl w-full rounded-xl shadow-2xl relative flex flex-col max-h-[90vh]">
            
            {/* Header Modal */}
            <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-xl shrink-0">
                <h3 className="font-bold flex items-center gap-2 text-gray-800">
                    <FileSignature className="w-5 h-5 text-indigo-600" /> Bản xem trước Hợp đồng
                </h3>
                <button onClick={() => setIsPreviewOpen(false)} className="text-gray-400 hover:text-red-500 bg-gray-200 hover:bg-red-100 p-1.5 rounded-full transition-all">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Khung văn bản A4 giả lập */}
            <div className="p-6 sm:p-10 overflow-y-auto bg-gray-100/50 custom-scrollbar">
                <div className="bg-white border shadow-sm max-w-3xl mx-auto p-8 sm:p-12 min-h-[800px]">
                    
                    <div className="text-center mb-8">
                        <h2 className="font-bold text-lg uppercase leading-relaxed">Cộng hòa Xã hội Chủ nghĩa Việt Nam</h2>
                        <h3 className="font-bold text-base underline underline-offset-4 decoration-2">Độc lập - Tự do - Hạnh phúc</h3>
                    </div>

                    <h1 className="text-center font-bold text-2xl uppercase mb-8">Hợp đồng thuê phòng trọ</h1>

                    <div className="space-y-4 text-sm leading-relaxed text-justify">
                        <p>Hôm nay, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}, chúng tôi gồm có:</p>
                        
                        <div className="pl-4 space-y-1">
                            <p className="font-bold uppercase">BÊN CHO THUÊ (BÊN A):</p>
                            <p>- Ông/Bà: <strong>{room?.landlordName || room?.property?.landlordName || '...........................................'}</strong></p>
                            <p>- Địa chỉ khu trọ: {room?.propertyAddress || '...........................................'}</p>
                        </div>

                        <div className="pl-4 space-y-1">
                            <p className="font-bold uppercase">BÊN THUÊ (BÊN B):</p>
                            <p>- Ông/Bà: <strong>{user?.role === 'TENANT' ? user.fullName : (formData.tenantEmail || '...........................................')}</strong></p>
                        </div>

                        <p className="font-bold mt-6 mb-2">Hai bên thống nhất thỏa thuận các điều khoản sau:</p>

                        <div className="space-y-2">
                            <p><strong>Điều 1: Thông tin phòng thuê và Giá cả</strong></p>
                            <ul className="list-disc pl-8 space-y-1">
                                <li>Bên A đồng ý cho Bên B thuê phòng số: <strong>{room?.name}</strong>.</li>
                                <li>Giá thuê phòng: <strong>{new Intl.NumberFormat('vi-VN').format(room?.price || 0)} VNĐ/tháng</strong>.</li>
                                <li>Tiền đặt cọc: <strong>{new Intl.NumberFormat('vi-VN').format(room?.price || 0)} VNĐ</strong>.</li>
                                <li>Giá điện: <strong>{room?.elecPrice ? `${new Intl.NumberFormat('vi-VN').format(room.elecPrice)} VNĐ/kWh` : 'Theo giá nhà nước'}</strong>.</li>
                                <li>Giá nước: <strong>{room?.waterPrice ? `${new Intl.NumberFormat('vi-VN').format(room.waterPrice)} VNĐ/m³` : 'Theo giá nhà nước'}</strong>.</li>
                                <li>Internet & Dịch vụ: <strong>{room?.internetPrice ? `${new Intl.NumberFormat('vi-VN').format(room.internetPrice)} VNĐ/tháng` : 'Miễn phí'}</strong>.</li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <p><strong>Điều 2: Thời hạn hợp đồng</strong></p>
                            <ul className="list-disc pl-8 space-y-1">
                                <li>Thời gian thuê: <strong>{formData.duration} tháng</strong>.</li>
                                <li>Từ ngày <strong>{new Date(formData.startDate).toLocaleDateString('vi-VN')}</strong> đến ngày <strong>{new Date(calculateEndDate()).toLocaleDateString('vi-VN')}</strong>.</li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <p><strong>Điều 3: Các thỏa thuận bổ sung / Nội quy phòng trọ</strong></p>
                            <div className="bg-gray-50 border p-4 rounded-md whitespace-pre-wrap italic">
                                {formData.additionalTerms || "Không có thỏa thuận bổ sung nào khác."}
                            </div>
                        </div>

                        <div className="space-y-2 mt-6">
                            <p><strong>Điều 4: Cam kết chung</strong></p>
                            <p>Hai bên cam kết thực hiện đúng các điều khoản đã ghi trong hợp đồng. Hợp đồng này được lập thành văn bản điện tử và có giá trị pháp lý tương đương bản cứng sau khi hai bên ký xác nhận.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 mt-12 text-center">
                        <div>
                            <p className="font-bold uppercase mb-16">BÊN A (CHO THUÊ)</p>
                            <p className="text-gray-400 italic">(Ký, ghi rõ họ tên)</p>
                        </div>
                        <div>
                            <p className="font-bold uppercase mb-16">BÊN B (NGƯỜI THUÊ)</p>
                            <p className="text-gray-400 italic">(Ký, ghi rõ họ tên)</p>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Footer Modal */}
            <div className="p-4 border-t bg-white shrink-0 flex justify-end">
                <Button onClick={() => setIsPreviewOpen(false)} className="px-8">
                    Đã hiểu & Đóng lại
                </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}