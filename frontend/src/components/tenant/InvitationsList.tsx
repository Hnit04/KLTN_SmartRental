import { useState, useEffect } from "react";
import { residentRequestApi } from "@/api/residentRequestApi";
import type { ResidentRequestResponse } from "@/types/index";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { Check, X, Clock, Home, User } from "lucide-react";

interface InvitationsListProps {
  onStatusChange?: () => void;
}

export default function InvitationsList({ onStatusChange }: InvitationsListProps) {
  const [invitations, setInvitations] = useState<ResidentRequestResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchInvitations = async () => {
    try {
      const res = await residentRequestApi.getMyInvitations();
      const data = (res as any)?.data || res;
      setInvitations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching invitations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();

    // ── Lắng nghe sự kiện refresh từ WebSocket (qua NotificationBell)
    const handleRefresh = (e: any) => {
       console.log("🔄 [Realtime] RECEIVED EVENT in InvitationsList:", e.detail);
       // Nếu là CONTRACT_UPDATE thì load lại danh sách lời mời
       if (e.detail?.type === 'CONTRACT_UPDATE') {
         fetchInvitations();
       }
    };

    window.addEventListener('app:refresh-data', handleRefresh);
    return () => window.removeEventListener('app:refresh-data', handleRefresh);
  }, []);

  const handleUpdateStatus = async (id: number, status: 'ACCEPTED' | 'REJECTED') => {
    setProcessingId(id);
    try {
      await residentRequestApi.updateStatus(id, status);
      const invite = invitations.find(i => i.id === id);
      const isRemove = invite?.type === 'REMOVE';
      
      if (status === 'ACCEPTED') {
        toast.success(isRemove ? "Đã xác nhận rời khỏi phòng!" : "Đã chấp nhận lời mời vào ở!");
      } else {
        toast.success(isRemove ? "Đã từ chối yêu cầu rời phòng." : "Đã từ chối lời mời.");
      }
      fetchInvitations();
      if (onStatusChange) onStatusChange();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi xử lý lời mời");
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) return null;
  if (invitations.length === 0) return null;

  return (
    <div className="space-y-4 mb-8">
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
        <Clock className="h-4 w-4" /> Yêu cầu thành viên ({invitations.length})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {invitations.map((invite) => (
          <div key={invite.id} className="bg-gradient-to-br from-primary/5 to-blue-50/50 border-2 border-primary/10 rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4">
                <div className="h-12 w-12 rounded-full bg-white border shadow-sm flex items-center justify-center shrink-0">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900">
                      {invite.requesterName} {invite.type === 'REMOVE' ? 'yêu cầu bạn rời khỏi phòng' : 'mời bạn vào ở cùng'}
                    </p>
                    {/* <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase border ${
                      invite.type === 'REMOVE' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {invite.type === 'REMOVE' ? 'Rời phòng' : 'Vào ở'}
                    </span> */}
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Home className="h-3 w-3" /> Hợp đồng #{invite.contractId}
                  </p>
                  {invite.message && (
                     <p className="text-sm text-gray-600 mt-3 p-3 bg-white/50 rounded-xl italic border border-gray-100">
                        "{invite.message}"
                     </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button 
                className={`flex-1 h-10 rounded-xl gap-2 ${
                  invite.type === 'REMOVE' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary hover:bg-primary/90'
                }`}
                onClick={() => handleUpdateStatus(invite.id, 'ACCEPTED')}
                disabled={processingId === invite.id}
                isLoading={processingId === invite.id}
              >
                <Check className="h-4 w-4" /> {invite.type === 'REMOVE' ? 'Xác nhận rời đi' : 'Chấp nhận'}
              </Button>
              <Button 
                variant="outline"
                className="flex-1 border-gray-200 text-gray-600 hover:bg-gray-50 h-10 rounded-xl gap-2"
                onClick={() => handleUpdateStatus(invite.id, 'REJECTED')}
                disabled={processingId === invite.id}
              >
                <X className="h-4 w-4" /> {invite.type === 'REMOVE' ? 'Ở lại' : 'Từ chối'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
