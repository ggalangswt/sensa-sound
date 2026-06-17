declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export function gtag(...args: unknown[]) {
  if (typeof window.gtag === 'function') {
    window.gtag(...args);
  }
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
  gtag('event', name, params);
}
