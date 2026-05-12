import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Calendar, Clock, CreditCard, ShieldCheck, User, Mail, Info, Eye, X, FileSignature, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { toast } from "sonner";
import { propertyApi } from "@/api/propertyApi"; 
import { contractApi } from "@/api/contractApi";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import type { ContractSignMethod, CreateContractPayload } from "@/types";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { ContractMethodSelector } from "@/features/contract/components/method-selector";
import { trackEvent } from "@/utils/analytics";

const WIZARD_STEPS = [
  { title: "Thông tin & thời hạn" },
  { title: "Điều khoản" },
  { title: "Xác nhận" },
] as const;

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
  const [wizardStep, setWizardStep] = useState(1);

  const [formData, setFormData] = useState({
    startDate: new Date().toISOString().split('T')[0], 
    duration: 6, 
    tenantEmail: "", 
    landlordRules: "",
    tenantRequests: "",
    signMethod: "TRADITIONAL" as ContractSignMethod,
  });

  const TENANT_SUGGESTED_TERMS = [
    "Yêu cầu dọn vệ sinh phòng trước khi bàn giao.",
    "Cấp thêm 1 chìa khóa cổng/phòng.",
    "Hỗ trợ sửa chữa thiết bị hỏng trước khi dọn vào.",
    "Miễn phí gửi xe cho 1 xe máy.",
    "Xin phép nuôi thú cưng nhỏ (mèo/chuột hamster)."
  ];

  const handleAddTerm = (term: string) => {
    if (formData.tenantRequests.includes(term)) {
      toast.info("Yêu cầu này đã được thêm rồi!");
      return;
    }
    setFormData(prev => ({
      ...prev,
      tenantRequests: prev.tenantRequests 
        ? `${prev.tenantRequests}\n- ${term}` 
        : `- ${term}`
    }));
  };

  const goNextStep = () => {
    if (wizardStep === 1 && user?.role === "LANDLORD" && !formData.tenantEmail.trim()) {
      toast.warning("Vui lòng nhập email khách thuê trước khi sang bước tiếp.");
      return;
    }
    setWizardStep((s) => Math.min(3, s + 1));
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

            const systemTemplate = `- Giữ gìn vệ sinh chung, đổ rác đúng nơi quy định.\n- Không gây ồn ào sau 22h00.\n- Không chứa chấp người lạ khi chưa báo cáo.\n- Bồi thường nếu làm hư hỏng tài sản phòng.\n- Trả phòng phải báo trước ít nhất 30 ngày.\n- Thanh toán tiền nhà từ ngày 01 đến ngày 05.`;
            
            const defaultText = roomData.defaultTerms || systemTemplate;

            let initialStartDate = formData.startDate;
            if (roomData.availableFromDate) {
                const availDate = new Date(roomData.availableFromDate).toISOString().split('T')[0];
                if (initialStartDate < availDate) {
                    initialStartDate = availDate;
                }
            }

            setFormData(prev => ({
                ...prev,
                startDate: initialStartDate,
                landlordRules: defaultText,
                tenantRequests: ""
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

      const combinedTerms = user?.role === 'TENANT'
          ? `${formData.landlordRules}\n[TENANT_REQUESTS_START]\n${formData.tenantRequests}`
          : formData.landlordRules;

      const payload: CreateContractPayload = {
          roomId: Number(roomId),
          startDate: formData.startDate,
          endDate: endDateStr, 
          depositAmount: room.price, 
          signMethod: formData.signMethod,
          additionalTerms: combinedTerms,
          tenantEmail: user?.role === 'LANDLORD' ? formData.tenantEmail : undefined 
      };

      // 🛡️ Kiểm tra Pre-booking: startDate phải >= availableFromDate
      if (room.availableFromDate) {
        const availDate = new Date(room.availableFromDate);
        const startDate = new Date(formData.startDate);
        if (startDate < availDate) {
          toast.warning(`Phòng này sẽ trống từ ngày ${availDate.toLocaleDateString('vi-VN')}. Vui lòng chọn ngày bắt đầu từ ngày này trở đi!`);
          setIsLoading(false);
          return;
        }
      }

      if (existingContract && user?.role === 'TENANT') {
        if (!existingContract.endDate) {
           toast.warning(`Hợp đồng hiện tại của bạn chưa xác định ngày kết thúc. Vui lòng chấm dứt hợp đồng cũ trước khi đặt phòng mới!`);
           setIsLoading(false);
           return;
        }
        const existingEnd = new Date(existingContract.endDate);
        const newStart = new Date(formData.startDate);
        if (newStart <= existingEnd) {
          toast.warning(`Hợp đồng hiện tại của bạn đến ngày ${existingEnd.toLocaleDateString('vi-VN')} mới kết thúc. Vui lòng chọn ngày bắt đầu hợp đồng mới sau ngày này!`);
          setIsLoading(false);
          return;
        }
      }

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
    <div className="min-h-screen overflow-x-hidden bg-background py-6 md:py-10 animate-fade-in-up">
      <div className="page-shell app-panel">
        {existingContract && user?.role === 'TENANT' && (
          <div className="mb-5 rounded-2xl border border-orange-200/90 bg-orange-50/90 p-4 shadow-sm sm:p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-orange-600" />
              <div>
                <h3 className="text-lg font-bold text-orange-900">Bạn đang có phòng đang thuê!</h3>
                <p className="mt-1 text-sm text-orange-800/95">
                  Bạn đang có hợp đồng <strong>{existingContract.status === 'ACTIVE' ? 'đang thuê' : 'chờ ký'}</strong> tại phòng{' '}
                  <strong>{existingContract.roomName || `#${existingContract.roomId}`}</strong>
                  {existingContract.endDate ? ` (Đến ngày ${new Date(existingContract.endDate).toLocaleDateString('vi-VN')})` : ' (Vô thời hạn)'}.
                </p>
                <p className="mt-1 text-sm font-semibold text-orange-800/95">
                  Mỗi người chỉ được ở 1 phòng tại một thời điểm. {existingContract.endDate ? 'Để thuê phòng mới này, bạn phải chọn khoảng thời gian bắt đầu sau khi hợp đồng cũ kết thúc.' : 'Vui lòng hoàn tất trả phòng cũ trước khi dọn đến đây.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/tenant/contracts/${existingContract.id}`}>
                    <Button size="sm" className="gap-1 bg-orange-600 text-white hover:bg-orange-700">
                      Xem hợp đồng hiện tại
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="section-card overflow-hidden shadow-md">
          <div className="border-b border-primary/10 bg-primary/[0.06] px-4 py-4 sm:px-6 sm:py-5">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {user?.role === 'LANDLORD' ? 'Tạo hợp đồng thuê mới' : 'Xác nhận thuê phòng'}
            </h1>
            <p className="page-subtitle max-w-2xl">
              {user?.role === 'LANDLORD'
                ? 'Thiết lập các thông số cơ bản để gửi cho khách thuê ký.'
                : 'Vui lòng kiểm tra kỹ thông tin trước khi gửi yêu cầu.'}
            </p>
            <div className="mt-4 min-w-0">
              <StepIndicator steps={[...WIZARD_STEPS]} current={wizardStep} />
            </div>
          </div>

          <div className="min-w-0 p-4 sm:p-6 md:p-8">
            {wizardStep === 1 && (
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                    <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
                    Thông tin phòng
                  </h3>
                  <div className="muted-surface space-y-4 p-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Phòng</span>
                      <p className="text-lg font-bold text-primary">{room.name}</p>
                      <p className="text-sm text-muted-foreground">{room.propertyName || room.property?.address || 'Đang cập nhật địa chỉ'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          <CreditCard className="h-3 w-3" /> Giá thuê
                        </span>
                        <p className="font-semibold text-foreground">{new Intl.NumberFormat('vi-VN').format(room.price)}đ/tháng</p>
                      </div>
                      <div>
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          <ShieldCheck className="h-3 w-3" /> Tiền cọc
                        </span>
                        <p className="font-semibold text-foreground">{new Intl.NumberFormat('vi-VN').format(room.price)}đ (1 tháng)</p>
                      </div>
                    </div>
                    <div className="mt-2 border-t border-border/60 pt-3">
                      <span className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        <User className="h-3 w-3" /> Chủ nhà
                      </span>
                      <p className="text-sm font-medium">{room.landlordName || room.property?.landlordName || 'Chủ trọ'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                    <User className="h-5 w-5 shrink-0 text-primary" />
                    {user?.role === 'LANDLORD' ? 'Thiết lập hợp đồng' : 'Thông tin đăng ký'}
                  </h3>
                  <div className="space-y-4">
                    {user?.role === 'LANDLORD' && (
                      <div className="space-y-2 rounded-xl border border-violet-200/80 bg-violet-50/80 p-4">
                        <Label className="text-violet-900">Email khách thuê (bắt buộc)</Label>
                        <p className="text-xs text-violet-700/90">Khách cần có tài khoản trên hệ thống để ký số.</p>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-400" />
                          <Input
                            type="email"
                            placeholder="Nhập email khách hàng..."
                            className="border-violet-200 bg-background pl-9 focus-visible:ring-violet-400"
                            value={formData.tenantEmail}
                            onChange={(e) => setFormData({ ...formData, tenantEmail: e.target.value })}
                          />
                        </div>
                      </div>
                    )}

                    {room.status === 'RENTED' && room.availableFromDate && (
                      <div className="flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50/90 p-3 text-sm text-orange-900 shadow-sm">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                        <div>
                          <strong>Lưu ý:</strong> Phòng đang có người ở, trống từ{' '}
                          <strong>{new Date(room.availableFromDate).toLocaleDateString('vi-VN')}</strong>. Chọn ngày bắt đầu từ ngày này trở đi.
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Ngày bắt đầu ở</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="date"
                          className="pl-9"
                          min={
                            room.availableFromDate
                              ? new Date(room.availableFromDate).toISOString().split('T')[0]
                              : new Date().toISOString().split('T')[0]
                          }
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Thời hạn thuê (tháng)</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={formData.duration}
                          onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                        >
                          <option value={1}>1 tháng (ngắn hạn)</option>
                          <option value={3}>3 tháng</option>
                          <option value={6}>6 tháng</option>
                          <option value={12}>12 tháng (1 năm)</option>
                          <option value={24}>24 tháng (2 năm)</option>
                        </select>
                      </div>
                    </div>

                    <ContractMethodSelector
                      value={formData.signMethod}
                      onChange={(method) => {
                        setFormData((prev) => ({ ...prev, signMethod: method }));
                        trackEvent("contract_method_selected", {
                          method,
                          role: user?.role || "UNKNOWN",
                          roomId: Number(roomId),
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="mx-auto max-w-3xl space-y-6">
                <div className="flex flex-col gap-2">
                  <Label className="flex items-center gap-2 text-base font-bold text-foreground">
                    <Info className="h-5 w-5 text-sky-600" />
                    {user?.role === 'LANDLORD' ? 'Nội quy & điều khoản cơ bản' : 'Nội quy từ chủ nhà'}
                  </Label>
                  <div className="relative overflow-hidden rounded-xl border border-sky-100 bg-sky-50/60 p-4">
                    <div className="absolute right-0 top-0 p-2 opacity-[0.06]">
                      <ShieldCheck className="h-12 w-12" />
                    </div>
                    <div className="space-y-2">
                      {formData.landlordRules
                        .split('\n')
                        .filter((line) => line.trim())
                        .map((rule, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm text-sky-950">
                            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100">
                              <Check className="h-3 w-3 text-sky-700" />
                            </div>
                            <span className="leading-relaxed">{rule.replace(/^- /, '')}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-base font-bold text-foreground">
                    <FileSignature className="h-5 w-5 text-indigo-600" />
                    Yêu cầu thêm của bạn
                  </Label>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {TENANT_SUGGESTED_TERMS.map((term, idx) => {
                      const isAdded = formData.tenantRequests.includes(term);
                      return (
                        <button
                          type="button"
                          key={idx}
                          disabled={isAdded}
                          onClick={() => !isAdded && handleAddTerm(term)}
                          className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] shadow-sm transition-all active:scale-[0.98] ${
                            isAdded
                              ? 'cursor-not-allowed border-border bg-muted text-muted-foreground opacity-70'
                              : 'cursor-pointer border-indigo-200 bg-indigo-50 text-indigo-800 hover:border-indigo-300 hover:bg-indigo-100'
                          }`}
                        >
                          <span className={`font-bold ${isAdded ? 'text-muted-foreground' : 'text-primary'}`}>{isAdded ? '✓' : '+'}</span>
                          {term}
                        </button>
                      );
                    })}
                  </div>
                  <textarea
                    className="min-h-[120px] w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    placeholder="Gõ thêm các yêu cầu riêng cho chủ nhà (ví dụ: xin thêm 1 chìa khóa)…"
                    value={formData.tenantRequests}
                    onChange={(e) => setFormData({ ...formData, tenantRequests: e.target.value })}
                  />
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="mx-auto max-w-lg space-y-6">
                <div className="rounded-xl border border-sky-100 bg-sky-50/80 p-4 text-sm text-sky-950">
                  <p className="font-semibold">Thanh toán cọc dự kiến (khi ký hợp đồng)</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{new Intl.NumberFormat('vi-VN').format(room.price)}đ</p>
                  <p className="mt-1 text-xs text-sky-800/90">Tiền nhà tháng đầu thu cùng điện/nước vào cuối tháng.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full border-indigo-200 bg-indigo-50/50 text-indigo-800 hover:bg-indigo-100"
                  onClick={() => setIsPreviewOpen(true)}
                >
                  <Eye className="mr-2 h-4 w-4" /> Xem trước bản hợp đồng
                </Button>
                <p className="text-center text-xs text-muted-foreground">Kiểm tra lại rồi bấm gửi ở thanh dưới.</p>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border/60 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
            <div className="flex flex-wrap items-center gap-2">
              {wizardStep > 1 && (
                <Button type="button" variant="outline" onClick={() => setWizardStep((s) => s - 1)}>
                  Quay lại
                </Button>
              )}
              <Button type="button" variant="ghost" className="text-muted-foreground" onClick={() => navigate(-1)}>
                Hủy bỏ
              </Button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              {wizardStep < 3 && (
                <Button type="button" onClick={goNextStep} className="sm:min-w-[9rem]">
                  Tiếp theo
                </Button>
              )}
              {wizardStep === 3 && (
                <Button onClick={handleSubmit} isLoading={isLoading} className="h-11 shadow-md sm:min-w-[12rem]">
                  {user?.role === 'LANDLORD' ? 'Tạo hợp đồng nháp' : 'Gửi yêu cầu'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL XEM TRƯỚC BẢN HỢP ĐỒNG */}
      {/* ======================================================== */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white max-w-4xl w-full rounded-xl shadow-2xl relative flex flex-col max-h-[90vh]">
            
            {/* Header Modal */}
            <div className="flex justify-between items-center p-4 border-b bg-muted/40 rounded-t-xl shrink-0">
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

                        <div className="space-y-4">
                            <p><strong>Điều 3: Các thỏa thuận bổ sung / Nội quy phòng trọ</strong></p>
                            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl space-y-2">
                                <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Nội quy phía Chủ trọ:</p>
                                <div className="text-sm whitespace-pre-wrap italic text-gray-700">
                                    {formData.landlordRules}
                                </div>
                            </div>
                            
                            {formData.tenantRequests && (
                                <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl space-y-2">
                                    <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Yêu cầu từ người thuê:</p>
                                    <div className="text-sm whitespace-pre-wrap italic text-gray-700">
                                        {formData.tenantRequests}
                                    </div>
                                </div>
                            )}
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
