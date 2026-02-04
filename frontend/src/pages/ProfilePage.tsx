import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  User, Mail, Phone, ShieldCheck, Wallet, 
  MapPin, Calendar, Edit3, CheckCircle2, X, Save, MessageCircle, Camera 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import axiosClient from '@/api/axiosClient';
import { userApi } from '@/api/api/userApi'; 
import { toast } from 'sonner';

// Khai báo global interface cho MetaMask
declare global {
  interface Window {
    ethereum?: any;
  }
}

const ProfilePage = () => {
  const { user, updateUser } = useAuth(); 
  
  // State quản lý loading
  const [isUpdatingWallet, setIsUpdatingWallet] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false); // Loading avatar
  
  // State quản lý Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Ref cho input file upload avatar
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State Form dữ liệu
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    zaloPhone: '',
    dateOfBirth: '',
    currentAddress: '',
    cccdNumber: '',
  });

  // Load dữ liệu user vào form khi mở Modal
  useEffect(() => {
    if (isEditModalOpen && user) {
      setFormData({
        fullName: user.fullName || '',
        phoneNumber: user.phoneNumber || '',
        zaloPhone: user.zaloPhone || '',
        dateOfBirth: user.dateOfBirth ? (Array.isArray(user.dateOfBirth) ? convertArrDateToString(user.dateOfBirth) : user.dateOfBirth) : '',
        currentAddress: user.currentAddress || '',
        cccdNumber: user.cccdNumber || '',
      });
    }
  }, [isEditModalOpen, user]);

  // Helper chuyển mảng ngày [yyyy, mm, dd] sang chuỗi "yyyy-mm-dd" cho input date
  const convertArrDateToString = (dateArr: any) => {
    if (!Array.isArray(dateArr)) return dateArr;
    const [year, month, day] = dateArr;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // --- 1. XỬ LÝ UPLOAD AVATAR ---
  const handleAvatarClick = () => {
    fileInputRef.current?.click(); // Kích hoạt input file ẩn
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate size (ví dụ: giới hạn 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh quá lớn! Vui lòng chọn ảnh dưới 5MB.");
      return;
    }

    try {
      setIsUploadingAvatar(true);
      
      // Gọi API Upload (Đã thêm trong userApi.ts)
      const newAvatarUrl = await userApi.uploadAvatar(file);

      // Cập nhật Context
      updateUser({ ...user, avatarUrl: newAvatarUrl });
      
      toast.success("Đổi ảnh đại diện thành công!");
    } catch (error) {
      console.error("Lỗi upload avatar:", error);
      toast.error("Không thể tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setIsUploadingAvatar(false);
      // Reset input để cho phép chọn lại cùng 1 file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // --- 2. XỬ LÝ KẾT NỐI VÍ METAMASK ---
  const handleConnectWallet = async () => {
    if (!window.ethereum) {
      toast.error("Vui lòng cài đặt MetaMask để sử dụng tính năng này!");
      return;
    }

    try {
      setIsUpdatingWallet(true);
      
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];

      if (!address) {
        toast.error("Không tìm thấy địa chỉ ví.");
        return;
      }

      // Gọi API update wallet (Dùng params để tránh lỗi URL)
      await axiosClient.put('/users/wallet', null, {
        params: { address: address }
      });
      
      if (user) updateUser({ ...user, walletAddress: address });
      
      toast.success("Kết nối ví thành công!");
    } catch (error: any) {
      console.error("Lỗi ví:", error);
      const message = error.response?.data || error.message || "Lỗi kết nối ví.";
      toast.error(typeof message === 'string' ? message : "Không thể liên kết ví này.");
    } finally {
      setIsUpdatingWallet(false);
    }
  };

  // --- 3. XỬ LÝ CẬP NHẬT HỒ SƠ ---
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setIsSaving(true);
      
      const updatedUser = await userApi.updateProfile({
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        zaloPhone: formData.zaloPhone,
        dateOfBirth: formData.dateOfBirth, // Gửi chuỗi yyyy-mm-dd
        currentAddress: formData.currentAddress,
        cccdNumber: formData.cccdNumber,
      });

      updateUser({ ...user, ...updatedUser });

      toast.success("Cập nhật hồ sơ thành công!");
      setIsEditModalOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error("Cập nhật thất bại. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return <div className="p-10 text-center">Đang tải thông tin...</div>;

  return (
    <div className="space-y-6 relative">
      {/* ─── BANNER & AVATAR ─── */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/5" />
        <div className="px-8 pb-8">
          <div className="relative flex flex-col md:flex-row items-end gap-5 -mt-12">
            
            {/* AVATAR BOX (Clickable) */}
            <div className="relative group">
              <div 
                className="h-24 w-24 rounded-2xl bg-white p-1 shadow-lg cursor-pointer transition-transform hover:scale-105"
                onClick={handleAvatarClick}
                title="Nhấn để đổi ảnh đại diện"
              >
                <div className="h-full w-full rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden border relative">
                  {/* Hiển thị Avatar */}
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-primary">
                      {user.fullName?.charAt(0).toUpperCase() || user.username.charAt(0).toUpperCase()}
                    </span>
                  )}

                  {/* Overlay khi hover hoặc loading */}
                  <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isUploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {isUploadingAvatar ? (
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                  </div>
                </div>
              </div>

              {/* Input File Ẩn */}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
            
            {/* User Basic Info */}
            <div className="flex-1 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{user.fullName || user.username}</h1>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                <span>Tài khoản {user.role === 'LANDLORD' ? 'Chủ cho thuê' : 'Người thuê'}</span>
              </div>
            </div>
            
            {/* Edit Button */}
            <Button 
              variant="outline" 
              className="gap-2 mb-2" 
              onClick={() => setIsEditModalOpen(true)}
            >
              <Edit3 className="h-4 w-4" /> Chỉnh sửa hồ sơ
            </Button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ─── CỘT TRÁI: THÔNG TIN CHI TIẾT ─── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> Thông tin định danh
            </h3>
            <div className="grid sm:grid-cols-2 gap-y-6 gap-x-12">
              <InfoItem label="Họ và tên" value={user.fullName} />
              <InfoItem label="Tên đăng nhập" value={user.username} />
              <InfoItem label="Email" value={user.email} icon={<Mail className="h-4 w-4" />} />
              <InfoItem label="Số điện thoại" value={user.phoneNumber} icon={<Phone className="h-4 w-4" />} />
              <InfoItem label="Số Zalo" value={user.zaloPhone} icon={<MessageCircle className="h-4 w-4" />} />
              <InfoItem 
                label="Ngày sinh" 
                // Xử lý hiển thị ngày sinh (có thể là chuỗi hoặc mảng từ Java)
                value={
                  user.dateOfBirth 
                    ? (Array.isArray(user.dateOfBirth) 
                        ? new Date(user.dateOfBirth[0], user.dateOfBirth[1] - 1, user.dateOfBirth[2]).toLocaleDateString('vi-VN')
                        : new Date(user.dateOfBirth).toLocaleDateString('vi-VN'))
                    : null
                } 
                icon={<Calendar className="h-4 w-4" />} 
              />
              <InfoItem label="Số CCCD" value={user.cccdNumber ? `xxxx-xxxx-${user.cccdNumber.slice(-4)}` : "Chưa cập nhật"} />
              <InfoItem label="Địa chỉ" value={user.currentAddress} icon={<MapPin className="h-4 w-4" />} />

              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái xác thực</p>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  user.kycStatus === 'VERIFIED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {user.kycStatus === 'VERIFIED' ? <CheckCircle2 className="h-3 w-3" /> : null}
                  {user.kycStatus}
                </div>
              </div>
            </div>
          </div>

          {/* Block Ví MetaMask */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" /> Kết nối Blockchain
            </h3>
            <div className="p-4 rounded-xl bg-muted/30 border border-dashed border-gray-300">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-semibold text-sm">Địa chỉ ví Smart Contract</p>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Địa chỉ này được dùng để định danh bạn trong các giao dịch ký kết hợp đồng điện tử và hoàn trả tiền cọc tự động.
                  </p>
                  {user.walletAddress && (
                    <code className="block mt-3 p-2 bg-white rounded border text-[11px] text-blue-600 font-mono break-all">
                      {user.walletAddress}
                    </code>
                  )}
                </div>
                <Button 
                  size="sm" 
                  onClick={handleConnectWallet} 
                  isLoading={isUpdatingWallet}
                >
                  {user.walletAddress ? "Đổi ví" : "Kết nối ví"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── CỘT PHẢI: STATS & ACTIVITY ─── */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border shadow-sm p-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Điểm uy tín hệ thống</p>
            <div className="text-4xl font-black text-primary mb-2">{user.reputationScore}/100</div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-full transition-all" 
                style={{ width: `${user.reputationScore}%` }} 
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed">
              Điểm uy tín được tính dựa trên lịch sử thanh toán và tuân thủ hợp đồng.
            </p>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h4 className="font-bold mb-4 text-sm uppercase">Hoạt động</h4>
            <div className="space-y-4">
              <ActivityItem label="Ngày tham gia" value={new Date(user.createdAt).toLocaleDateString('vi-VN')} icon={<Calendar />} />
              <ActivityItem label="Cập nhật cuối" value={new Date(user.updatedAt).toLocaleDateString('vi-VN')} icon={<Edit3 />} />
            </div>
          </div>
        </div>
      </div>

      {/* ─── MODAL CHỈNH SỬA PROFILE ─── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <h3 className="text-xl font-bold text-gray-900">Cập nhật hồ sơ</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-full p-1 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              
              <div className="space-y-2">
                <Label htmlFor="fullName">Họ và tên</Label>
                <Input 
                  id="fullName" 
                  value={formData.fullName} 
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  placeholder="Nhập họ tên đầy đủ"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Số điện thoại</Label>
                  <Input 
                    id="phoneNumber" 
                    value={formData.phoneNumber} 
                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                    placeholder="SĐT liên hệ"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zaloPhone">Số Zalo</Label>
                  <Input 
                    id="zaloPhone" 
                    value={formData.zaloPhone} 
                    onChange={(e) => setFormData({...formData, zaloPhone: e.target.value})}
                    placeholder="SĐT Zalo"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Ngày sinh</Label>
                <Input 
                  id="dateOfBirth" 
                  type="date"
                  value={formData.dateOfBirth} 
                  onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cccdNumber">Số CCCD / CMND</Label>
                <Input 
                  id="cccdNumber" 
                  value={formData.cccdNumber} 
                  onChange={(e) => setFormData({...formData, cccdNumber: e.target.value})}
                  placeholder="Nhập số CCCD"
                  disabled={user.kycStatus === 'VERIFIED'}
                />
                {user.kycStatus === 'VERIFIED' && (
                  <p className="text-[10px] text-green-600">
                    * Tài khoản đã xác thực, không thể thay đổi CCCD.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentAddress">Địa chỉ hiện tại</Label>
                <Input 
                  id="currentAddress" 
                  value={formData.currentAddress} 
                  onChange={(e) => setFormData({...formData, currentAddress: e.target.value})}
                  placeholder="Số nhà, tên đường, phường/xã..."
                />
              </div>

              {/* Footer Modal */}
              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Hủy bỏ
                </Button>
                <Button type="submit" isLoading={isSaving} className="gap-2">
                  <Save className="h-4 w-4" /> Lưu thay đổi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Sub-components (UI nhỏ) ---

const InfoItem = ({ label, value, icon }: any) => (
  <div className="space-y-1">
    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
    <div className="flex items-center gap-2 font-medium text-gray-700">
      {icon}
      <span className="truncate">{value || "Chưa cập nhật"}</span>
    </div>
  </div>
);

const ActivityItem = ({ label, value, icon }: any) => (
  <div className="flex items-center gap-3">
    <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
      {React.cloneElement(icon, { size: 16 })}
    </div>
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  </div>
);

export default ProfilePage;