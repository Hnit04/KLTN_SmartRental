type AnalyticsPayload = Record<string, unknown>;

declare global {
  interface WindowEventMap {
    "app:analytics": CustomEvent<{ event: string; payload?: AnalyticsPayload }>;
  }
}

/**
 * Lightweight analytics dispatcher.
 * Keeps backward compatibility when no analytics SDK is installed yet.
 */
export function trackEvent(event: string, payload?: AnalyticsPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("app:analytics", { detail: { event, payload } }));

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", event, payload || {});
  }
}

