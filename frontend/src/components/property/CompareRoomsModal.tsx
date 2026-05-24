import { useCompare } from "@/context/CompareContext";
import { X, CheckCircle2, XCircle, Eye, Zap, Droplets, Wifi, Maximize, Home, Users, GitCompareArrows, Trophy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useNavigate } from "react-router-dom";
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Tooltip, Legend 
} from "recharts";
import { formatCurrency } from "@/utils/format";

const COLORS = ["#6366f1", "#f43f5e", "#10b981", "#f59e0b"]; // Indigo, Rose, Emerald, Amber
const COLOR_LABELS = ["Tím", "Hồng", "Xanh lá", "Vàng"];

export default function CompareRoomsModal() {
  const { compareList, isCompareModalOpen, closeCompareModal, removeFromCompare } = useCompare();
  const navigate = useNavigate();

  if (!isCompareModalOpen || compareList.length === 0) return null;

  const mapRoomType = (type?: string) => {
    switch (type) {
      case "STUDIO": return "Studio";
      case "ONE_BEDROOM": return "1 Phòng ngủ";
      case "TWO_BEDROOM": return "2 Phòng ngủ";
      case "SINGLE_ROOM": return "Phòng Đơn";
      case "SHARED_ROOM": return "Phòng Ghép";
      case "MEZZANINE_ROOM": return "Gác Lửng";
      default: return "—";
    }
  };

  const maxPrice = Math.max(...compareList.map(r => r.price || 0));
  const minPrice = Math.min(...compareList.map(r => r.price || Infinity));
  const maxArea = Math.max(...compareList.map(r => r.area || 0));
  const maxOccupants = Math.max(...compareList.map(r => r.maxOccupants || 1));

  const radarData = [
    { subject: 'Giá tốt' },
    { subject: 'Diện tích' },
    { subject: 'Tiện ích' },
    { subject: 'Sức chứa' },
    { subject: 'DV miễn phí' },
    { subject: 'Phù hợp' }
  ];

  compareList.forEach((room) => {
    const rData = radarData as any;
    let priceScore = 10;
    if (maxPrice > minPrice) {
      priceScore = 10 - ((room.price - minPrice) / (maxPrice - minPrice)) * 5;
    }
    rData[0][`Phòng ${room.name}`] = priceScore;

    let areaScore = 5;
    if (maxArea > 0) areaScore = 5 + ((room.area / maxArea) * 5);
    rData[1][`Phòng ${room.name}`] = areaScore;

    let amenitiesCount = 0;
    try {
       const am = room.amenities ? (typeof room.amenities === 'string' ? JSON.parse(room.amenities) : room.amenities) : [];
       amenitiesCount = am.length;
    } catch {}
    rData[2][`Phòng ${room.name}`] = Math.min(10, 4 + amenitiesCount);

    rData[3][`Phòng ${room.name}`] = Math.min(10, 5 + ((room.maxOccupants || 1) / maxOccupants) * 5);

    let freeScore = 5;
    if (room.internetPrice === 0) freeScore += 2.5;
    if (room.waterPrice === 0) freeScore += 2.5;
    rData[4][`Phòng ${room.name}`] = freeScore;

    rData[5][`Phòng ${room.name}`] = room.matchScore ? Math.min(10, 5 + (room.matchScore / 20)) : 8;
  });

  const minPriceVal = Math.min(...compareList.map(r => r.price));
  const maxAreaVal = Math.max(...compareList.map(r => r.area));

  // Helper: Highlight best value
  const bestCell = (val: number, best: number) => val === best;

  // Table rows config
  const tableRows = [
    {
      icon: <span className="text-base">💰</span>,
      label: "Giá thuê",
      render: (room: typeof compareList[0]) => (
        <span className={`font-bold text-sm ${bestCell(room.price, minPriceVal) ? 'text-emerald-600' : 'text-gray-800'}`}>
          {formatCurrency(room.price)}
          {bestCell(room.price, minPriceVal) && <Trophy className="inline h-3.5 w-3.5 ml-1 text-amber-500" />}
        </span>
      ),
      highlightBest: (room: typeof compareList[0]) => bestCell(room.price, minPriceVal),
    },
    {
      icon: <Maximize className="h-4 w-4 text-blue-500" />,
      label: "Diện tích",
      render: (room: typeof compareList[0]) => (
        <span className={`font-semibold text-sm ${bestCell(room.area, maxAreaVal) ? 'text-blue-600' : 'text-gray-800'}`}>
          {room.area} m²
          {bestCell(room.area, maxAreaVal) && <Trophy className="inline h-3.5 w-3.5 ml-1 text-amber-500" />}
        </span>
      ),
      highlightBest: (room: typeof compareList[0]) => bestCell(room.area, maxAreaVal),
    },
    {
      icon: <Home className="h-4 w-4 text-violet-500" />,
      label: "Loại phòng",
      render: (room: typeof compareList[0]) => (
        <span className="text-sm text-gray-700">{mapRoomType(room.type)}</span>
      ),
    },
    {
      icon: <Users className="h-4 w-4 text-orange-500" />,
      label: "Sức chứa",
      render: (room: typeof compareList[0]) => (
        <span className="text-sm text-gray-700">{room.maxOccupants || '—'} người</span>
      ),
    },
    {
      icon: <span className="text-base">🏗️</span>,
      label: "Gác lửng",
      render: (room: typeof compareList[0]) => (
        room.hasMezzanine 
          ? <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" /> 
          : <XCircle className="h-5 w-5 text-gray-300 mx-auto" />
      ),
    },
    {
      icon: <span className="text-base">🌤️</span>,
      label: "Ban công",
      render: (room: typeof compareList[0]) => (
        room.hasBalcony 
          ? <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" /> 
          : <XCircle className="h-5 w-5 text-gray-300 mx-auto" />
      ),
    },
    {
      icon: <Zap className="h-4 w-4 text-yellow-500" />,
      label: "Tiền điện",
      render: (room: typeof compareList[0]) => (
        <span className="text-sm text-gray-700">
          {room.elecPrice !== undefined && room.elecPrice !== null ? `${formatCurrency(room.elecPrice)}/kWh` : '—'}
        </span>
      ),
    },
    {
      icon: <Droplets className="h-4 w-4 text-cyan-500" />,
      label: "Tiền nước",
      render: (room: typeof compareList[0]) => (
        <span className="text-sm text-gray-700">
          {room.waterPrice === 0 
            ? <span className="text-emerald-600 font-semibold">Miễn phí</span> 
            : room.waterPrice !== undefined && room.waterPrice !== null
              ? `${formatCurrency(room.waterPrice)}/m³` 
              : '—'}
        </span>
      ),
    },
    {
      icon: <Wifi className="h-4 w-4 text-indigo-500" />,
      label: "Internet",
      render: (room: typeof compareList[0]) => (
        <span className="text-sm text-gray-700">
          {room.internetPrice === 0 
            ? <span className="text-emerald-600 font-semibold">Miễn phí</span> 
            : room.internetPrice !== undefined && room.internetPrice !== null
              ? `${formatCurrency(room.internetPrice)}/tháng` 
              : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200" onClick={closeCompareModal}>
      <div 
        className="bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-gradient-to-r from-indigo-50/80 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <GitCompareArrows className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">So sánh phòng trọ</h2>
              <p className="text-xs text-gray-500">Đang so sánh {compareList.length} phòng</p>
            </div>
          </div>
          <button 
            type="button"
            className="p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition"
            onClick={closeCompareModal}
            aria-label="Đóng so sánh"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto">
          
          {/* ROOM CARDS ROW */}
          <div className="px-6 pt-5 pb-4">
            <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${compareList.length}, 1fr)` }}>
              {compareList.map((room, i) => {
                let images: string[] = [];
                try {
                  images = room.images ? (typeof room.images === 'string' ? JSON.parse(room.images) : room.images) : [];
                } catch {}
                const coverImage = images.length > 0 ? images[0] : null;

                return (
                  <div key={room.id} className="relative group">
                    <div className={`rounded-xl border-2 overflow-hidden transition-all`} style={{ borderColor: COLORS[i % COLORS.length] + '40' }}>
                      {/* Image */}
                      <div className="relative h-28 sm:h-36 bg-gray-100">
                        {coverImage ? (
                          <img src={coverImage} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Chưa có ảnh</div>
                        )}
                        {/* Color indicator */}
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-white text-[10px] font-bold shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        {/* Remove btn */}
                        <button 
                          type="button"
                          className="absolute top-2 right-2 p-1 bg-black/40 hover:bg-red-500 text-white rounded-full transition opacity-0 group-hover:opacity-100"
                          onClick={() => removeFromCompare(room.id)}
                          aria-label="Xóa khỏi so sánh"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      {/* Info */}
                      <div className="p-3">
                        <p className="font-bold text-sm text-gray-900 truncate">Phòng {room.name}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{room.propertyName || room.address || '—'}</p>
                        <p className="font-bold text-sm mt-1.5" style={{ color: COLORS[i % COLORS.length] }}>
                          {formatCurrency(room.price)}<span className="text-xs font-normal text-gray-400">/tháng</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COMPARISON TABLE */}
          <div className="px-6 pb-4">
            <div className="rounded-xl border overflow-hidden">
              {tableRows.map((row, rowIdx) => (
                <div key={rowIdx} className={`grid items-center ${rowIdx % 2 === 0 ? 'bg-muted/40/50' : 'bg-white'}`} style={{ gridTemplateColumns: `160px repeat(${compareList.length}, 1fr)` }}>
                  {/* Label */}
                  <div className="px-4 py-3 flex items-center gap-2.5 border-r border-gray-100">
                    {row.icon}
                    <span className="text-xs font-semibold text-gray-600">{row.label}</span>
                  </div>
                  {/* Values */}
                  {compareList.map((room, i) => (
                    <div 
                      key={room.id} 
                      className={`px-4 py-3 text-center border-r border-gray-100 last:border-r-0 ${row.highlightBest?.(room) ? 'bg-emerald-50/60' : ''}`}
                    >
                      {row.render(room)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* RADAR CHART */}
          <div className="px-6 pb-5">
            <div className="rounded-xl border bg-gradient-to-b from-slate-50 to-white p-5">
              <h3 className="font-bold text-sm text-gray-700 mb-1 flex items-center gap-2">
                <span className="text-base">📊</span> Biểu đồ tổng quan
              </h3>
              <p className="text-[11px] text-gray-400 mb-3">Điểm số chuẩn hóa trên thang 10. Giá rẻ hơn, diện tích rộng hơn = điểm cao hơn.</p>
              <div className="w-full h-[280px] sm:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="68%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: '1px solid #e2e8f0', 
                        boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
                        fontSize: '12px'
                      }} 
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} 
                      iconType="circle"
                      iconSize={8}
                    />
                    {compareList.map((room, i) => (
                      <Radar 
                        key={room.id}
                        name={`Phòng ${room.name}`} 
                        dataKey={`Phòng ${room.name}`} 
                        stroke={COLORS[i % COLORS.length]} 
                        fill={COLORS[i % COLORS.length]} 
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t bg-muted/40/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-gray-400">Nhấn vào "Xem chi tiết" để xem đầy đủ thông tin phòng.</p>
          <div className="flex gap-2">
            {compareList.map((room, i) => (
              <Button 
                key={room.id}
                size="sm" 
                variant="outline"
                className="text-xs h-9 gap-1.5 border-gray-200 hover:border-gray-300"
                onClick={() => {
                  closeCompareModal();
                  navigate(`/rooms/${room.id}`);
                }}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <Eye className="h-3 w-3" /> Phòng {room.name}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
