import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle2, Info, AlertCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
// import { notificationApi } from '@/api/notificationApi'; // Bỏ comment khi nối API thực tế
import type { Notification } from '@/types';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Tính số lượng thông báo CHƯA ĐỌC
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const fetchNotifications = async () => {
    try {
      // Khi có BE, hãy mở code này ra:
      // const res = await notificationApi.getMyNotifications();
      // let data = (res as any)?.data !== undefined ? (res as any).data : res;
      // setNotifications(Array.isArray(data) ? data : []);

      // MOCK DATA TẠM THỜI ĐỂ TEST UI
      setNotifications([
        { id: 1, title: 'Lịch hẹn mới', message: 'Nguyễn Văn A vừa đặt lịch xem phòng 101 vào ngày 15/03/2026.', type: 'SYSTEM', isRead: false, createdAt: new Date().toISOString() },
        { id: 2, title: 'Thanh toán thành công', message: 'Phòng 202 đã thanh toán hóa đơn tháng 2 qua SmartContract.', type: 'PAYMENT', isRead: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
        { id: 3, title: 'Hợp đồng sắp hết hạn', message: 'Hợp đồng phòng 301 sẽ hết hạn trong 5 ngày tới.', type: 'CONTRACT', isRead: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
      ]);
    } catch (error) {
      console.error("Lỗi lấy thông báo", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Logic: Bấm ra ngoài vùng dropdown thì tự đóng lại
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      // await notificationApi.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      toast.error("Lỗi cập nhật thông báo");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success("Đã đánh dấu tất cả là đã đọc");
    } catch (error) {
      toast.error("Lỗi cập nhật thông báo");
    }
  };

  // Trả về Icon tương ứng với loại thông báo (Type)
  const getIcon = (type: string) => {
    switch(type) {
      case 'PAYMENT': return <div className="p-2 bg-green-100 text-green-600 rounded-full"><CheckCircle2 className="h-4 w-4" /></div>;
      case 'CONTRACT': return <div className="p-2 bg-orange-100 text-orange-600 rounded-full"><AlertCircle className="h-4 w-4" /></div>;
      default: return <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><Info className="h-4 w-4" /></div>;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* NÚT CHUÔNG */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
      >
        <Bell className="h-5 w-5" />
        {/* Chấm đỏ đếm số lượng */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN DANH SÁCH */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          
          <div className="px-4 py-3 border-b flex justify-between items-center bg-gray-50/80">
            <h3 className="font-bold text-gray-900">Thông báo</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
              >
                <Check className="h-3 w-3" /> Đánh dấu đã đọc
              </button>
            )}
          </div>

          <div className="max-h-[350px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                <div className="bg-gray-100 p-3 rounded-full mb-3">
                  <Bell className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm">Bạn không có thông báo nào mới.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {notifications.map(noti => (
                  <li 
                    key={noti.id} 
                    className={`p-4 hover:bg-gray-50 transition-colors flex gap-3 cursor-pointer ${!noti.isRead ? 'bg-blue-50/40' : ''}`}
                    onClick={() => handleMarkAsRead(noti.id)}
                  >
                    <div className="shrink-0 pt-1">
                      {getIcon(noti.type)}
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-sm ${!noti.isRead ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                        {noti.title}
                      </h4>
                      <p className={`text-sm mt-0.5 leading-snug ${!noti.isRead ? 'text-gray-700' : 'text-gray-500'}`}>
                        {noti.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2 font-medium">
                        {new Date(noti.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                      </p>
                    </div>
                    {!noti.isRead && (
                       <div className="shrink-0 pt-2 pl-2">
                          <span className="h-2 w-2 bg-primary rounded-full block"></span>
                       </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-3 border-t text-center bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
             <span className="text-sm font-semibold text-primary">Xem tất cả thông báo</span>
          </div>
        </div>
      )}
    </div>
  );
}