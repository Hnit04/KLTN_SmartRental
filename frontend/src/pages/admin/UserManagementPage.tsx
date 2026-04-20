import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/api/userApi';
import type { User } from '@/types';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,DialogDescription } from '@/components/ui/Dialog'; // shadcn/ui dialog

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState<'tenant' | 'landlord'>('tenant');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [lockReasons, setLockReasons] = useState<string[]>([]);  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [userHistory, setUserHistory] = useState<any[]>([]); 
  const [showUnlockModal, setShowUnlockModal] = useState(false); 

  const QUICK_REASONS = [
    "Vi phạm nội quy",
    "Đăng tin giả mạo",
    "Spam quảng cáo",
    "Lừa đảo người dùng",
    "Hình ảnh không phù hợp",
    "Ngôn từ thô tục"
  ];
  const toggleReason = (reason: string) => {
  setLockReasons((prev) =>
    prev.includes(reason)
      ? prev.filter((r) => r !== reason) 
      : [...prev, reason]             
  );
};
  const [lockDuration, setLockDuration] = useState(7); 
  const DURATION_OPTIONS = [
  { label: "3 ngày", value: 3 },
  { label: "7 ngày", value: 7 },
  { label: "15 ngày", value: 15 },
  { label: "30 ngày", value: 30 },
  { label: "Vĩnh viễn", value: 36500 }, 
];
  const queryClient = useQueryClient();

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
  console.log("Tenants:", tenants);
  console.log("Landlords:", landlords);

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
  console.log("User history:", userHistory);

  
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
    if (score >= 90) return { label: 'Rất tốt', class: 'bg-blue-100 text-blue-800 border-blue-200' };
    if (score >= 70) return { label: 'Tốt', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    if (score >= 30) return { label: 'Bình thường', class: 'bg-orange-100 text-orange-800 border-orange-200' };
    return { label: 'Uy tín thấp', class: 'bg-red-100 text-red-800 border-red-200' };
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Quản Lý Người Dùng</h1>

      {/* Tabs + Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div className="flex-1 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {(['tenant', 'landlord'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSearchTerm('');
                }}
                className={cn(
                  'inline-flex items-center border-b-2 px-1 pb-4 text-sm font-medium transition-colors',
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                )}
              >
                {tab === 'tenant' ? 'Người Thuê' : 'Chủ Trọ'}
                <span className="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-900">
                  {tab === 'tenant' ? tenants.length : landlords.length}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="w-full md:w-80">
          <label htmlFor="search" className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">
            Tìm kiếm nhanh
          </label>
          <input
            id="search"
            type="text"
            placeholder="Tên, SĐT, CCCD, Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Bảng dữ liệu */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-3 text-gray-500">Đang tải dữ liệu...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500 text-sm">
            {searchTerm ? `Không tìm thấy kết quả cho "${searchTerm}"` : `Danh sách hiện đang trống.`}
          </p>
          {searchTerm && (
            <Button variant="link" onClick={() => setSearchTerm('')} className="mt-2 text-primary">
              Xóa bộ lọc
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Người dùng</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Liên hệ</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">CCCD</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">KYC</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Uy tín</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredList.map((user) => {
                const reputation = getReputationBadge(user.reputationScore || 0);
                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">{user.fullName || '—'}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex flex-col">
                        <span>SĐT: {user.phoneNumber || '—'}</span>
                        <span className="text-xs text-blue-600">Zalo: {user.zaloPhone || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">
                      {user.cccdNumber || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        label={user.kycStatus || 'UNKNOWN'}
                        tone={user.kycStatus === 'VERIFIED' ? 'success' : user.kycStatus === 'PENDING' ? 'warning' : 'danger'}
                        className="text-[11px] uppercase"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col w-24">
                        <StatusBadge
                          label={reputation.label}
                          tone={(user.reputationScore || 0) >= 70 ? 'success' : (user.reputationScore || 0) >= 30 ? 'warning' : 'danger'}
                          className="justify-center text-[10px] uppercase"
                        />
                        <span className="text-[15px] text-center text-gray-400 mt-1">{user.reputationScore}/100</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      <Button
                      variant={user.locked ? 'default' : 'destructive'}
                      size="sm"
                      onClick={() => handleLockUnlockClick(user)}
                    >
                      {user.locked ? 'Mở khóa' : 'Khóa'}
                    </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => handleViewHistory(user)}
                      >
                        Lịch sử
                      </Button>
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
  <DialogContent className="sm:max-w-[450px]">
    <DialogHeader>
      <DialogTitle>Khóa tài khoản</DialogTitle>
      <p className="text-sm text-gray-500">
        Người dùng: <span className="font-bold">{selectedUser?.fullName}</span>
      </p>
    </DialogHeader>

    <div className="py-4 space-y-6">
      <div>
        <label className="block text-sm font-medium mb-3 text-red-600">Thời hạn khóa:</label>
        <div className="grid grid-cols-3 gap-2">
          {DURATION_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant={lockDuration === opt.value ? "default" : "outline"}
              className="text-xs h-9"
              onClick={() => setLockDuration(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Lý do vi phạm (Chọn nhiều):</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {QUICK_REASONS.map((r) => {
            const isSelected = lockReasons.includes(r);
            return (
              <span
                key={r}
                onClick={() => toggleReason(r)}
                className={`px-2 py-1 text-[11px] rounded cursor-pointer border transition-colors ${
                  isSelected 
                    ? "bg-red-600 text-white border-red-600" 
                    : "bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700"
                }`}
              >
                {r} {isSelected && "✓"}
              </span>
            );
          })}
        </div>
        
        <div className="text-xs text-muted-foreground italic min-h-[1.5rem]">
          {lockReasons.length > 0 
            ? `Đã chọn: ${lockReasons.join(", ")}` 
            : "Chưa chọn lý do nào"}
        </div>
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => {
        setShowLockModal(false);
        setLockReasons([]);
      }}>
        Hủy
      </Button>
      <Button 
        variant="destructive" 
        onClick={() => {
          if (selectedUser?.id) {
            confirmLock(selectedUser.id, lockDuration, lockReasons);
          }
        }} 
        disabled={lockReasons.length === 0}
      >
        Xác nhận khóa {lockDuration >= 36500 ? "Vĩnh viễn" : `${lockDuration} ngày`}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

      <Dialog open={showUnlockModal} onOpenChange={setShowUnlockModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Xác nhận mở khóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn mở khóa cho tài khoản <span className="font-bold text-gray-900">{selectedUser?.fullName || selectedUser?.email}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500">
              Sau khi mở khóa, người dùng này có thể đăng nhập và sử dụng các tính năng của hệ thống ngay lập tức.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnlockModal(false)}>Hủy</Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white"
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Lịch sử thay đổi - {selectedUser?.fullName || selectedUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-y-auto">
            {userHistory.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Chưa có thay đổi nào được ghi nhận.</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Thời gian</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Người thực hiện</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Trạng thái khóa</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Lý do</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {userHistory.map((rev, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">{new Date(rev.modifiedAt).toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-2 text-sm">
                        <div className="text-sm font-semibold text-gray-900">{rev.modifiedByFullName || '—'}</div>
                      <div className="text-xs text-gray-500">Username: {rev.modifiedBy}</div>
                        </td>
                      <td className="px-4 py-2 text-sm">
                        {rev.locked ? (
                          <span className="text-red-600">Khóa</span>
                        ) : (
                          <span className="text-green-600">Mở</span>
                        )}
                        {rev.lockUntil && ` đến ${new Date(rev.lockUntil).toLocaleDateString('vi-VN')}`}
                      </td>
                      <td className="px-4 py-2 text-sm">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryModal(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}