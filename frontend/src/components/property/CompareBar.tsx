import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { X, GitCompareArrows, Plus } from "lucide-react";
import { useCompare } from "@/context/CompareContext";
import { useMobileLayer } from "@/context/MobileLayerContext";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

const PILL_TONES = [
  { border: "border-primary/35", bg: "bg-primary/10" },
  { border: "border-trust/35", bg: "bg-trust/10" },
  { border: "border-success/35", bg: "bg-success/10" },
  { border: "border-warning/35", bg: "bg-warning/10" },
] as const;

export default function CompareBar() {
  const location = useLocation();
  const { compareList, removeFromCompare, clearCompare, openCompareModal } = useCompare();
  const { registerLayer, unregisterLayer, getBottomOffset, getZIndex } = useMobileLayer();

  const isAppShell =
    /^\/(landlord|tenant|admin)(\/|$)/.test(location.pathname) ||
    location.pathname.startsWith("/profile");
  const mobileBottomOffset = getBottomOffset("compareBar");

  useEffect(() => {
    registerLayer("compareBar", {
      active: compareList.length > 0,
      height: 88,
      zIndex: 60,
      priority: 80,
    });

    return () => unregisterLayer("compareBar");
  }, [compareList.length, registerLayer, unregisterLayer]);

  if (compareList.length === 0) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed left-0 right-0 flex justify-center p-3 animate-in slide-in-from-bottom-4 duration-page sm:p-4 md:bottom-0"
      )}
      style={{
        bottom: `${isAppShell ? mobileBottomOffset : 0}px`,
        zIndex: getZIndex("compareBar"),
      }}
    >
      <div className="pointer-events-auto flex w-full max-w-3xl items-center gap-3 rounded-2xl border border-border/80 bg-card/95 p-3 shadow-card backdrop-blur-xl sm:gap-4 sm:p-4">
        <div className="flex flex-1 gap-2 overflow-x-auto scrollbar-hide">
          {compareList.map((room, i) => {
            let images: string[] = [];
            try {
              images = room.images
                ? typeof room.images === "string"
                  ? JSON.parse(room.images)
                  : room.images
                : [];
            } catch {
              images = [];
            }

            const coverImage = images.length > 0 ? images[0] : null;
            const tone = PILL_TONES[i % PILL_TONES.length];

            return (
              <div
                key={room.id}
                className={cn(
                  "relative flex min-w-[140px] max-w-[180px] shrink-0 items-center gap-2 rounded-xl border px-2.5 py-2 transition-all duration-hover hover:shadow-soft",
                  tone.border,
                  tone.bg
                )}
              >
                {coverImage ? (
                  <img src={coverImage} className="h-9 w-9 shrink-0 rounded-lg object-cover" alt="" />
                ) : (
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-muted" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-foreground">Phong {room.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {room.price?.toLocaleString("vi-VN")}d
                  </p>
                </div>

                <button
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-muted p-0.5 text-muted-foreground shadow-soft transition-colors duration-hover hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeFromCompare(room.id)}
                  aria-label="Xoa khoi so sanh"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}

          {Array.from({ length: Math.max(0, 2 - compareList.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex min-w-[100px] shrink-0 items-center justify-center rounded-xl border border-dashed border-border px-3 py-2"
            >
              <Plus className="mr-1 h-3 w-3 text-muted-foreground/60" />
              <span className="text-[10px] font-medium text-muted-foreground">Them phong</span>
            </div>
          ))}
        </div>

        <div className="hidden h-8 w-px shrink-0 bg-border sm:block" />

        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 text-xs text-muted-foreground transition-colors duration-hover hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            onClick={clearCompare}
          >
            <X className="mr-1 h-3.5 w-3.5" /> Xoa
          </Button>
          <Button
            size="sm"
            className="h-9 gap-1.5 px-4 text-xs shadow-md shadow-primary/20 transition-colors duration-hover"
            onClick={openCompareModal}
            disabled={compareList.length < 2}
          >
            <GitCompareArrows className="h-3.5 w-3.5" />
            So sanh ({compareList.length})
          </Button>
        </div>
      </div>
    </div>
  );
}
