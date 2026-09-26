import { useEffect } from "react";
import { supabase } from "./cloud";
import { routeHref } from "./navigation";
type Counter = {
  no_onload?: boolean;
  count?: (args: { path: string; title: string }) => void;
};
declare global {
  interface Window {
    goatcounter?: Counter;
  }
}
export const analyticsCode = /^[a-z0-9][a-z0-9-]*$/.test(
  import.meta.env.VITE_GOATCOUNTER_CODE ?? "",
)
  ? (import.meta.env.VITE_GOATCOUNTER_CODE as string)
  : "";
let scriptPromise: Promise<void> | undefined;
function loadCounter(): Promise<void> {
  if (!scriptPromise)
    scriptPromise = new Promise((resolve, reject) => {
      window.goatcounter = { no_onload: true };
      const script = document.createElement("script");
      script.src = "https://gc.zgo.at/count.js";
      script.async = true;
      script.dataset.goatcounter = `https://${analyticsCode}.goatcounter.com/count`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Counter unavailable"));
      document.head.appendChild(script);
    });
  return scriptPromise;
}
export function useAnalytics(route: string, enabled: boolean) {
  useEffect(() => {
    if (
      !supabase ||
      !analyticsCode ||
      !enabled ||
      /^\/(admin|settings)/.test(route)
    )
      return;
    let active = true;
    void loadCounter()
      .then(() => {
        if (active)
          window.goatcounter?.count?.({
            path: routeHref(route),
            title: "Личен ритъм — дневник",
          });
      })
      .catch(() => {
        /* Reading never depends on analytics availability. */
      });
    return () => {
      active = false;
    };
  }, [route, enabled]);
}
