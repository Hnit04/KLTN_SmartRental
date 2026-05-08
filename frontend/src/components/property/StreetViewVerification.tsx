import { useState } from 'react';
import { MapPin, Eye, ExternalLink, ShieldCheck, ChevronLeft, ChevronRight, X, Maximize2, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface StreetViewVerificationProps {
  latitude: number;
  longitude: number;
  propertyAddress: string;
}

export default function StreetViewVerification({
  latitude,
  longitude,
  propertyAddress,
}: StreetViewVerificationProps) {
  const [showStreetView, setShowStreetView] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [streetViewLoaded, setStreetViewLoaded] = useState(false);
  const [streetViewError, setStreetViewError] = useState(false);

  // Google Maps Street View embed URL — hoàn toàn miễn phí, không cần API Key
  const streetViewEmbedUrl = `https://maps.google.com/maps?q=&layer=c&cbll=${latitude},${longitude}&cbp=11,0,0,0,0&output=svembed`;

  // Fallback: Google Maps link mở trực tiếp (luôn hoạt động)
  const googleMapsUrl = `https://www.google.com/maps/@${latitude},${longitude},3a,75y,90t/data=!3m6!1e1!3m4!1s!2e0!7i16384!8i8192`;
  
  // Google Maps normal view link
  const googleMapsNormalUrl = `https://www.google.com/maps/@${latitude},${longitude},18z`;

  if (!latitude || !longitude) return null;

  return (
    <div className="mt-8">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-200">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-lg">Xác minh vị trí thực tế</h3>
          <p className="text-xs text-gray-500">So sánh ảnh Google Maps với ảnh chủ trọ cung cấp</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-3.5 mb-5 flex items-start gap-3">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>Mẹo:</strong> Xem ảnh đường phố từ Google Maps bên dưới, sau đó đối chiếu với ảnh do chủ trọ đăng. 
          Nếu mặt tiền hoặc khu vực xung quanh khác biệt lớn, hãy cân nhắc liên hệ chủ trọ để xác nhận.
        </p>
      </div>

      {/* === STREET VIEW SECTION === */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm mb-5">
        {/* Street View Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm font-semibold text-gray-700 ml-2">🗺️ Google Street View</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400 font-mono">
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </span>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 transition-colors"
            >
              <ExternalLink className="h-3 w-3" /> Mở Google Maps
            </a>
          </div>
        </div>

        {/* Street View Content */}
        {!showStreetView ? (
          // Trigger Button - Lazy load to save bandwidth
          <div className="relative h-[300px] bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 flex flex-col items-center justify-center text-white cursor-pointer group"
               onClick={() => setShowStreetView(true)}>
            {/* Decorative grid lines */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }} />
            
            {/* Globe icon */}
            <div className="relative z-10 mb-4">
              <div className="w-20 h-20 rounded-full border-2 border-white/20 flex items-center justify-center bg-white/5 backdrop-blur-sm group-hover:bg-white/10 transition-all group-hover:scale-110 duration-300">
                <svg className="w-10 h-10 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" strokeDasharray="4 2"/>
                  <path d="M12 2a10 10 0 0 1 0 20M12 2a10 10 0 0 0 0 20M2 12h20"/>
                </svg>
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Eye className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            
            <p className="text-base font-bold relative z-10">Nhấn để xem Street View</p>
            <p className="text-xs text-white/50 mt-1 relative z-10 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {propertyAddress}
            </p>
            
            {/* Pulse ring */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-24 h-24 rounded-full border border-cyan-400/30 animate-ping" style={{ animationDuration: '3s' }} />
            </div>
          </div>
        ) : (
          // Iframe Street View
          <div className="relative">
            {!streetViewLoaded && !streetViewError && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900">
                <div className="relative">
                  <div className="w-12 h-12 border-3 border-cyan-400/30 rounded-full animate-spin border-t-cyan-400" />
                </div>
                <p className="text-cyan-300 text-sm mt-3 font-medium">Đang tải Street View...</p>
              </div>
            )}
            
            {streetViewError ? (
              <div className="h-[350px] flex flex-col items-center justify-center bg-gray-50 text-gray-500">
                <MapPin className="h-10 w-10 text-gray-300 mb-3" />
                <p className="font-medium text-gray-700">Khu vực này chưa có ảnh Google Street View</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">Bạn vẫn có thể mở Google Maps để kiểm tra</p>
                <a
                  href={googleMapsNormalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium bg-blue-50 px-4 py-2 rounded-lg transition-colors"
                >
                  <ExternalLink className="h-4 w-4" /> Mở trên Google Maps
                </a>
              </div>
            ) : (
              <iframe
                src={streetViewEmbedUrl}
                width="100%"
                height="350"
                style={{ border: 0 }}
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; xr-spatial-tracking"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                onLoad={() => setStreetViewLoaded(true)}
                onError={() => setStreetViewError(true)}
                className="w-full"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
