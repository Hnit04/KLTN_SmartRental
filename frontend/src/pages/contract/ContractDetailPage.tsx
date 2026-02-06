import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  FileText, Download, PenTool, CheckCircle, Calendar, 
  MapPin, Printer, ArrowLeft, MessageSquarePlus, X, ShieldCheck 
} from "lucide-react";
import { Button } from "@/components/ui/Button";
// ✅ Sử dụng Textarea component xịn xò của bạn
import { Textarea } from "@/components/ui/Textarea"; 
import { contractApi } from "@/api/contractApi"; 
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { toast } from "sonner";
import type { Contract } from "@/types";

// Interface mở rộng để hứng dữ liệu chi tiết
interface ContractDetail extends Contract {
  roomName?: string;
  propertyAddress?: string;
  landlordName?: string;
  tenantName?: string;
  tenantPhone?: string;
  tenantCccd?: string;
}

export default function ContractDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // --- STATE ---
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // State xử lý Ký
  const [isSigning, setIsSigning] = useState(false);

  // State xử lý Yêu cầu chỉnh sửa
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  // --- FETCH DATA ---
  useEffect(() => {
    if (!id) return;
    fetchContract();
  }, [id]);

  const fetchContract = async () => {
    try {
      setIsLoading(true);
      const res = await contractApi.getDetail(id!);
      setContract((res as any).data || res); 
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải thông tin hợp đồng");
      navigate("/contracts");
    } finally {
      setIsLoading(false);
    }
  };

  // --- HANDLER: KÝ HỢP ĐỒNG ---
  const handleSignContract = async () => {
    try {
      setIsSigning(true);
      // Giả lập độ trễ Blockchain
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await contractApi.signContract(id!);
      
      toast.success("Ký hợp đồng thành công!", {
        description: "Hợp đồng đã có hiệu lực pháp lý.",
      });
      fetchContract(); // Reload lại data
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ký thất bại. Vui lòng thử lại.");
    } finally {
      setIsSigning(false);
    }
  };

  // --- HANDLER: GỬI YÊU CẦU CHỈNH SỬA ---
  const handleRequestChange = async () => {
    if (!editContent.trim()) {
      toast.error("Vui lòng nhập nội dung cần chỉnh sửa!");
      return;
    }

    try {
      setIsSendingRequest(true);
      await contractApi.requestChange(id!, editContent);
      
      toast.success("Đã gửi đề xuất thành công!", {
        description: "Chủ nhà sẽ xem xét và phản hồi lại bạn.",
      });
      setIsEditModalOpen(false);
      setEditContent("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gửi yêu cầu thất bại.");
    } finally {
      setIsSendingRequest(false);
    }
  };

  // --- HELPERS ---
  const formatMoney = (amount: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

  const formatDate = (dateStr?: string) => 
    dateStr ? new Date(dateStr).toLocaleDateString('vi-VN') : '...';

  if (isLoading) return <LoadingSpinner />;
  if (!contract) return null;

  const isPending = contract.status === "PENDING_SIGNATURE";
  const isActive = contract.status === "ACTIVE";

  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-6">
      <div className="container mx-auto max-w-5xl px-4">
        
        {/* Nút Back */}
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 pl-0 hover:bg-transparent text-gray-500">
            <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại danh sách
        </Button>

        {/* Header Title & Status */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Hợp đồng thuê #{contract.code || contract.id}
            </h1>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                Ngày tạo: {formatDate(contract.createdDate)}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {isPending && (
              <span className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full text-sm font-bold animate-pulse flex items-center gap-2">
                <PenTool className="h-4 w-4" /> Chờ ký tên
              </span>
            )}
            {isActive && (
              <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Đã có hiệu lực
              </span>
            )}
            <Button variant="outline" size="icon" onClick={() => window.print()} title="In hợp đồng">
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* ─── CỘT TRÁI: NỘI DUNG HỢP ĐỒNG (PREVIEW) ─── */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden min-h-[800px] flex flex-col">
            <div className="bg-gray-100 px-6 py-3 border-b flex justify-between items-center">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Bản xem trước
              </h3>
              {contract.contentUrl && (
                <Button variant="ghost" size="sm" className="text-blue-600 h-8" onClick={() => window.open(contract.contentUrl, '_blank')}>
                    <Download className="h-4 w-4 mr-1" /> Tải PDF gốc
                </Button>
              )}
            </div>
            
            {/* Nội dung giả lập hợp đồng */}
            <div className="p-10 font-serif leading-relaxed text-gray-800 flex-1 relative bg-white">
              <div className="text-center mb-10">
                <h2 className="text-xl font-bold uppercase mb-1">Cộng Hòa Xã Hội Chủ Nghĩa Việt Nam</h2>
                <p className="text-sm underline font-bold">Độc lập - Tự do - Hạnh phúc</p>
                <h1 className="text-3xl font-bold mt-8 text-blue-900">HỢP ĐỒNG THUÊ NHÀ Ở</h1>
                <p className="italic text-sm text-gray-500 mt-2">Số: {contract.code || contract.id}/HĐTN-SR</p>
              </div>
              
              <div className="space-y-6 text-sm md:text-base text-justify">
                <p>Hôm nay, ngày <strong>{new Date().getDate()}</strong> tháng <strong>{new Date().getMonth() + 1}</strong> năm <strong>{new Date().getFullYear()}</strong>.</p>
                <p>Tại địa chỉ: <strong>{contract.propertyAddress}</strong></p>

                <div className="pl-4 border-l-4 border-gray-200">
                    <p className="mb-2"><strong className="uppercase underline">Bên Cho Thuê (Bên A):</strong></p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Ông/Bà: <strong>{contract.landlordName || 'Chủ nhà'}</strong></li>
                        <li>Địa chỉ: {contract.propertyAddress}</li>
                    </ul>
                </div>

                <div className="pl-4 border-l-4 border-gray-200">
                    <p className="mb-2"><strong className="uppercase underline">Bên Thuê (Bên B):</strong></p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Ông/Bà: <strong>{contract.tenantName || 'Người thuê'}</strong></li>
                        <li>Điện thoại: {contract.tenantPhone || '...'}</li>
                        <li>CCCD/CMND: {contract.tenantCccd || '...'}</li>
                    </ul>
                </div>

                <p><strong className="uppercase underline">Điều 1:</strong> Bên A đồng ý cho bên B thuê 01 phòng trọ thuộc sở hữu của bên A tại địa chỉ nêu trên.</p>
                
                <p><strong className="uppercase underline">Điều 2:</strong> Thời hạn thuê và giá cả:</p>
                <ul className="list-disc pl-5 space-y-2">
                    <li>Thời hạn thuê: Từ ngày <strong>{formatDate(contract.startDate)}</strong> đến ngày <strong>{formatDate(contract.endDate)}</strong>.</li>
                    <li>Giá thuê: <strong>{formatMoney(contract.monthlyPrice)} / tháng</strong>.</li>
                    <li>Tiền cọc: <strong>{formatMoney(contract.depositAmount)}</strong>.</li>
                </ul>

                <p><strong className="uppercase underline">Điều 3:</strong> Trách nhiệm chung:</p>
                <p>Hai bên cam kết thực hiện đúng các điều khoản đã nêu. Mọi tranh chấp sẽ được giải quyết trên tinh thần thương lượng hoặc theo quy định của pháp luật Việt Nam.</p>
                
                {/* Chữ ký */}
                <div className="mt-16 grid grid-cols-2 text-center gap-10">
                    <div>
                        <p className="font-bold uppercase text-xs text-gray-500 mb-8">Đại diện Bên A</p>
                        <p className="font-signature text-2xl text-blue-800">{contract.landlordName}</p>
                    </div>
                    <div className="relative">
                        <p className="font-bold uppercase text-xs text-gray-500 mb-8">Đại diện Bên B</p>
                        {isActive ? (
                             <div className="relative inline-block">
                                <p className="font-signature text-2xl text-blue-800">{contract.tenantName}</p>
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-16 border-4 border-red-500 text-red-500 flex items-center justify-center rotate-[-15deg] font-black text-xs rounded opacity-80 uppercase tracking-widest">
                                    Signed via<br/>Blockchain
                                </div>
                             </div>
                        ) : (
                            <div className="h-16 flex items-center justify-center bg-gray-50 border border-dashed rounded text-gray-400 italic text-xs">
                                (Chờ ký tên)
                            </div>
                        )}
                    </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── CỘT PHẢI: ACTIONS & SUMMARY ─── */}
          <div className="space-y-6">
             {/* Thông tin tóm tắt */}
             <div className="bg-white rounded-xl shadow-sm border p-6">
               <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                 <ShieldCheck className="h-5 w-5 text-green-600" />
                 Thông tin chính
               </h3>
               <div className="space-y-4">
                 <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 mt-1"><MapPin className="h-4 w-4" /></div>
                    <div className="text-sm">
                        <p className="text-gray-500 text-xs">Địa chỉ phòng</p>
                        <p className="font-medium line-clamp-2">{contract.propertyAddress}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-orange-50 flex items-center justify-center text-orange-600 shrink-0"><Calendar className="h-4 w-4" /></div>
                    <div className="text-sm">
                        <p className="text-gray-500 text-xs">Thời hạn hợp đồng</p>
                        <p className="font-medium">{formatDate(contract.startDate)} - {formatDate(contract.endDate)}</p>
                    </div>
                 </div>
               </div>
             </div>

             {/* KHU VỰC HÀNH ĐỘNG */}
             {isPending && (
              <div className="bg-white rounded-xl border-2 border-primary/20 p-6 space-y-4 shadow-lg shadow-primary/5">
                <div>
                    <h3 className="font-bold text-gray-900">Yêu cầu hành động</h3>
                    <p className="text-xs text-gray-500 mt-1">
                    Vui lòng đọc kỹ các điều khoản trước khi ký.
                    </p>
                </div>
                
                <Button 
                  onClick={handleSignContract} 
                  isLoading={isSigning}
                  className="w-full h-12 text-base shadow-md"
                >
                  <PenTool className="h-5 w-5 mr-2" />
                  Ký hợp đồng ngay
                </Button>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-muted-foreground">Hoặc</span>
                    </div>
                </div>

                <Button 
                  variant="outline" 
                  onClick={() => setIsEditModalOpen(true)}
                  className="w-full border-dashed border-gray-400 text-gray-600 hover:text-primary hover:border-primary hover:bg-primary/5"
                >
                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                  Đề xuất chỉnh sửa
                </Button>
              </div>
            )}

            {isActive && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <h4 className="font-bold text-green-800">Hợp đồng hợp lệ</h4>
                    <p className="text-xs text-green-700 mt-1">
                        Hợp đồng đã được ký kết thành công và lưu trữ trên hệ thống.
                    </p>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── MODAL ĐỀ XUẤT CHỈNH SỬA (Sử dụng Textarea Component) ─── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MessageSquarePlus className="h-5 w-5 text-primary" />
                Đề xuất chỉnh sửa
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* ✅ COMPONENT TEXTAREA MỚI */}
              <Textarea 
                label="Nội dung bạn muốn thay đổi"
                placeholder="Ví dụ: Tôi muốn sửa lại ngày bắt đầu thuê thành 15/10 vì lý do..." 
                className="min-h-[120px]"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                autoFocus
              />
              
              <div className="flex flex-col gap-1">
                 <p className="text-[11px] text-gray-500">
                    Lưu ý: Quá trình ký hợp đồng sẽ tạm hoãn cho đến khi chủ nhà phản hồi yêu cầu này.
                 </p>
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>Hủy bỏ</Button>
                <Button onClick={handleRequestChange} isLoading={isSendingRequest}>Gửi đề xuất</Button>
              </div>
            </div>
          </div>
        </div>
       )}

    </div>
  );
}