import type { BrowserRouterProps } from "react-router-dom";

export const APP_BROWSER_ROUTER_FUTURE = Object.freeze({
  v7_startTransition: true,
  v7_relativeSplatPath: true,
}) satisfies NonNullable<BrowserRouterProps["future"]>;
