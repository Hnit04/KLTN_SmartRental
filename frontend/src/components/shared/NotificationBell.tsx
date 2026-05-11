import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client as StompClient } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from '@/context/AuthContext';
import {
  Bell, CheckCircle2, Info, Check,
  Star, CalendarClock, Banknote, FileText, Trash2, X, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { notificationApi } from '@/api/notificationApi';
import type { Notification } from '@/types';

// ─── HELPERS ────────────────────────────────────────────────────────────────

type TabKey = 'ALL' | 'UNREAD' | 'APPOINTMENT' | 'CONTRACT';

const APPOINTMENT_TYPES = ['APPOINTMENT_UPDATE'];
const CONTRACT_TYPES = ['CONTRACT_UPDATE', 'PAYMENT_REMINDER', 'BILL_CREATED'];

function groupByDate(items: Notification[]): Record<string, Notification[]> {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

  return items.reduce<Record<string, Notification[]>>((acc, n) => {
    const d = new Date(n.createdAt); d.setHours(0, 0, 0, 0);
    const key =
      d.getTime() === today.getTime() ? 'Hôm nay' :
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
    CONTRACT_UPDATE: { icon: <FileText className="h-4 w-4" />, bg: 'bg-purple-100', color: 'text-purple-600' },
    PAYMENT_REMINDER: { icon: <CheckCircle2 className="h-4 w-4" />, bg: 'bg-green-100', color: 'text-green-600' },
    BILL_CREATED: { icon: <Banknote className="h-4 w-4" />, bg: 'bg-blue-100', color: 'text-blue-600' },
    NEW_REVIEW: { icon: <Star className="h-4 w-4" />, bg: 'bg-yellow-100', color: 'text-yellow-600' },
    SYSTEM: { icon: <Info className="h-4 w-4" />, bg: 'bg-gray-100', color: 'text-gray-500' },
  };
  const { icon, bg, color } = map[type] ?? map.SYSTEM;
  return <div className={`p-2 ${bg} ${color} rounded-full shrink-0`}>{icon}</div>;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');
  const [isLoading, setIsLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevUnread = useRef(0);

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
    if (!isAuthenticated) return;

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

    return () => {
      clearInterval(interval);
      stompClient?.deactivate();
    };
  }, [isAuthenticated, fetchFull, pollUnreadCount]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
      case 'ROOM_UPDATED':
        // Landlord: referenceId = propertyId → trang quản lý khu trọ
        if (user?.role === 'LANDLORD') {
          navigate(`/landlord/properties/${noti.referenceId}`);
        } else {
          navigate(`/rooms/${noti.referenceId}`);
        }
        break;
      case 'SYSTEM':
        // Tenant: referenceId = roomId → trang chi tiết phòng
        navigate(`/rooms/${noti.referenceId}`);
        break;
      default:
        break;
    }
  };

  // ── Filter theo tab
  const filtered = notifications.filter(n => {
    if (activeTab === 'UNREAD') return !n.isRead;
    if (activeTab === 'APPOINTMENT') return APPOINTMENT_TYPES.includes(n.type);
    if (activeTab === 'CONTRACT') return CONTRACT_TYPES.includes(n.type);
    return true;
  });

  const grouped = groupByDate(filtered);
  const groupKeys = Object.keys(grouped);

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'ALL', label: 'Tất cả', count: notifications.length },
    { key: 'UNREAD', label: 'Chưa đọc', count: unreadCount },
    { key: 'APPOINTMENT', label: 'Lịch hẹn', count: notifications.filter(n => APPOINTMENT_TYPES.includes(n.type)).length },
    { key: 'CONTRACT', label: 'Hợp đồng', count: notifications.filter(n => CONTRACT_TYPES.includes(n.type)).length },
  ];

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>

      {/* ── CHUÔNG ── */}
      <button
        onClick={() => { setIsOpen(o => !o); if (!isOpen) fetchFull(); }}
        className="relative p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-full transition-all duration-200"
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
        <div className="fixed left-3 right-3 top-16 z-[60] flex max-h-[min(72dvh,560px)] min-h-0 flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.18)] animate-in fade-in slide-in-from-top-2 duration-200 md:absolute md:inset-x-auto md:left-auto md:right-0 md:top-full md:mt-3 md:max-h-[min(520px,72dvh)] md:w-[min(400px,calc(100vw-2rem))] lg:w-[420px]">

          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-stone-100 bg-gradient-to-b from-stone-50/90 to-white px-4 pb-3 pt-3.5">
            <h3 className="text-[15px] font-semibold tracking-tight text-stone-900">Thông báo</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  <Check className="h-3.5 w-3.5" /> Đọc tất cả
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-stone-100 bg-stone-50/80 px-3 py-2.5 scrollbar-none">
            {tabs.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === t.key
                    ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30'
                    : 'bg-white/80 text-stone-600 shadow-sm ring-1 ring-stone-200/80 hover:bg-white hover:text-stone-900'
                }`}
              >
                <span>{t.label}</span>
                {t.count != null && t.count > 0 && (
                  <span
                    className={`min-w-[1.125rem] rounded-full px-1 py-0.5 text-center text-[10px] font-bold leading-none ${
                      activeTab === t.key ? 'bg-white/25 text-white' : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Danh sách — flex-1 + min-h-0: luôn chừa chỗ cho footer, không bị cắt */}
          <div className="notif-panel-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : groupKeys.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-12 text-center text-stone-400">
                <div className="mb-3 rounded-full bg-stone-100 p-4">
                  <Bell className="h-7 w-7 text-stone-300" />
                </div>
                <p className="text-sm font-medium text-stone-600">Không có thông báo</p>
                <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-stone-500">
                  {activeTab === 'UNREAD' ? 'Bạn đã đọc hết rồi.' : 'Chưa có thông báo trong mục này.'}
                </p>
              </div>
            ) : (
              groupKeys.map(dateKey => (
                <div key={dateKey}>
                  <div className="sticky top-0 z-[1] border-y border-stone-100 bg-stone-50/95 px-4 py-2 backdrop-blur-sm">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{dateKey}</span>
                  </div>
                  <ul className="divide-y divide-stone-100">
                    {grouped[dateKey].map(noti => (
                      <li
                        key={noti.id}
                        className={`group relative flex cursor-pointer gap-3 px-4 py-4 transition-all duration-150 hover:bg-stone-50/90 ${
                          !noti.isRead
                            ? 'bg-amber-50/50 pl-3 before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-full before:bg-primary'
                            : ''
                        }`}
                        onClick={() => handleNotificationClick(noti)}
                      >
                        <div className="shrink-0 pt-0.5">
                          <NotiIcon type={noti.type} />
                        </div>

                        <div className="min-w-0 flex-1 pr-1">
                          <h4
                            className={`text-[13px] leading-snug ${!noti.isRead ? 'font-semibold text-stone-900' : 'font-medium text-stone-800'}`}
                          >
                            {noti.title}
                          </h4>
                          <p
                            className={`mt-1 text-xs leading-relaxed ${!noti.isRead ? 'text-stone-700' : 'text-stone-500'}`}
                          >
                            {noti.message}
                          </p>
                          <p className="mt-2 text-[11px] font-medium tabular-nums text-stone-400">
                            {new Date(noti.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
                          {!noti.isRead && <span className="block h-2 w-2 rounded-full bg-primary shadow-sm ring-2 ring-primary/20" />}
                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-stone-400 transition-all duration-200 hover:bg-red-50 hover:text-red-600 sm:text-stone-300 sm:opacity-0 sm:group-hover:opacity-100 sm:group-hover:text-stone-300"
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

          {notifications.length > 0 && (
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-stone-200/80 bg-stone-50 px-4 py-3">
              <span className="text-xs font-medium text-stone-500">
                <span className="font-semibold text-stone-800">{notifications.length}</span> thông báo
              </span>
              <button
                type="button"
                onClick={() => {
                  fetchFull();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Tải lại
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}