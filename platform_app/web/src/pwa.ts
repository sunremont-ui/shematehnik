export function registerPwa(): void {
  if (import.meta.env.DEV || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    const swUrl = new URL("sw.js", document.baseURI);
    navigator.serviceWorker.register(swUrl).catch((err) => {
      console.warn("Service worker registration failed", err);
    });
  });
}
