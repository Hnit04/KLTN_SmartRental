import { useEffect, useRef, useState } from 'react';
import 'pannellum/build/pannellum.css';

interface Room360ViewerProps {
  images: string[];
  height?: string;
}

export default function Room360Viewer({ images, height = '420px' }: Room360ViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerInstanceRef = useRef<any>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!viewerRef.current || images.length === 0) return;

    // Cleanup previous instance
    if (viewerInstanceRef.current) {
      try { viewerInstanceRef.current.destroy(); } catch (_) {}
      viewerInstanceRef.current = null;
    }

    setIsLoading(true);

    // Pannellum is a UMD lib that attaches to window.pannellum
    import('pannellum').then(() => {
      if (!viewerRef.current) return;
      
      const pnlm = (window as any).pannellum;
      if (!pnlm || typeof pnlm.viewer !== 'function') {
        console.error('Pannellum not loaded correctly');
        setIsLoading(false);
        return;
      }

      viewerInstanceRef.current = pnlm.viewer(viewerRef.current, {
        type: 'equirectangular',
        panorama: images[activeIndex],
        autoLoad: true,
        autoRotate: -2,
        compass: false,
        showZoomCtrl: true,
        showFullscreenCtrl: false,
        mouseZoom: true,
        hfov: 110,
        minHfov: 50,
        maxHfov: 120,
        pitch: 0,
        yaw: 0,
      });

      viewerInstanceRef.current.on('load', () => {
        setIsLoading(false);
      });

      viewerInstanceRef.current.on('error', () => {
        setIsLoading(false);
      });
    });

    return () => {
      if (viewerInstanceRef.current) {
        try { viewerInstanceRef.current.destroy(); } catch (_) {}
        viewerInstanceRef.current = null;
      }
    };
  }, [activeIndex, images]);

  const handleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      
      // Force Pannellum to resize its canvas after a short delay to allow DOM to update
      if (viewerInstanceRef.current) {
        setTimeout(() => {
          try {
            viewerInstanceRef.current.resize();
          } catch (e) {}
        }, 100);
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!images || images.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      className={`relative group flex flex-col ${isFullscreen ? 'bg-black z-[100]' : ''}`} 
      style={{ 
        minHeight: isFullscreen ? '100vh' : height,
        height: isFullscreen ? '100vh' : 'auto'
      }}
    >
      {/* Header label */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <span className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-sm">
          <svg className="w-3.5 h-3.5 animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeDasharray="4 2"/>
            <path d="M12 2a10 10 0 0 1 0 20M12 2a10 10 0 0 0 0 20M2 12h20"/>
          </svg>
          Xem 360°
        </span>
      </div>

      {/* Fullscreen button */}
      <button 
        onClick={handleFullscreen}
        className="absolute top-3 right-3 z-20 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
        title={isFullscreen ? "Thoát toàn màn hình" : "Xem toàn màn hình"}
      >
        {isFullscreen ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
          </svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
        )}
      </button>

      {/* Loading indicator */}
      {isLoading && (
        <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 ${isFullscreen ? '' : 'rounded-xl'}`}>
          <div className="relative">
            <div className="w-12 h-12 border-3 border-cyan-400/30 rounded-full animate-spin border-t-cyan-400"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeDasharray="4 2"/>
                <path d="M12 2a10 10 0 0 1 0 20M12 2a10 10 0 0 0 0 20M2 12h20"/>
              </svg>
            </div>
          </div>
          <p className="text-cyan-300 text-sm mt-3 font-medium">Đang tải ảnh 360°...</p>
        </div>
      )}

      {/* Pannellum viewer container */}
      <div 
        ref={viewerRef} 
        style={{ width: '100%', height: isFullscreen ? '100%' : height, flex: 1 }} 
        className={`overflow-hidden bg-slate-900 ${isFullscreen ? 'rounded-none' : 'rounded-xl'}`}
      />

      {/* Drag hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <span className="bg-black/60 text-white/80 text-[11px] px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l3 3 3-3M19 9l3 3-3 3"/>
          </svg>
          Kéo để xoay • Cuộn để zoom
        </span>
      </div>

      {/* Thumbnail selector (if multiple panoramas) */}
      {images.length > 1 && (
        <div className={`flex gap-2 mt-3 px-1 ${isFullscreen ? 'absolute bottom-4 left-1/2 -translate-x-1/2 mt-0 z-30' : ''}`}>
          {images.map((url, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                i === activeIndex 
                  ? 'border-cyan-500 ring-2 ring-cyan-500/30 scale-105' 
                  : 'border-gray-200 hover:border-gray-400 opacity-70 hover:opacity-100'
              }`}
            >
              <img src={url} alt={`Ảnh 360 #${i + 1}`} className="w-full h-full object-cover" />
              {i === activeIndex && (
                <div className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-500/50"></div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
