import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  User, Mail, Phone, ShieldCheck, Wallet, 
  MapPin, Calendar, Edit3, CheckCircle2, X, Save, 
  MessageCircle, Camera, Lock 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { userApi } from '@/api/userApi'; 
import { authApi } from '@/api/authApi'; 
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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // State quản lý Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  // State Form đổi mật khẩu
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  // State Form & KYC
  const [kycFiles, setKycFiles] = useState<{ front: File | null, back: File | null }>({ front: null, back: null });
  const [kycPreviews, setKycPreviews] = useState<{ front: string, back: string }>({ front: '', back: '' });
  const [kycCCCD, setKycCCCD] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    zaloPhone: '',
    dateOfBirth: '',
    currentAddress: '',
    cccdNumber: '',
    bankName: '',
    bankAccountNumber: '',
    bankAccountHolder: '',
    bankQrUrl: '',
  });

  // --- USE EFFECTS ---
  useEffect(() => {
    if (isEditModalOpen && user) {
      setFormData({
        fullName: user.fullName || '',
        phoneNumber: user.phoneNumber || '',
        zaloPhone: user.zaloPhone || '',
        dateOfBirth: user.dateOfBirth 
          ? (Array.isArray(user.dateOfBirth) 
              ? convertArrDateToString(user.dateOfBirth) 
              : user.dateOfBirth) 
          : '',
        currentAddress: user.currentAddress || '',
        cccdNumber: user.cccdNumber || '',
        bankName: user.bankName || '',
        bankAccountNumber: user.bankAccountNumber || '',
        bankAccountHolder: user.bankAccountHolder || '',
        bankQrUrl: user.bankQrUrl || '',
      });
    }
  }, [isEditModalOpen, user]);

  useEffect(() => {
    if (isKycModalOpen && user) {
      setKycCCCD(user.cccdNumber || '');
      setKycFiles({ front: null, back: null });
      setKycPreviews({ front: '', back: '' });
    }
  }, [isKycModalOpen, user]);

  // Reset form password khi đóng modal
  useEffect(() => {
    if (!isChangePasswordModalOpen) {
      setPasswordForm({
        oldPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
    }
  }, [isChangePasswordModalOpen]);

  const convertArrDateToString = (dateArr: any) => {
    if (!Array.isArray(dateArr)) return dateArr;
    const [year, month, day] = dateArr;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // --- HANDLERS ---
  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh quá lớn! Vui lòng chọn ảnh dưới 5MB.");
      return;
    }
    try {
      setIsUploadingAvatar(true);
      const newAvatarUrl = await userApi.uploadAvatar(file);
      updateUser({ ...user, avatarUrl: newAvatarUrl });
      toast.success("Đổi ảnh đại diện thành công!");
    } catch (error) {
      toast.error("Không thể tải ảnh lên.");
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConnectWallet = async () => {
    if (!window.ethereum) {
      toast.error("Vui lòng cài đặt MetaMask!");
      return;
    }
    try {
      setIsUpdatingWallet(true);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      await axiosClient.put('/users/wallet', null, { params: { address } });
      if (user) updateUser({ ...user, walletAddress: address });
      toast.success("Kết nối ví thành công!");
    } catch (error) {
      toast.error("Không thể liên kết ví.");
    } finally {
      setIsUpdatingWallet(false);
    }
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      toast.error("Vui lòng nhập họ tên.");
      return false;
    }
    return true;
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !validateForm()) return;
    try {
      setIsSaving(true);
      const updatedUser = await userApi.updateProfile(formData);
      updateUser({ ...user, ...updatedUser });
      toast.success("Cập nhật thành công!");
      setIsEditModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Cập nhật thất bại.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKycFileChange = (side: 'front' | 'back', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setKycFiles(prev => ({ ...prev, [side]: file }));
      setKycPreviews(prev => ({ ...prev, [side]: URL.createObjectURL(file) }));
    }
  };

  const handleSubmitKYC = async () => {
    if (!kycCCCD.trim() || !kycFiles.front || !kycFiles.back) {
      toast.error("Vui lòng nhập đủ thông tin và ảnh!");
      return;
    }
    try {
      setIsSaving(true);
      const message = await userApi.submitKYC(kycCCCD, kycFiles.front, kycFiles.back);
      const isAutoVerified = message.toLowerCase().includes("thành công");
      if (user) {
        updateUser({ 
          ...user, 
          cccdNumber: kycCCCD,
          kycStatus: isAutoVerified ? 'VERIFIED' : 'PENDING',
        });
      }
      toast.success(message);
      setIsKycModalOpen(false);
    } catch (error: any) {
      toast.error("Gửi hồ sơ xác thực thất bại.");
    } finally {
      setIsSaving(false);
    }
  };

  // ==================== ĐỔI MẬT KHẨU ====================
    // ==================== ĐỔI MẬT KHẨU ====================
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmNewPassword) {
      toast.error("Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      toast.error("Mật khẩu mới và xác nhận mật khẩu không khớp!");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự!");
      return;
    }

    try {
      setIsChangingPassword(true);

      await authApi.changePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
        confirmNewPassword: passwordForm.confirmNewPassword,
      });

      toast.success("Đổi mật khẩu thành công!");
      setIsChangePasswordModalOpen(false);
      
      // Reset form
      setPasswordForm({ oldPassword: '', newPassword: '', confirmNewPassword: '' });

    } catch (error: any) {
      console.error("Change password error:", error);

      let errorMessage = "Đổi mật khẩu thất bại. Vui lòng thử lại.";

      // Xử lý lỗi từ backend
      if (error.response?.data) {
        const data = error.response.data;

        // Trường hợp backend trả về object có message
        if (typeof data === 'string') {
          errorMessage = data;
        } 
        else if (data.message) {
          errorMessage = data.message;
        } 
        else if (data.error) {
          errorMessage = data.error;
        }
        // Trường hợp backend trả về lỗi validation hoặc exception
        else if (typeof data === 'object') {
          errorMessage = JSON.stringify(data); // fallback, ít dùng
        }
      } 
      else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) return <div className="p-10 text-center">Đang tải...</div>;

  return (
    <div className="space-y-6 relative pb-20">
      
      {/* BANNER & AVATAR */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/5" />
        <div className="px-8 pb-8">
          <div className="relative flex flex-col md:flex-row items-end gap-5 -mt-12">
            
            {/* Avatar */}
            <div className="relative group">
              <div 
                className="h-24 w-24 rounded-2xl bg-white p-1 shadow-lg cursor-pointer transition-transform hover:scale-105"
                onClick={handleAvatarClick}
              >
                <div className="h-full w-full rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden border relative">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-primary">
                      {user.fullName?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isUploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
            
            {/* Info */}
            <div className="flex-1 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{user.fullName || user.username}</h1>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                <span>
                  Tài khoản {
                    user.role === 'LANDLORD' ? 'Chủ cho thuê' :
                    user.role === 'ADMIN' ? 'Quản trị viên' : 'Người thuê'
                  }
                </span>              
              </div>
            </div>
            
            {/* Buttons */}
            <div className="flex gap-3 mb-2">
              <Button variant="outline" className="gap-2" onClick={() => setIsEditModalOpen(true)}>
                <Edit3 className="h-4 w-4" /> Chỉnh sửa hồ sơ
              </Button>
              <Button 
                variant="outline" 
                className="gap-2 border-orange-200 text-orange-600 hover:bg-orange-50"
                onClick={() => setIsChangePasswordModalOpen(true)}
              >
                <Lock className="h-4 w-4" /> Đổi mật khẩu
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Nội dung chính */}
      <div className="grid lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* CỘT TRÁI: THÔNG TIN & VÍ */}
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
                value={
                  user.dateOfBirth 
                    ? (Array.isArray(user.dateOfBirth) 
                        ? new Date(user.dateOfBirth[0], user.dateOfBirth[1] - 1, user.dateOfBirth[2]).toLocaleDateString('vi-VN')
                        : new Date(user.dateOfBirth).toLocaleDateString('vi-VN'))
                    : "Chưa cập nhật"
                } 
                icon={<Calendar className="h-4 w-4" />} 
              />
              <InfoItem label="Số CCCD" value={user.cccdNumber ? `xxxx-xxxx-${user.cccdNumber.slice(-4)}` : "Chưa cập nhật"} />
              <InfoItem label="Địa chỉ" value={user.currentAddress} icon={<MapPin className="h-4 w-4" />} />

              {/* KYC Status */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái xác thực</p>
                <div className="flex items-center gap-3">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    user.kycStatus === 'VERIFIED' ? 'bg-green-100 text-green-700' : 
                    user.kycStatus === 'PENDING' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {user.kycStatus === 'VERIFIED' && <CheckCircle2 className="h-3 w-3" />}
                    {user.kycStatus}
                  </div>
                  {user.kycStatus !== 'VERIFIED' && (
                    <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setIsKycModalOpen(true)}>
                      Xác thực ngay
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Block Thông tin Ngân hàng */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
              🏦 Thông tin Ngân hàng
            </h3>
            <p className="text-xs text-muted-foreground mb-4 -mt-3">Dùng để nhận hoàn cọc khi kết thúc hợp đồng thuê.</p>
            <div className="grid sm:grid-cols-2 gap-y-6 gap-x-12">
              <InfoItem label="Ngân hàng" value={user.bankName} />
              <InfoItem label="Số tài khoản" value={user.bankAccountNumber} />
              <InfoItem label="Chủ tài khoản" value={user.bankAccountHolder} />
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Mã QR</p>
                {user.bankQrUrl ? (
                  <img src={user.bankQrUrl} alt="QR" className="max-w-[120px] rounded-lg border" />
                ) : (
                  <span className="font-medium text-gray-700">Chưa cập nhật</span>
                )}
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
                    Địa chỉ này được dùng để định danh bạn trong các giao dịch ký kết hợp đồng điện tử.
                  </p>
                  {user.walletAddress && (
                    <code className="block mt-3 p-2 bg-white rounded border text-[11px] text-blue-600 font-mono break-all">
                      {user.walletAddress}
                    </code>
                  )}
                </div>
                <Button size="sm" onClick={handleConnectWallet} isLoading={isUpdatingWallet}>
                  {user.walletAddress ? "Đổi ví" : "Kết nối ví"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: STATS */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border shadow-sm p-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Điểm uy tín hệ thống</p>
            <div className="text-4xl font-black text-primary mb-2">{user.reputationScore}/100</div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div className="bg-primary h-full transition-all" style={{ width: `${user.reputationScore}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed">
              Điểm uy tín được tính dựa trên lịch sử thanh toán và tuân thủ hợp đồng.
            </p>
          </div>
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h4 className="font-bold mb-4 text-sm uppercase">Hoạt động</h4>
            <div className="space-y-4">
              <ActivityItem 
                label="Ngày tham gia" 
                value={new Date(user.createdAt).toLocaleString('vi-VN')} 
                icon={<Calendar />} 
              />              
              <ActivityItem 
                label="Cập nhật cuối" 
                value={new Date(user.updatedAt).toLocaleString('vi-VN')} 
                icon={<Edit3 />} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* MODAL CHỈNH SỬA HỒ SƠ */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <h3 className="text-xl font-bold text-gray-900">Cập nhật hồ sơ</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="rounded-full p-1 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Họ và tên</Label>
                <Input id="fullName" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Số điện thoại</Label>
                  <Input id="phoneNumber" value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zaloPhone">Số Zalo</Label>
                  <Input id="zaloPhone" value={formData.zaloPhone} onChange={(e) => setFormData({...formData, zaloPhone: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Ngày sinh</Label>
                <Input id="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cccdNumber">Số CCCD / CMND</Label>
                <Input id="cccdNumber" value={formData.cccdNumber} onChange={(e) => setFormData({...formData, cccdNumber: e.target.value})} disabled={user.kycStatus === 'VERIFIED'} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentAddress">Địa chỉ hiện tại</Label>
                <Input id="currentAddress" value={formData.currentAddress} onChange={(e) => setFormData({...formData, currentAddress: e.target.value})} />
              </div>

              {/* Bank Info */}
              <div className="border-t pt-4 mt-2">
                <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1">🏦 Thông tin Ngân hàng (cho hoàn cọc)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Ngân hàng</Label>
                    <Input id="bankName" placeholder="VD: Vietcombank" value={formData.bankName} onChange={(e) => setFormData({...formData, bankName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankAccountNumber">Số tài khoản</Label>
                    <Input id="bankAccountNumber" placeholder="VD: 1017726354" value={formData.bankAccountNumber} onChange={(e) => setFormData({...formData, bankAccountNumber: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2 mt-3">
                  <Label htmlFor="bankAccountHolder">Chủ tài khoản</Label>
                  <Input id="bankAccountHolder" placeholder="VD: NGUYEN VAN A" value={formData.bankAccountHolder} onChange={(e) => setFormData({...formData, bankAccountHolder: e.target.value})} />
                </div>
                <div className="space-y-2 mt-3">
                  <Label>Ảnh mã QR chuyển khoản</Label>
                  <div className="flex items-center gap-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 flex flex-col items-center justify-center h-24 w-24 bg-gray-50 hover:bg-gray-100 transition-colors relative group">
                      {formData.bankQrUrl ? (
                        <img src={formData.bankQrUrl} alt="QR" className="h-full w-full object-contain rounded" />
                      ) : (
                        <div className="text-center text-gray-400">
                          <Camera className="h-6 w-6 mx-auto mb-1 opacity-50" />
                          <span className="text-[10px]">Tải ảnh</span>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            setIsSaving(true);
                            const url = await userApi.uploadQr(file);
                            setFormData(prev => ({ ...prev, bankQrUrl: url }));
                            toast.success("Tải ảnh QR thành công!");
                          } catch (err) {
                            toast.error("Lỗi tải ảnh QR!");
                          } finally {
                            setIsSaving(false);
                          }
                        }} 
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Chọn hoặc kéo thả ảnh QR thanh toán của bạn vào ô bên cạnh. Định dạng: JPG, PNG.</p>
                      {formData.bankQrUrl && (
                        <Button type="button" variant="ghost" className="mt-2 text-red-500 hover:text-red-700 hover:bg-red-50 h-7 text-xs px-2" onClick={() => setFormData(prev => ({...prev, bankQrUrl: ''}))}>
                          Xóa ảnh
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>Hủy bỏ</Button>
                <Button type="submit" isLoading={isSaving} className="gap-2">
                  <Save className="h-4 w-4" /> Lưu thay đổi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ĐỔI MẬT KHẨU */}
      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-4 mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Lock className="h-5 w-5 text-orange-600" /> Đổi mật khẩu
              </h3>
              <button 
                onClick={() => setIsChangePasswordModalOpen(false)} 
                className="rounded-full p-1 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="oldPassword">Mật khẩu hiện tại</Label>
                <Input
                  id="oldPassword"
                  type="password"
                  value={passwordForm.oldPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                  placeholder="Nhập mật khẩu cũ"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Mật khẩu mới</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">Xác nhận mật khẩu mới</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  value={passwordForm.confirmNewPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value })}
                  placeholder="Nhập lại mật khẩu mới"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsChangePasswordModalOpen(false)}
                >
                  Hủy bỏ
                </Button>
                <Button 
                  type="submit" 
                  isLoading={isChangingPassword} 
                  className="gap-2"
                >
                  <Save className="h-4 w-4" /> Đổi mật khẩu
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KYC */}
      {isKycModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Xác thực danh tính (eKYC)
              </h3>
              <button onClick={() => setIsKycModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="kycCCCD">Số CCCD / CMND <span className="text-red-500">*</span></Label>
                <Input 
                  id="kycCCCD"
                  value={kycCCCD}
                  onChange={(e) => setKycCCCD(e.target.value)}
                  placeholder="Nhập chính xác số trên thẻ"
                />
                <p className="text-[11px] text-muted-foreground">Hệ thống sẽ tự động đối chiếu số này với ảnh bạn tải lên.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Mặt trước thẻ <span className="text-red-500">*</span></Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center h-40 bg-gray-50 hover:bg-gray-100 transition-colors relative group">
                    {kycPreviews.front ? (
                      <img src={kycPreviews.front} alt="Front" className="h-full w-full object-contain rounded" />
                    ) : (
                      <div className="text-center text-gray-400">
                        <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <span className="text-xs">Chưa có ảnh</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleKycFileChange('front', e)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mặt sau thẻ <span className="text-red-500">*</span></Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center h-40 bg-gray-50 hover:bg-gray-100 transition-colors relative group">
                    {kycPreviews.back ? (
                      <img src={kycPreviews.back} alt="Back" className="h-full w-full object-contain rounded" />
                    ) : (
                      <div className="text-center text-gray-400">
                        <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <span className="text-xs">Chưa có ảnh</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleKycFileChange('back', e)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsKycModalOpen(false)}>Hủy bỏ</Button>
              <Button onClick={handleSubmitKYC} isLoading={isSaving} className="bg-green-600 hover:bg-green-700">
                <ShieldCheck className="h-4 w-4 mr-2" /> Gửi hồ sơ xác thực
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sở thích thuê phòng (Tenant Only) */}
      {user.role === 'TENANT' && <TenantPreferenceSection />}
    </div>
  );
};
import { tenantPreferenceApi } from '@/api/tenantPreferenceApi';
import type { TenantPreference } from '@/types/index';
import { Lightbulb } from 'lucide-react';

const TenantPreferenceSection = () => {
  const [pref, setPref] = useState<Partial<TenantPreference>>({});
  const [isSavingPref, setIsSavingPref] = useState(false);
  const [isChanged, setIsChanged] = useState(false);

  useEffect(() => {
    const fetchPref = async () => {
      try {
        const res = await tenantPreferenceApi.getPreference();
        if (res.data) setPref(res.data);
      } catch (err) {
        // Có thể user chưa có preference
      }
    };
    fetchPref();
  }, []);

  const handleChange = (field: keyof TenantPreference, value: any) => {
    setPref(prev => ({ ...prev, [field]: value }));
    setIsChanged(true);
  };

  const handleSavePref = async () => {
    try {
      setIsSavingPref(true);
      const res = await tenantPreferenceApi.updatePreference(pref);
      if (res.data) setPref(res.data);
      toast.success("Đã cập nhật sở thích thành công!");
      setIsChanged(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi cập nhật sở thích.");
    } finally {
      setIsSavingPref(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-6 mt-6">
      <div className="flex justify-between items-center border-b pb-4 mb-5">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" /> Cài đặt sở thích thuê phòng
        </h3>
        {isChanged && (
          <Button size="sm" onClick={handleSavePref} isLoading={isSavingPref} className="gap-2">
            <Save className="h-4 w-4" /> Lưu sở thích
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Hệ thống AI sẽ dùng thông tin dưới đây để gợi ý những phòng trọ phù hợp nhất cho bạn ở trang chủ!
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Khu vực ưu tiên</Label>
            <Input 
              placeholder="Gò Vấp, Quận 12..." 
              value={pref.preferredLocation || ''}
              onChange={(e) => handleChange('preferredLocation', e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Có nuôi thú cưng không?</Label>
            <select 
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={pref.hasPet === true ? 'true' : pref.hasPet === false ? 'false' : ''}
              onChange={(e) => {
                const val = e.target.value;
                handleChange('hasPet', val === 'true' ? true : val === 'false' ? false : undefined);
              }}
            >
              <option value="">-- Chưa chọn --</option>
              <option value="true">Có nuôi</option>
              <option value="false">Không nuôi</option>
            </select>
          </div>
        </div>
        
        <div className="space-y-4 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
          <div className="space-y-2">
            <Label>Khoảng giá mong muốn (VNĐ)</Label>
            <div className="grid grid-cols-2 gap-3">
              <Input 
                type="number" 
                placeholder="Giá nhỏ nhất (Vd: 2000000)" 
                min={0}
                value={pref.targetPriceMin || ''}
                onChange={(e) => handleChange('targetPriceMin', e.target.value ? Number(e.target.value) : undefined)} 
              />
              <Input 
                type="number" 
                placeholder="Giá cao nhất (Vd: 4000000)" 
                min={0}
                value={pref.targetPriceMax || ''}
                onChange={(e) => handleChange('targetPriceMax', e.target.value ? Number(e.target.value) : undefined)} 
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Các tiện ích yêu cầu</Label>
            <Input 
              placeholder="Máy lạnh, máy giặt, gác lửng..." 
              value={pref.amenitiesRef || ''}
              onChange={(e) => handleChange('amenitiesRef', e.target.value)} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

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