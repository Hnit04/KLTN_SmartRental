import { useLocation } from "react-router-dom";
import { useCompare } from "@/context/CompareContext";
import { Button } from "@/components/ui/Button";
import { X, GitCompareArrows, Plus } from "lucide-react";
import { cn } from "@/utils/cn";

export default function CompareBar() {
  const location = useLocation();
  const { compareList, removeFromCompare, clearCompare, openCompareModal } = useCompare();
  const isAppShell =
    /^\/(landlord|tenant|admin)(\/|$)/.test(location.pathname) ||
    location.pathname.startsWith("/profile");

  if (compareList.length === 0) return null;

  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-50 flex justify-center p-3 animate-in slide-in-from-bottom-4 duration-300 pointer-events-none sm:p-4",
        isAppShell ? "bottom-16 md:bottom-0" : "bottom-0"
      )}
    >
      <div className="bg-white/98 backdrop-blur-xl border border-gray-200/80 shadow-[0_-4px_30px_rgba(0,0,0,0.12)] rounded-2xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4 pointer-events-auto w-full max-w-3xl">
        
        {/* Room pills */}
        <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide">
          {compareList.map((room, i) => {
            let images: string[] = [];
            try {
              images = room.images ? (typeof room.images === 'string' ? JSON.parse(room.images) : room.images) : [];
            } catch {}
            const coverImage = images.length > 0 ? images[0] : null;
            const colors = ["#6366f1", "#f43f5e", "#10b981", "#f59e0b"];

            return (
              <div 
                key={room.id} 
                className="relative flex items-center gap-2 rounded-xl px-2.5 py-2 min-w-[140px] max-w-[180px] border transition-all hover:shadow-sm shrink-0"
                style={{ borderColor: colors[i % colors.length] + '40', backgroundColor: colors[i % colors.length] + '08' }}
              >
                {coverImage ? (
                  <img src={coverImage} className="h-9 w-9 rounded-lg object-cover shrink-0" alt="" />
                ) : (
                  <div className="h-9 w-9 rounded-lg bg-gray-100 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">Phòng {room.name}</p>
                  <p className="text-[10px] text-gray-500 truncate">{room.price?.toLocaleString('vi-VN')}đ</p>
                </div>
                <button 
                  className="absolute -top-1.5 -right-1.5 bg-gray-100 hover:bg-red-500 text-gray-400 hover:text-white rounded-full p-0.5 transition-colors shadow-sm"
                  onClick={() => removeFromCompare(room.id)}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}

          {/* Empty slots */}
          {Array.from({ length: Math.max(0, 2 - compareList.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="flex items-center justify-center border border-dashed border-gray-200 rounded-xl px-3 py-2 min-w-[100px] shrink-0">
              <Plus className="h-3 w-3 text-gray-300 mr-1" />
              <span className="text-[10px] text-gray-400 font-medium">Thêm phòng</span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-200 hidden sm:block shrink-0" />

        {/* Actions */}
        <div className="flex gap-2 shrink-0">
          <Button 
            variant="outline" 
            size="sm"
            className="h-9 text-xs text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-red-500 hover:border-red-200 px-3"
            onClick={clearCompare}
          >
            <X className="h-3.5 w-3.5 mr-1" /> Xóa
          </Button>
          <Button 
            size="sm"
            className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 px-4 gap-1.5"
            onClick={openCompareModal}
            disabled={compareList.length < 2}
          >
            <GitCompareArrows className="h-3.5 w-3.5" />
            So sánh ({compareList.length})
          </Button>
        </div>
      </div>
    </div>
  );
}
