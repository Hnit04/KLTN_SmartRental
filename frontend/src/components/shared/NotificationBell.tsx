import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client as StompClient } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from '@/context/AuthContext';
import {
  Bell, CheckCircle2, Info, Check,
  Star, CalendarClock, Banknote, FileText, Trash2, X
} from 'lucide-react';
import { toast } from 'sonner';
import { notificationApi } from '@/api/notificationApi';
import type { Notification } from '@/types';

// ─── HELPERS ────────────────────────────────────────────────────────────────

type TabKey = 'ALL' | 'UNREAD' | 'APPOINTMENT' | 'CONTRACT';

const APPOINTMENT_TYPES = ['APPOINTMENT_UPDATE'];
const CONTRACT_TYPES    = ['CONTRACT_UPDATE', 'PAYMENT_REMINDER', 'BILL_CREATED'];

function groupByDate(items: Notification[]): Record<string, Notification[]> {
  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

  return items.reduce<Record<string, Notification[]>>((acc, n) => {
    const d = new Date(n.createdAt); d.setHours(0, 0, 0, 0);
    const key =
      d.getTime() === today.getTime()     ? 'Hôm nay' :
      d.getTime() === yesterday.getTime() ? 'Hôm qua' :
      new Date(n.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (!acc[key]) acc[key] = [];
    acc[key].push(n);
    return acc;
  }, {});
}

function NotiIcon({ type }: { type: string }) {
  const map: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
    APPOINTMENT_UPDATE: { icon: <CalendarClock className="h-4 w-4" />, bg: 'bg-orange-100', color: 'text-orange-600' },
    CONTRACT_UPDATE:    { icon: <FileText className="h-4 w-4" />,      bg: 'bg-purple-100', color: 'text-purple-600' },
    PAYMENT_REMINDER:   { icon: <CheckCircle2 className="h-4 w-4" />,  bg: 'bg-green-100',  color: 'text-green-600'  },
    BILL_CREATED:       { icon: <Banknote className="h-4 w-4" />,      bg: 'bg-blue-100',   color: 'text-blue-600'   },
    NEW_REVIEW:         { icon: <Star className="h-4 w-4" />,          bg: 'bg-yellow-100', color: 'text-yellow-600' },
    SYSTEM:             { icon: <Info className="h-4 w-4" />,          bg: 'bg-gray-100',   color: 'text-gray-500'   },
  };
  const { icon, bg, color } = map[type] ?? map.SYSTEM;
  return <div className={`p-2 ${bg} ${color} rounded-full shrink-0`}>{icon}</div>;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen]               = useState(false);
  const [activeTab, setActiveTab]         = useState<TabKey>('ALL');
  const [isLoading, setIsLoading]         = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevUnread  = useRef(0);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // ── Đếm badge nhẹ (chỉ gọi unread-count)
  const pollUnreadCount = useCallback(async () => {
    try {
      const res = await notificationApi.getUnreadCount();
      const count: number = (res as any)?.data?.count ?? 0;
      if (count > prevUnread.current && prevUnread.current !== -1) {
        toast.info(`🔔 Bạn có ${count} thông báo chưa đọc`, {
          action: { label: 'Xem ngay', onClick: () => setIsOpen(true) },
          duration: 5000,
        });
        // Refresh full list nếu có mới
        fetchFull();
      }
      prevUnread.current = count;
    } catch { /* silent */ }
  }, []);

  // ── Fetch full danh sách
  const fetchFull = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await notificationApi.getMyNotifications();
      const data = (res as any)?.data;
      const list: Notification[] = Array.isArray(data) ? data : [];
      setNotifications(list);
      prevUnread.current = list.filter(n => !n.isRead).length;
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Init + polling 90s + WebSocket STOMP real-time
  useEffect(() => {
    prevUnread.current = -1; // Lần đầu không toast
    fetchFull().then(() => { prevUnread.current = notifications.filter(n => !n.isRead).length; });

    const interval = setInterval(pollUnreadCount, 90_000);

    // ── WebSocket STOMP: push real-time khi server tạo notification mới
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    let stompClient: StompClient | null = null;
    if (token) {
      stompClient = new StompClient({
        webSocketFactory: () => new SockJS('/ws'),
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 5000,
        onConnect: () => {
          console.log("🔔 [WebSocket] Connected successfully!");
          stompClient?.subscribe('/user/queue/notifications', (frame) => {
            try {
              const newNoti: Notification = JSON.parse(frame.body);
              console.log("🔔 [WebSocket] Received Notification:", newNoti);
              setNotifications(prev => [newNoti, ...prev]);
              prevUnread.current += 1;
              
              // ✅ Phát sự kiện Refresh cho toàn App (Delay 300ms để đợi Backend commit xong DB)
              console.log("🔄 [Realtime] Dispatching refresh event in 300ms for type:", newNoti.type);
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('app:refresh-data', { 
                  detail: { type: newNoti.type, referenceId: newNoti.referenceId } 
                }));
              }, 300);

              toast.info(`🔔 ${newNoti.title}`, {
                description: newNoti.message,
                action: { label: 'Xem', onClick: () => setIsOpen(true) },
                duration: 6000,
              });
            } catch (err) { 
              console.error("🔔 [WebSocket] Parse error:", err);
            }
          });
        },
        onStompError: (frame) => { 
          console.error("❌ [WebSocket] STOMP Error:", frame.headers['message']);
          console.log("❌ [WebSocket] Full frame:", frame);
        },
        onWebSocketClose: () => {
          console.warn("⚠️ [WebSocket] Connection closed");
        }
      });
      stompClient.activate();
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      stompClient?.deactivate();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ── Actions
  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch { toast.error('Lỗi cập nhật thông báo'); }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('Đã đánh dấu tất cả đã đọc');
    } catch { toast.error('Lỗi cập nhật thông báo'); }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await notificationApi.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch { toast.error('Lỗi xoá thông báo'); }
  };

  const handleNotificationClick = (noti: Notification) => {
    if (!noti.isRead) handleMarkAsRead(noti.id);
    setIsOpen(false);

    if (!noti.referenceId) return;
    
    const prefix = user?.role === 'LANDLORD' ? '/landlord' : '/tenant';

    switch (noti.type as string) {
      case 'APPOINTMENT_UPDATE':
        navigate(`${prefix}/appointments`);
        break;
      case 'CONTRACT_UPDATE':
      case 'PAYMENT_REMINDER':
      case 'BILL_CREATED':
        navigate(`${prefix}/contracts/${noti.referenceId}`);
        break;
      case 'NEW_REVIEW':
        navigate(`/properties/${noti.referenceId}`);
        break;
      default:
        break;
    }
  };

  // ── Filter theo tab
  const filtered = notifications.filter(n => {
    if (activeTab === 'UNREAD')      return !n.isRead;
    if (activeTab === 'APPOINTMENT') return APPOINTMENT_TYPES.includes(n.type);
    if (activeTab === 'CONTRACT')    return CONTRACT_TYPES.includes(n.type);
    return true;
  });

  const grouped = groupByDate(filtered);
  const groupKeys = Object.keys(grouped);

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'ALL',         label: 'Tất cả',    count: notifications.length },
    { key: 'UNREAD',      label: 'Chưa đọc',  count: unreadCount },
    { key: 'APPOINTMENT', label: 'Lịch hẹn',  count: notifications.filter(n => APPOINTMENT_TYPES.includes(n.type)).length },
    { key: 'CONTRACT',    label: 'Hợp đồng',  count: notifications.filter(n => CONTRACT_TYPES.includes(n.type)).length },
  ];

  return (
    <div className="relative" ref={dropdownRef}>

      {/* ── CHUÔNG ── */}
      <button
        onClick={() => { setIsOpen(o => !o); if (!isOpen) fetchFull(); }}
        className="relative p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
        aria-label="Thông báo"
      >
        <Bell
          className={`h-5 w-5 transition-transform ${unreadCount > 0 ? 'animate-[bell-shake_1s_ease-in-out_2]' : ''}`}
          strokeWidth={unreadCount > 0 ? 2.2 : 1.8}
        />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full translate-x-1/4 -translate-y-1/4">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── DROPDOWN ── */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-[360px] md:w-[400px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">

          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-base">Thông báo</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={handleMarkAllAsRead}
                  className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
                  <Check className="h-3 w-3" /> Đọc tất cả
                </button>
              )}
              <button onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-3 py-2 bg-gray-50 border-b overflow-x-auto scrollbar-none">
            {tabs.map(t => (
              <button key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === t.key
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-200'
                }`}
              >
                {t.label}
                {t.count != null && t.count > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === t.key ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : groupKeys.length === 0 ? (
              <div className="p-10 text-center text-gray-400 flex flex-col items-center">
                <div className="bg-gray-100 p-4 rounded-full mb-3">
                  <Bell className="h-6 w-6 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">Không có thông báo</p>
                <p className="text-xs mt-1">
                  {activeTab === 'UNREAD' ? 'Bạn đã đọc hết rồi 🎉' : 'Chưa có thông báo nào.'}
                </p>
              </div>
            ) : (
              groupKeys.map(dateKey => (
                <div key={dateKey}>
                  {/* Date separator */}
                  <div className="px-4 py-1.5 bg-gray-50 border-b border-t border-gray-100">
                    <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">{dateKey}</span>
                  </div>
                  <ul className="divide-y divide-gray-50">
                    {grouped[dateKey].map(noti => (
                      <li key={noti.id}
                        className={`group flex gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-gray-50 ${!noti.isRead ? 'bg-blue-50/40' : ''}`}
                        onClick={() => handleNotificationClick(noti)}
                      >
                        {/* Icon */}
                        <div className="pt-0.5">
                          <NotiIcon type={noti.type} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm leading-snug ${!noti.isRead ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                            {noti.title}
                          </h4>
                          <p className={`text-xs mt-0.5 leading-relaxed ${!noti.isRead ? 'text-gray-700' : 'text-gray-500'}`}>
                            {noti.message}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1.5 font-medium">
                            {new Date(noti.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        {/* Right: unread dot + delete */}
                        <div className="flex flex-col items-end gap-1 shrink-0 pt-1">
                          {!noti.isRead && <span className="h-2 w-2 bg-primary rounded-full block" />}
                          <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-300 hover:text-red-400 rounded-full hover:bg-red-50"
                            onClick={e => handleDelete(e, noti.id)}
                            title="Xoá thông báo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t px-4 py-2.5 flex justify-between items-center bg-gray-50">
              <span className="text-xs text-gray-400">{notifications.length} thông báo</span>
              <button
                onClick={() => { fetchFull(); }}
                className="text-xs text-primary hover:underline font-medium"
              >
                Tải lại ↻
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}