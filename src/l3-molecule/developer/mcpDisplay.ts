export function formatMcpRouteLabel(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`;
}

export function describeMcpForbiddenControls(controls: string[]): string {
  return controls.join(" · ");
}
