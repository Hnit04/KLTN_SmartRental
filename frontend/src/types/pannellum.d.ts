declare module 'pannellum' {
  interface PannellumViewerConfig {
    type?: string;
    panorama?: string;
    autoLoad?: boolean;
    autoRotate?: number;
    compass?: boolean;
    showZoomCtrl?: boolean;
    showFullscreenCtrl?: boolean;
    mouseZoom?: boolean;
    hfov?: number;
    minHfov?: number;
    maxHfov?: number;
    pitch?: number;
    yaw?: number;
    [key: string]: any;
  }

  interface PannellumViewer {
    on(event: string, callback: () => void): void;
    destroy(): void;
    getYaw(): number;
    getPitch(): number;
    getHfov(): number;
    setYaw(yaw: number): void;
    setPitch(pitch: number): void;
    setHfov(hfov: number): void;
    loadScene(sceneId: string): void;
  }

  export function viewer(
    container: HTMLElement,
    config: PannellumViewerConfig
  ): PannellumViewer;
}
