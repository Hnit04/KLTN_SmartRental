import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/api/userApi';
import type { User } from '@/types';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState<'tenant' | 'landlord'>('tenant');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [lockReasons, setLockReasons] = useState<string[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [kycRejectReason, setKycRejectReason] = useState('');
  const [userHistory, setUserHistory] = useState<any[]>([]);
  const [lockDuration, setLockDuration] = useState(7);
  const [editedCccd, setEditedCccd] = useState('');

  const queryClient = useQueryClient();

  const QUICK_REASONS = [
    "Vi phạm nội quy",
    "Đăng tin giả mạo",
    "Spam quảng cáo",
    "Lừa đảo người dùng",
    "Hình ảnh không phù hợp",
    "Ngôn từ thô tục"
  ];

  const DURATION_OPTIONS = [
    { label: "3 ngày", value: 3 },
    { label: "7 ngày", value: 7 },
    { label: "15 ngày", value: 15 },
    { label: "30 ngày", value: 30 },
    { label: "Vĩnh viễn", value: 36500 }, 
  ];

  // Mutations
  const verifyKycMutation = useMutation({
    mutationFn: (userId: number) => userApi.verifyKYC(userId, editedCccd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowKycModal(false);
      toast.success("Đã phê duyệt định danh!");
    },
    onError: (err: any) => toast.error("Lỗi: " + (err.response?.data?.message || err.message))
  });

  const rejectKycMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: number; reason: string }) => userApi.rejectKYC(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowKycModal(false);
      setKycRejectReason('');
      toast.success("Đã từ chối định danh!");
    },
    onError: (err: any) => toast.error("Lỗi: " + (err.response?.data?.message || err.message))
  });

  const toggleReason = (reason: string) => {
    setLockReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason) 
        : [...prev, reason]            
    );
  };

  // Fetch users
  const { data: tenants = [], isLoading: tenantsLoading } = useQuery<User[]>({
    queryKey: ['users', 'TENANT'],
    queryFn: () => userApi.getUsersByRole('TENANT'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: landlords = [], isLoading: landlordsLoading } = useQuery<User[]>({
    queryKey: ['users', 'LANDLORD'],
    queryFn: () => userApi.getUsersByRole('LANDLORD'),
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = tenantsLoading || landlordsLoading;
  
  const filteredList = useMemo(() => {
    const list = activeTab === 'tenant' ? tenants : landlords;
    if (!searchTerm.trim()) return list;
    const s = searchTerm.toLowerCase();
    return list.filter((user) =>
      (user.fullName?.toLowerCase().includes(s) ||
        user.phoneNumber?.includes(s) ||
        user.zaloPhone?.includes(s) ||
        user.cccdNumber?.includes(s) ||
        user.email?.toLowerCase().includes(s))
    );
  }, [activeTab, tenants, landlords, searchTerm]);

  // Mutation khóa user
  const lockMutation = useMutation({
    mutationFn: ({ userId, durationDays, reason }: { userId: number; durationDays: number; reason: string[] }) =>
      userApi.lockUser(userId, durationDays, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', activeTab.toUpperCase()] });
      setShowLockModal(false);
      setLockReasons([]); 
      setLockDuration(7);   
      toast.success("Đã khóa tài khoản!", {
        description: "Tài khoản đã được khóa và không thể đăng nhập.",
        duration: 3000,
      });
    },
    onError: (err: any) => {
      const errorMessage = err.response?.data?.message || err.message;
      alert('Lỗi khi khóa: ' + errorMessage);
    },
  });

  const handleLockUnlockClick = (user: User) => {
    setSelectedUser(user);
    if (user.locked) {
      setShowUnlockModal(true);
    } else {
      setShowLockModal(true);   
    }
  };

  // Mutation mở khóa
  const unlockMutation = useMutation({
    mutationFn: (userId: number) => userApi.unlockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', activeTab.toUpperCase()] });
      setShowUnlockModal(false); 
      setSelectedUser(null); 
      toast.success("Mở khóa thành công!", {
        description: "Tài khoản đã được mở khóa và có thể đăng nhập lại bình thường.",
        duration: 3000,
      });
    },
    onError: (err: any) => {
      alert('Lỗi khi mở khóa: ' + (err.response?.data?.message || err.message));
    },
  });

  // Xem lịch sử
  const handleViewHistory = async (user: User) => {
    try {
      const history = await userApi.getUserHistory(user.id);
      setUserHistory(history);
      setSelectedUser(user);
      setShowHistoryModal(true);
    } catch (err: any) {
      alert('Không thể tải lịch sử: ' + (err.response?.data?.message || err.message));
    }
  };

  const confirmLock = () => {
    if (lockReasons.length === 0) {
      alert('Vui lòng chọn ít nhất một lý do khóa tài khoản');
      return;
    }

    if (selectedUser?.id) {
      lockMutation.mutate(
        {
          userId: selectedUser.id,
          durationDays: lockDuration, 
          reason: lockReasons, 
        },
        {
          onSuccess: () => {
            setShowLockModal(false);
            setLockReasons([]);
            setLockDuration(7); 
          },
          onError: (error: any) => {
            console.error("Lỗi khi khóa tài khoản:", error);
            alert("Có lỗi xảy ra khi thực hiện khóa tài khoản. Vui lòng thử lại.");
          }
        }
      );
    } else {
      alert("Không tìm thấy thông tin người dùng hợp lệ");
    }
  };

  const getReputationBadge = (score: number) => {
    if (score >= 90) return { label: 'Rất tốt', class: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (score >= 70) return { label: 'Tốt', class: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (score >= 30) return { label: 'Bình thường', class: 'bg-orange-50 text-orange-700 border-orange-200' };
    return { label: 'Uy tín thấp', class: 'bg-red-50 text-red-700 border-red-200' };
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header Page */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Quản Lý Người Dùng</h1>
        <p className="text-sm text-slate-500">Duyệt thông tin định danh và quản lý hoạt động của các tài khoản hệ thống</p>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgb(0,0,0,0.02)]">
        <div className="flex-1 border-b border-slate-100 pb-2 md:border-b-0 md:pb-0">
          <nav className="-mb-0.5 flex space-x-6">
            {(['tenant', 'landlord'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSearchTerm('');
                }}
                className={cn(
                  'inline-flex items-center border-b-2 px-1 pb-3 text-sm font-bold transition-all duration-200',
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                )}
              >
                {tab === 'tenant' ? 'Người Thuê' : 'Chủ Trọ'}
                <span className={cn(
                  "ml-2.5 rounded-lg px-2.5 py-0.5 text-xs font-semibold",
                  activeTab === tab ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-600"
                )}>
                  {tab === 'tenant' ? tenants.length : landlords.length}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="w-full md:w-80">
          <label htmlFor="search" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            Tìm kiếm nhanh
          </label>
          <Input
            id="search"
            type="text"
            placeholder="Tên, SĐT, CCCD, Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 rounded-xl border-slate-200 shadow-sm focus:border-primary focus:ring-primary bg-white text-sm placeholder:text-slate-400 transition-colors"
          />
        </div>
      </div>

      {/* Bảng dữ liệu */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200/60">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-3 text-sm font-medium text-slate-500">Đang tải dữ liệu người dùng...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center bg-slate-50/50">
          <p className="text-slate-500 text-sm">
            {searchTerm ? `Không tìm thấy kết quả cho "${searchTerm}"` : `Danh sách hiện đang trống.`}
          </p>
          {searchTerm && (
            <Button variant="link" onClick={() => setSearchTerm('')} className="mt-2 text-primary font-semibold h-auto p-0 hover:underline">
              Xóa bộ lọc
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/60 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/75">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-slate-400 uppercase">Người dùng</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-slate-400 uppercase">Liên hệ</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-slate-400 uppercase">CCCD</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-slate-400 uppercase">KYC</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-slate-400 uppercase">Uy tín</th>
                <th className="px-6 py-4 text-right text-[10px] font-bold tracking-wider text-slate-400 uppercase">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredList.map((user) => {
                const reputation = getReputationBadge(user.reputationScore || 0);
                return (
                  <tr key={user.id} className="hover:bg-slate-50/60 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-900">{user.fullName || '—'}</div>
                      <div className="text-xs text-slate-400 mt-0.5 font-sans">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-slate-800 font-medium">{user.phoneNumber || '—'}</span>
                        <span className="text-[11px] text-primary font-medium">Zalo: {user.zaloPhone || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-800 tracking-tight">
                      {user.cccdNumber || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        label={user.kycStatus === 'VERIFIED' ? 'Đã xác minh' : user.kycStatus === 'PENDING' ? 'Đang chờ duyệt' : user.kycStatus === 'REJECTED' ? 'Bị từ chối' : 'Chưa xác thực'}
                        tone={user.kycStatus === 'VERIFIED' ? 'success' : user.kycStatus === 'PENDING' ? 'info' : 'warning'}
                        className="text-[10px] uppercase font-bold px-2 py-1"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", reputation.class)}>
                          {reputation.label}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">{user.reputationScore}/100</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        {user.kycStatus === 'PENDING' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-[11px] font-bold border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 shadow-sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setEditedCccd(user.cccdNumber || '');
                              setShowKycModal(true);
                            }}
                          >
                            Duyệt KYC
                          </Button>
                        )}
                        <Button
                          variant={user.locked ? 'default' : 'destructive'}
                          size="sm"
                          className={cn(
                            "h-8 text-[11px] font-bold shadow-sm transition-all",
                            user.locked ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                          )}
                          onClick={() => handleLockUnlockClick(user)}
                        >
                          {user.locked ? 'Mở khóa' : 'Khóa'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-[11px] font-bold border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
                          onClick={() => handleViewHistory(user)}
                        >
                          Lịch sử
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nhập lý do khóa */}
      <Dialog open={showLockModal} onOpenChange={setShowLockModal}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl p-6 shadow-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-extrabold text-slate-900 tracking-tight">Khóa tài khoản</DialogTitle>
            <p className="text-sm text-slate-500">
              Thao tác với người dùng: <span className="font-bold text-slate-800">{selectedUser?.fullName}</span>
            </p>
          </DialogHeader>

          <div className="py-5 space-y-6">
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Thời hạn khóa:</label>
              <div className="grid grid-cols-3 gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={lockDuration === opt.value ? "default" : "outline"}
                    className="text-[11px] font-bold h-9 rounded-xl border-slate-200"
                    onClick={() => setLockDuration(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Lý do vi phạm (Chọn nhiều):</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {QUICK_REASONS.map((r) => {
                  const isSelected = lockReasons.includes(r);
                  return (
                    <span
                      key={r}
                      onClick={() => toggleReason(r)}
                      className={cn(
                        "px-2.5 py-1 text-[10px] font-bold rounded-lg cursor-pointer border transition-all select-none",
                        isSelected 
                          ? "bg-red-50 text-red-700 border-red-200 shadow-sm" 
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50/40 hover:text-red-600"
                      )}
                    >
                      {r} {isSelected && "✓"}
                    </span>
                  );
                })}
              </div>
              <div className="text-[11px] text-slate-400 font-medium italic min-h-[1.25rem]">
                {lockReasons.length > 0 
                  ? `Đã chọn: ${lockReasons.join(", ")}` 
                  : "Chưa chọn lý do nào"}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:space-x-0">
            <Button variant="outline" onClick={() => {
              setShowLockModal(false);
              setLockReasons([]);
            }} className="h-9 rounded-xl border-slate-200 font-bold">
              Hủy
            </Button>
            <Button 
              variant="destructive"
              className="h-9 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm"
              onClick={() => {
                if (selectedUser?.id) confirmLock();
              }} 
              disabled={lockReasons.length === 0}
            >
              Xác nhận khóa {lockDuration >= 36500 ? "Vĩnh viễn" : `${lockDuration} ngày`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal mở khóa */}
      <Dialog open={showUnlockModal} onOpenChange={setShowUnlockModal}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-extrabold text-slate-900">Xác nhận mở khóa</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Bạn có chắc chắn muốn mở khóa cho tài khoản <span className="font-bold text-slate-900">{selectedUser?.fullName || selectedUser?.email}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <p className="text-xs text-slate-500 leading-relaxed bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
              Sau khi mở khóa, người dùng này có thể đăng nhập và sử dụng các tính năng của hệ thống ngay lập tức.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button variant="outline" onClick={() => setShowUnlockModal(false)} className="h-9 font-bold rounded-xl border-slate-200">Hủy</Button>
            <Button 
              className="h-9 font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              onClick={() => selectedUser && unlockMutation.mutate(selectedUser.id)}
              disabled={unlockMutation.isPending}
            >
              {unlockMutation.isPending ? "Đang xử lý..." : "Xác nhận mở khóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal xem lịch sử */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-4xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-slate-900">Lịch sử thay đổi - {selectedUser?.fullName || selectedUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 max-h-[55vh] overflow-y-auto border rounded-xl border-slate-100 shadow-inner bg-slate-50/20">
            {userHistory.length === 0 ? (
              <p className="text-center text-slate-400 py-12 text-sm font-medium">Chưa có thay đổi nào được ghi nhận.</p>
            ) : (
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/90 sticky top-0 backdrop-blur-sm">
                  <tr>
                    <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Thời gian</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Người thực hiện</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Trạng thái khóa</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">Lý do</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {userHistory.map((rev, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 text-xs text-slate-600">{new Date(rev.modifiedAt).toLocaleString('vi-VN')}</td>
                      <td className="px-5 py-3 text-xs text-slate-700 font-medium">
                        <div>{rev.modifiedByFullName || '—'}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">Username: {rev.modifiedBy}</div>
                      </td>
                      <td className="px-5 py-3 text-xs">
                        {rev.locked ? (
                          <span className="text-red-600 font-bold bg-red-50 border border-red-100 px-2 py-0.5 rounded-md">Khóa</span>
                        ) : (
                          <span className="text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">Mở</span>
                        )}
                        {rev.lockUntil && <span className="block text-[10px] text-slate-400 mt-1"> đến {new Date(rev.lockUntil).toLocaleDateString('vi-VN')}</span>}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-600">
                        {Array.isArray(rev.lockReason) && rev.lockReason.length > 0 
                          ? rev.lockReason.join(", ") 
                          : '—'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowHistoryModal(false)} className="h-9 font-bold rounded-xl border-slate-200">
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal Xét duyệt KYC */}
      <Dialog open={showKycModal} onOpenChange={setShowKycModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg font-extrabold text-slate-900">Xét duyệt Định danh (KYC)</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Người dùng: <span className="font-bold text-slate-800">{selectedUser?.fullName}</span> (ID: #{selectedUser?.id})
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Mặt trước CCCD:</p>
              <div className="aspect-[1.5/1] bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center shadow-sm">
                {selectedUser?.cccdFrontUrl ? (
                  <img src={selectedUser.cccdFrontUrl} alt="Mặt trước" className="w-full h-full object-cover" />
                ) : (
                  <p className="text-slate-400 text-xs">Không có ảnh</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Mặt sau CCCD:</p>
              <div className="aspect-[1.5/1] bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center shadow-sm">
                {selectedUser?.cccdBackUrl ? (
                  <img src={selectedUser.cccdBackUrl} alt="Mặt sau" className="w-full h-full object-cover" />
                ) : (
                  <p className="text-slate-400 text-xs">Không có ảnh</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 p-5 bg-slate-50/70 rounded-2xl border border-slate-200/50">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Thông tin định danh (Admin có thể sửa nếu AI quét sai):</h4>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="adminEditCccd" className="text-xs text-slate-500 font-semibold">Số CCCD:</Label>
                <Input 
                  id="adminEditCccd"
                  value={editedCccd}
                  onChange={(e) => setEditedCccd(e.target.value)}
                  className="font-mono font-extrabold text-sm border-slate-200 text-slate-800 bg-white h-10 shadow-sm"
                  placeholder="Nhập số CCCD xác nhận"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-xs text-slate-500 font-semibold block">Số lượt AI thử thất bại:</span>
                <span className="font-extrabold text-amber-600 text-sm h-10 flex items-center">{selectedUser?.kycAttempts || 0} lần</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Lý do từ chối (Chỉ nhập nếu từ chối):</label>
            <textarea
              className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-slate-50/40 text-slate-700 min-h-[80px] shadow-inner"
              placeholder="VD: Ảnh mờ không đọc được, Số CCCD không khớp hình ảnh..."
              rows={3}
              value={kycRejectReason}
              onChange={(e) => setKycRejectReason(e.target.value)}
            />
          </div>

          <DialogFooter className="mt-6 gap-2 sm:space-x-0">
            <Button variant="outline" onClick={() => setShowKycModal(false)} className="h-9 font-bold rounded-xl border-slate-200">Để sau</Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white h-9 font-bold rounded-xl shadow-sm"
              onClick={() => selectedUser && rejectKycMutation.mutate({ userId: selectedUser.id, reason: kycRejectReason })}
              disabled={rejectKycMutation.isPending || !kycRejectReason.trim()}
            >
              {rejectKycMutation.isPending ? "Đang xử lý..." : "Từ chối hồ sơ"}
            </Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 font-bold rounded-xl shadow-sm"
              onClick={() => selectedUser && verifyKycMutation.mutate(selectedUser.id)}
              disabled={verifyKycMutation.isPending}
            >
              {verifyKycMutation.isPending ? "Đang xử lý..." : "Phê duyệt định danh"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}