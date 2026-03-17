import { useState, useMemo } from 'react'; // Thêm useMemo
import { useQuery } from '@tanstack/react-query';
import { userApi } from '@/api/userApi';
import type { User } from '@/types';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState<'tenant' | 'landlord'>('tenant');
  const [searchTerm, setSearchTerm] = useState(''); // State cho bộ lọc

  // Helper function cho điểm uy tín
  const getReputationBadge = (score: number) => {
    if (score >= 90) return { label: 'Rất tốt', class: 'bg-blue-100 text-blue-800 border-blue-200' };
    if (score >= 70) return { label: 'Tốt', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    if (score >= 30) return { label: 'Bình thường', class: 'bg-orange-100 text-orange-800 border-orange-200' };
    return { label: 'Uy tín thấp', class: 'bg-red-100 text-red-800 border-red-200' };
  };

  // Fetch dữ liệu
  const { data: tenants = [], isLoading: tenantsLoading, error: tenantsError } = useQuery<User[]>({
    queryKey: ['users', 'TENANT'],
    queryFn: () => userApi.getUsersByRole('TENANT'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: landlords = [], isLoading: landlordsLoading, error: landlordsError } = useQuery<User[]>({
    queryKey: ['users', 'LANDLORD'],
    queryFn: () => userApi.getUsersByRole('LANDLORD'),
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = tenantsLoading || landlordsLoading;
  const error = tenantsError || landlordsError;

  // Logic lọc dữ liệu bằng useMemo
  const filteredList = useMemo(() => {
    const list = activeTab === 'tenant' ? tenants : landlords;
    if (!searchTerm.trim()) return list;

    const s = searchTerm.toLowerCase();
    return list.filter((user) => {
      return (
        user.fullName?.toLowerCase().includes(s) ||
        user.phoneNumber?.includes(s) ||
        user.zaloPhone?.includes(s) ||
        user.cccdNumber?.includes(s) ||
        user.email?.toLowerCase().includes(s)
      );
    });
  }, [activeTab, tenants, landlords, searchTerm]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Quản Lý Người Dùng</h1>

      {/* Bộ lọc và Tabs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div className="flex-1 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {(['tenant', 'landlord'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSearchTerm(''); // Reset tìm kiếm khi đổi tab nếu muốn
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

        {/* Ô Search */}
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

      {/* Nội dung bảng */}
      {error ? (
        <div className="rounded-md bg-red-50 p-4 text-red-700">Lỗi: {(error as Error).message}</div>
      ) : isLoading ? (
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
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Trạng thái KYC</th>
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
                      <span className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold border uppercase',
                        user.kycStatus === 'VERIFIED' ? 'bg-green-100 text-green-800 border-green-200' :
                        user.kycStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        'bg-red-100 text-red-800 border-red-200'
                      )}>
                        {user.kycStatus || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col w-24">
                        <span className={cn('text-center rounded text-[10px] font-bold border uppercase', reputation.class)}>
                          {reputation.label}
                        </span>

                        <span className="text-[15px] text-center text-gray-400 mt-1">{user.reputationScore}/100</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          if (confirm(`Khóa tài khoản ${user.fullName || user.email}?`)) {
                            // Gọi userApi.lockUser(user.id)
                          }
                        }}
                      >
                        Khóa
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}