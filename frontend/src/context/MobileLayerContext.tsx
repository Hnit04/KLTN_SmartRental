import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type MobileLayerId =
  | "bottomNav"
  | "stickyCta"
  | "compareBar"
  | "aiChat"
  | "toasts";

type LayerConfig = {
  active: boolean;
  height: number;
  priority: number;
  zIndex: number;
};

type MobileLayerContextType = {
  registerLayer: (id: MobileLayerId, config: Partial<LayerConfig>) => void;
  unregisterLayer: (id: MobileLayerId) => void;
  getBottomOffset: (id: MobileLayerId) => number;
  getZIndex: (id: MobileLayerId) => number;
};

const DEFAULT_LAYER_CONFIG: Record<MobileLayerId, LayerConfig> = {
  bottomNav: { active: false, height: 64, priority: 100, zIndex: 50 },
  stickyCta: { active: false, height: 64, priority: 90, zIndex: 65 },
  compareBar: { active: false, height: 88, priority: 80, zIndex: 60 },
  aiChat: { active: false, height: 56, priority: 70, zIndex: 55 },
  toasts: { active: true, height: 0, priority: 10, zIndex: 100 },
};

const MobileLayerContext = createContext<MobileLayerContextType | undefined>(undefined);

export function MobileLayerProvider({ children }: { children: ReactNode }) {
  const [layers, setLayers] = useState<Record<MobileLayerId, LayerConfig>>(DEFAULT_LAYER_CONFIG);

  const registerLayer = useCallback((id: MobileLayerId, config: Partial<LayerConfig>) => {
    setLayers((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...config,
      },
    }));
  }, []);

  const unregisterLayer = useCallback((id: MobileLayerId) => {
    setLayers((prev) => ({
      ...prev,
      [id]: {
        ...DEFAULT_LAYER_CONFIG[id],
        active: false,
      },
    }));
  }, []);

  const getBottomOffset = useCallback(
    (id: MobileLayerId) => {
      const current = layers[id];
      if (!current) return 0;
      return Object.entries(layers).reduce((acc, [layerId, cfg]) => {
        if (layerId === id) return acc;
        if (!cfg.active) return acc;
        if (cfg.priority > current.priority) return acc + cfg.height;
        return acc;
      }, 0);
    },
    [layers]
  );

  const getZIndex = useCallback(
    (id: MobileLayerId) => layers[id]?.zIndex ?? DEFAULT_LAYER_CONFIG[id].zIndex,
    [layers]
  );

  const value = useMemo(
    () => ({
      registerLayer,
      unregisterLayer,
      getBottomOffset,
      getZIndex,
    }),
    [registerLayer, unregisterLayer, getBottomOffset, getZIndex]
  );

  return <MobileLayerContext.Provider value={value}>{children}</MobileLayerContext.Provider>;
}

export function useMobileLayer() {
  const ctx = useContext(MobileLayerContext);
  if (!ctx) {
    throw new Error("useMobileLayer must be used inside MobileLayerProvider");
  }
  return ctx;
}

