import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  DoorOpen, MapPin, Zap, Droplets, Wifi,
  ShieldCheck, ExternalLink, Receipt, FileText, Search, ArrowRight,
  AlertCircle, Loader2, Info, Users, UserPlus, Mail, Clock, X, UserCircle, Trash2, LogOut
} from "lucide-react";
import { contractApi } from "@/api/contractApi";
import { billApi } from "@/api/billApi";
import { residentRequestApi } from "@/api/residentRequestApi";
import type { Contract, Bill, ContractMemberResponse, ResidentRequestResponse } from "@/types/index";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import StatusBadge from "@/components/shared/StatusBadge";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import InvitationsList from "@/components/tenant/InvitationsList";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
const fmtDate = (s: string) => new Date(s).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function MyRoomPage() {
  const { user } = useAuth();
  const [contract, setContract] = useState<Contract | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [members, setMembers] = useState<ContractMemberResponse[]>([]);
  const [pendingInvites, setPendingInvites] = useState<ResidentRequestResponse[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingResident, setIsUpdatingResident] = useState(false);

  // Invite modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  // Removal modal state
  const [isRemovalOpen, setIsRemovalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ContractMemberResponse | null>(null);
  const [removalReason, setRemovalReason] = useState("");

  const fetchRoomInfo = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    
    setError(null);
    try {
      const res = await contractApi.getMyCurrentRoom();
      const data = (res as any)?.data || res;
      
      if (data && data.id && !data.message) {
        setContract(data);
        
        // Fetch Parallelly
        const [billRes, memberRes, requestRes] = await Promise.all([
            billApi.getBillsByContract(data.id),
            residentRequestApi.getMembersByContract(data.id),
            residentRequestApi.getRequestsByContract(data.id)
        ]);

        const billData = (billRes as any)?.data || billRes;
        const memberData = (memberRes as any)?.data || memberRes;
        const requestData = (requestRes as any)?.data || requestRes;

        setBills(Array.isArray(billData) ? billData : []);
        setMembers(Array.isArray(memberData) ? memberData : []);
        setPendingInvites((Array.isArray(requestData) ? requestData : []).filter(r => r.status === 'PENDING' || r.status === 'ACCEPTED'));

      } else {
        setContract(null);
      }
    } catch (err: any) {
      console.error(err);
      setError("Không thể tải thông tin phòng. Vui lòng thử lại sau.");
      toast.error("Lỗi khi tải dữ liệu.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSendInvite = async () => {
    if (!contract) return;
    if (!inviteEmail.trim()) {
        toast.warning("Vui lòng nhập Email người muốn mời");
        return;
    }

    setIsInviting(true);
    try {
        await residentRequestApi.createRequest({
            contractId: contract.id,
            inviteeEmail: inviteEmail,
            message: inviteMessage
        });
        toast.success("Đã gửi lời mời! Đang chờ chủ nhà phê duyệt.");
        setIsInviteOpen(false);
        setInviteEmail("");
        setInviteMessage("");
        fetchRoomInfo(true);
    } catch (err: any) {
        toast.error(err.response?.data?.message || "Lỗi khi gửi lời mời");
    } finally {
        setIsInviting(false);
    }
  };

  const handleRequestRemoval = async (member: ContractMemberResponse) => {
    setSelectedMember(member);
    setRemovalReason("");
    setIsRemovalOpen(true);
  };

  const confirmRemoval = async () => {
    if (!selectedMember || !contract) return;
    
    setIsUpdatingResident(true);
    try {
      await residentRequestApi.requestRemoval({
        contractId: contract.id,
        userId: selectedMember.userId,
        message: removalReason || "Yêu cầu xóa thành viên"
      });
      toast.success(`Đã gửi yêu cầu xóa ${selectedMember.fullName} đến Chủ trọ!`);
      setIsRemovalOpen(false);
      fetchRoomInfo(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi gửi yêu cầu xóa.");
    } finally {
      setIsUpdatingResident(false);
    }
  };

  useEffect(() => {
    fetchRoomInfo();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-gray-500 font-medium">Đang tải thông tin phòng của bạn...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-red-50 rounded-2xl border border-red-100">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-red-800">Đã có lỗi xảy ra</h2>
        <p className="text-red-600 mt-2 mb-6">{error}</p>
        <Button onClick={() => fetchRoomInfo()}>Thử lại</Button>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-10">
        <InvitationsList onStatusChange={() => fetchRoomInfo()} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white rounded-3xl border-2 border-dashed border-gray-200 shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <DoorOpen className="h-10 w-10 text-gray-300" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Bạn chưa có phòng nào</h2>
          <p className="text-gray-500 mt-2 max-w-sm">
            Phòng bạn đã ký hợp đồng, đang trong quá trình thực hiện hoặc lời mời vào ở sẽ xuất hiện tại đây.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link to="/properties">
              <Button className="gap-2 px-8">
                <Search className="h-4 w-4" /> Tìm kiếm phòng ngay
              </Button>
            </Link>
            <Link to="/tenant/appointments">
              <Button variant="outline" className="px-8">Lịch hẹn của tôi</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const unpaidBills = bills.filter(b => b.status === "PENDING" || b.status === "LATE");

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      {/* ── INVITATIONS (NEW) ── */}
      <InvitationsList onStatusChange={() => fetchRoomInfo(true)} />

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold mb-2">
            <DoorOpen className="h-3.5 w-3.5" />
            PHÒNG ĐANG THUÊ
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            {contract.roomName || `Phòng #${contract.roomId}`}
          </h1>
          <p className="text-gray-500 flex items-center gap-1.5 mt-1.5">
            <MapPin className="h-4 w-4 text-gray-400" />
            {contract.propertyAddress}
          </p>
        </div>
        <div className="flex items-center gap-3">
            <Link to={`/tenant/contracts/${contract.id}`}>
               <Button variant="outline" className="gap-2">
                 <FileText className="h-4 w-4" /> Chi tiết hợp đồng
               </Button>
            </Link>
            {isRefreshing && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="section-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trang thai hop dong</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {contract.status === 'ACTIVE' ? 'Dang hieu luc' : 'Dang cho ky/xac nhan'}
          </p>
        </div>
        <div className="section-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hoa don can xu ly</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{unpaidBills.length} hoa don</p>
        </div>
        <div className="section-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">So nguoi dang o</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{members.length + 1} / {contract.maxOccupants || 'Khong gioi han'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CỘT TRÁI: THÔNG TIN CHI TIẾT */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card trạng thái */}
          <div className="bg-white rounded-2xl border-2 border-primary/10 p-6 shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-32 h-32 text-primary" />
            </div>
            
            <div className="flex items-center gap-4 mb-6">
                <div className={`h-3 w-3 rounded-full ${contract.status === 'ACTIVE' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                <span className="font-bold text-gray-900 text-lg">
                    Trạng thái: {contract.status === 'ACTIVE' ? 'Đang hiệu lực' : 'Chờ ký kết'}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-6 relative z-10">
                <div className="space-y-1">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Ngày bắt đầu</p>
                    <p className="text-lg font-bold text-gray-800">{fmtDate(contract.startDate)}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Ngày kết thúc</p>
                    <p className="text-lg font-bold text-gray-800">{fmtDate(contract.endDate)}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Giá thuê hàng tháng</p>
                    <p className="text-xl font-extrabold text-primary">{fmt(contract.actualPrice)}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Tiền cọc đã đóng</p>
                    <p className="text-lg font-bold text-gray-800">{fmt(contract.depositAmount)}</p>
                </div>
            </div>
            
            {contract.status === 'PENDING_SIGNATURE' && (
                <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                   <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                   <div>
                       <p className="text-sm font-bold text-amber-800">Cần chữ ký của bạn</p>
                       <p className="text-xs text-amber-700 mt-0.5">Hợp đồng này đang chờ bạn xác nhận và ký để có hiệu lực chính thức.</p>
                       <Link to={`/tenant/contracts/${contract.id}`}>
                         <Button size="sm" className="mt-3 bg-amber-600 hover:bg-amber-700 h-8">Ký ngay</Button>
                       </Link>
                   </div>
                </div>
            )}
          </div>

          {/* Dịch vụ & Tiện ích */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col items-center text-center gap-3">
                <div className="p-3 bg-yellow-50 rounded-full">
                    <Zap className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                   <p className="text-xs text-gray-500 font-bold uppercase mb-1">Tiền điện</p>
                   <p className="text-lg font-extrabold text-gray-900">
                    {contract.elecPrice != null ? `${new Intl.NumberFormat('vi-VN').format(contract.elecPrice)}đ/kWh` : 'Theo giá nhà nước'}
                   </p>
                </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col items-center text-center gap-3">
                <div className="p-3 bg-cyan-50 rounded-full">
                    <Droplets className="h-6 w-6 text-cyan-600" />
                </div>
                <div>
                   <p className="text-xs text-gray-500 font-bold uppercase mb-1">Tiền nước</p>
                   <p className="text-lg font-extrabold text-gray-900">
                    {contract.waterPrice != null ? `${new Intl.NumberFormat('vi-VN').format(contract.waterPrice)}đ/m³` : 'Theo giá nhà nước'}
                   </p>
                </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col items-center text-center gap-3">
                <div className="p-3 bg-purple-50 rounded-full">
                    <Wifi className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                   <p className="text-xs text-gray-500 font-bold uppercase mb-1">Internet</p>
                   <p className="text-lg font-extrabold text-gray-900">
                    {contract.internetPrice && contract.internetPrice > 0 
                      ? `${new Intl.NumberFormat('vi-VN').format(contract.internetPrice)}đ/tháng` 
                      : 'Miễn phí'}
                   </p>
                </div>
            </div>
          </div>

          {/* Hóa đơn gần đây */}
          <div className="bg-white rounded-2xl border shadow-sm">
            <div className="p-6 border-b flex items-center justify-between">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary" /> Hóa đơn gần đây
                </h2>
                <Link to="/tenant/dashboard" className="text-xs text-primary hover:underline">Xem thêm ở dashboard</Link>
            </div>
            <div className="divide-y">
                {bills.length === 0 ? (
                    <div className="p-10 text-center space-y-2">
                        <Info className="h-8 w-8 text-gray-300 mx-auto" />
                        <p className="text-gray-500">Chưa có hóa đơn nào được tạo</p>
                    </div>
                ) : (
                    bills.slice(0, 3).map(bill => (
                        <div key={bill.id} className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-gray-100 rounded-xl">
                                    <Receipt className="h-5 w-5 text-gray-500" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">Tháng {bill.month}/{bill.year}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Hạn đóng: {fmtDate(bill.deadline)}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-extrabold text-gray-900">{fmt(bill.totalAmount)}</p>
                                <StatusBadge
                                  label={bill.status === 'PAID' ? 'Đã thanh toán' : bill.status === 'LATE' ? 'Quá hạn' : 'Chưa đóng'}
                                  tone={bill.status === 'PAID' ? 'success' : bill.status === 'LATE' ? 'danger' : 'warning'}
                                  className="text-[10px]"
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>
          </div>

          {/* ────── THÀNH VIÊN CÙNG PHÒNG (NEW) ────── */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
             <div className="p-6 border-b flex items-center justify-between bg-gray-50/30">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" /> Thành viên cùng phòng
                </h2>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                   <Users className="h-3.5 w-3.5" /> 
                   {members.length + 1} / {contract.maxOccupants || '∞'} người
                </div>
             </div>
             
             <div className="divide-y">
                {/* Chủ hợp đồng */}
                <div className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20">
                                <ShieldCheck className="h-6 w-6 text-primary" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-primary text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase border border-white">
                                Chủ phòng
                            </div>
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">{contract.tenantName}</p>
                            <p className="text-xs text-gray-500 italic">Người đứng tên hợp đồng</p>
                        </div>
                    </div>
                </div>

                {/* Các thành viên khác */}
                {members.map(member => (
                   <div key={member.id} className="p-5 flex items-center justify-between group hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                         {member.avatarUrl ? (
                            <img src={member.avatarUrl} className="w-12 h-12 rounded-full border shadow-sm" alt="" />
                         ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center border">
                               <Users className="h-6 w-6 text-gray-400" />
                            </div>
                         )}
                         <div>
                            <p className="font-bold text-gray-900">{member.fullName}</p>
                            <p className="text-xs text-gray-500">Ở từ: {fmtDate(member.joinedDate)}</p>
                         </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                         <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 uppercase">
                            Uy tín: {member.reputationScore}
                         </span>
                         {contract.status === 'ACTIVE' && user?.id === contract.tenantId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50 p-2"
                              onClick={() => handleRequestRemoval(member)}
                              disabled={isUpdatingResident}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" /> Xóa
                            </Button>
                         )}
                      </div>
                   </div>
                ))}

                 {/* Các lời mời đang chờ */}
                 {pendingInvites.map(invite => (
                    <div key={invite.id} className="p-5 flex items-center justify-between bg-amber-50/30">
                       <div className="flex items-center gap-4 opacity-70">
                          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center border border-amber-200">
                             <Clock className="h-6 w-6 text-amber-600" />
                          </div>
                          <div>
                             <p className="font-bold text-gray-900">{invite.inviteeName}</p>
                             <p className="text-xs text-amber-600 font-medium">
                                {invite.status === 'PENDING' ? 'Đang chờ người ở cùng xác nhận...' : 'Đang chờ chủ nhà duyệt...'}
                             </p>
                          </div>
                       </div>
                       <div className="text-right">
                          <StatusBadge
                            label={invite.status === 'PENDING' ? 'Chờ xác nhận' : 'Chờ duyệt'}
                            tone={invite.status === 'PENDING' ? 'info' : 'warning'}
                            className="text-[10px] uppercase"
                          />
                       </div>
                    </div>
                 ))}

                {/* Nút thêm thành viên */}
                {(!contract.maxOccupants || members.length + 1 < contract.maxOccupants) ? (
                    <div className="p-4 bg-gray-50/50">
                        <Button 
                            variant="outline" 
                            className="w-full border-dashed border-2 py-8 hover:bg-white hover:border-primary hover:text-primary transition-all group"
                            onClick={() => setIsInviteOpen(true)}
                        >
                            <UserPlus className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" /> 
                            Mời người ở cùng phòng
                        </Button>
                    </div>
                ) : (
                    <div className="p-4 bg-red-50/30 text-center">
                        <p className="text-sm text-red-600 font-medium">Phòng đã đủ số người tối đa cho phép.</p>
                    </div>
                )}
             </div>
          </div>
        </div>

        {/* CỘT PHẢI: CHỦ NHÀ & HÀNH ĐỘNG */}
        <div className="space-y-6">
            
            {/* Cảnh báo nợ */}
            {unpaidBills.length > 0 && (
                <div className="rounded-2xl bg-red-600 p-6 text-white shadow-lg shadow-red-200">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="h-5 w-5 text-red-200" />
                        <span className="font-bold uppercase tracking-tight text-xs">Phát hiện nợ</span>
                    </div>
                    <p className="text-2xl font-black mb-1">
                        {fmt(unpaidBills.reduce((a, b) => a + b.totalAmount, 0))}
                    </p>
                    <p className="text-xs opacity-90 mb-4">Bạn đang có {unpaidBills.length} hóa đơn chưa thanh toán.</p>
                    <Button variant="outline" className="w-full bg-white/10 border-white/20 hover:bg-white text-white hover:text-red-600 font-bold border-2 transition-all">
                        Thanh toán ngay <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            )}

            {/* Chủ nhà info */}
            <div className="bg-white rounded-2xl border shadow-sm p-6">
                <p className="text-xs text-gray-400 uppercase font-bold mb-4">Thông tin chủ nhà</p>
                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-4 border-2 border-primary/10">
                        <UserCircle className="h-10 w-10 text-primary" />
                    </div>
                    <p className="text-xl font-bold text-gray-900 mb-1">{contract.landlordName || "—"}</p>
                    <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-100 mb-6">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-bold uppercase">Chủ trọ tin cậy</span>
                    </div>
                    
                    <div className="w-full space-y-3">
                        <Button className="w-full h-11 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 flex gap-2">
                           <FileText className="h-4 w-4 text-blue-500" /> Nhắn tin cho chủ trọ
                        </Button>
                    </div>
                </div>
            </div>

            {/* Điều khoản khác */}
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-gray-50/50">
                   <p className="text-xs text-gray-500 font-bold uppercase">Điều khoản & Nội quy</p>
                </div>
                <div className="p-5">
                   <div className="text-xs text-gray-600 line-clamp-4 italic whitespace-pre-wrap">
                       {contract.additionalTerms || "Không có thỏa thuận bổ sung."}
                   </div>
                   <Link to={`/tenant/contracts/${contract.id}`} className="mt-4 block text-xs text-primary font-bold hover:underline flex items-center gap-1">
                      Đọc toàn bộ văn bản <ExternalLink className="h-3 w-3" />
                   </Link>
                </div>
            </div>

            {/* Quick action hỗ trợ */}
            <button className="w-full bg-indigo-900 rounded-2xl p-6 text-white hover:bg-indigo-950 transition-all text-left group">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-white/10 rounded-lg group-hover:scale-110 transition-transform">
                        <Info className="h-5 w-5 text-indigo-300" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <h3 className="font-bold text-lg mb-1">Gửi yêu cầu hỗ trợ</h3>
                <p className="text-xs text-indigo-300 leading-relaxed">
                    Báo cáo hư hỏng, yêu cầu bảo trì hoặc khiếu nại về phòng trọ.
                </p>
            </button>
        </div>
      </div>

      {/* ────── MODAL MỜI THÀNH VIÊN (NEW) ────── */}
      {isInviteOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div 
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" 
                onClick={() => !isInviting && setIsInviteOpen(false)}
              />
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="bg-primary p-6 text-white">
                      <div className="flex items-center justify-between mb-2">
                          <UserPlus className="h-6 w-6" />
                          <button onClick={() => setIsInviteOpen(false)} disabled={isInviting}>
                              <X className="h-6 w-6 opacity-70 hover:opacity-100" />
                          </button>
                      </div>
                      <h2 className="text-xl font-bold">Thêm thành viên ở cùng</h2>
                      <p className="text-blue-100 text-xs mt-1">Người được thêm phải có tài khoản trên hệ thống SmartRental.</p>
                  </div>

                  <div className="p-6 space-y-4">
                      <div className="space-y-2">
                          <Label htmlFor="email" className="text-xs font-bold uppercase text-gray-500">Email người được mời</Label>
                          <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input 
                                id="email"
                                placeholder="example@gmail.com" 
                                className="pl-10 h-12 rounded-xl border-gray-200 focus:ring-primary"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                disabled={isInviting}
                              />
                          </div>
                      </div>

                      <div className="space-y-2">
                          <Label htmlFor="msg" className="text-xs font-bold uppercase text-gray-500">Lời nhắn cho chủ nhà (Tùy chọn)</Label>
                          <textarea 
                            id="msg"
                            placeholder="Vui lòng duyệt cho em mình vào ở cùng..." 
                            className="w-full min-h-[100px] p-3 rounded-xl border border-gray-200 focus:ring-primary focus:outline-none text-sm"
                            value={inviteMessage}
                            onChange={(e) => setInviteMessage(e.target.value)}
                            disabled={isInviting}
                          />
                      </div>

                      <div className="bg-blue-50 p-4 rounded-xl flex gap-3">
                          <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
                          <p className="text-xs text-blue-700 leading-relaxed">
                              Yêu cầu này sẽ được gửi tới <strong>{contract.landlordName}</strong>. Sau khi chủ nhà phê duyệt và kiểm tra điểm uy tín, thành viên sẽ chính thức được thêm vào phòng.
                          </p>
                      </div>

                      <div className="flex gap-3 pt-2">
                          <Button 
                            variant="outline" 
                            className="flex-1 h-12 rounded-xl"
                            onClick={() => setIsInviteOpen(false)}
                            disabled={isInviting}
                          >
                              Hủy
                          </Button>
                          <Button 
                            className="flex-1 h-12 rounded-xl gap-2"
                            onClick={handleSendInvite}
                            isLoading={isInviting}
                          >
                              Gửi yêu cầu <ArrowRight className="h-4 w-4" />
                          </Button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* ────── MODAL XÓA THÀNH VIÊN (PREMIUM) ────── */}
      {isRemovalOpen && selectedMember && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div 
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" 
                onClick={() => !isUpdatingResident && setIsRemovalOpen(false)}
              />
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="bg-red-600 p-6 text-white">
                      <div className="flex items-center justify-between mb-2">
                          <LogOut className="h-6 w-6" />
                          <button onClick={() => setIsRemovalOpen(false)} disabled={isUpdatingResident}>
                              <X className="h-6 w-6 opacity-70 hover:opacity-100" />
                          </button>
                      </div>
                      <h2 className="text-xl font-bold">Xóa thành viên khỏi phòng</h2>
                      <p className="text-red-100 text-xs mt-1">Yêu cầu này cần được chủ trọ phê duyệt để có hiệu lực.</p>
                  </div>

                  <div className="p-6 space-y-5">
                      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <img 
                            src={selectedMember.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedMember.id}`} 
                            className="w-12 h-12 rounded-full border-2 border-white shadow-sm" 
                            alt="" 
                          />
                          <div>
                            <p className="font-bold text-gray-900">{selectedMember.fullName}</p>
                            <p className="text-xs text-gray-500">Uy tín: {selectedMember.reputationScore}</p>
                          </div>
                      </div>

                      <div className="space-y-2">
                          <Label htmlFor="rem-reason" className="text-xs font-bold uppercase text-gray-500">Lý do xóa thành viên</Label>
                          <textarea 
                            id="rem-reason"
                            placeholder="Ví dụ: Thành viên chuyển đi, vi phạm hợp đồng..." 
                            className="w-full min-h-[100px] p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none text-sm transition-all"
                            value={removalReason}
                            onChange={(e) => setRemovalReason(e.target.value)}
                            disabled={isUpdatingResident}
                          />
                      </div>

                      <div className="flex gap-3 pt-2">
                          <Button 
                            variant="outline" 
                            className="flex-1 h-12 rounded-xl"
                            onClick={() => setIsRemovalOpen(false)}
                            disabled={isUpdatingResident}
                          >
                              Hủy
                          </Button>
                          <Button 
                            className="flex-1 h-12 rounded-xl gap-2 bg-red-600 hover:bg-red-700 text-white"
                            onClick={confirmRemoval}
                            isLoading={isUpdatingResident}
                          >
                              Xác nhận xóa
                          </Button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

