import type { PrimaryWorkspaceId } from "./primaryWorkspaceNavigation";
import { getPrimaryWorkspaceRoute } from "./primaryWorkspaceNavigation";

const primaryWorkspaceRoutes = new Set([
  "/workbench",
  "/search",
  "/media",
  "/sns",
  "/analytics",
  "/ai",
  "/graph",
]);

export interface ConversationInspectorTitleInput {
  hasConversation: boolean;
}

export interface ScopedWorkspaceRouteOptions {
  scope?: "currentChat" | "all";
  chat?: string;
  focus?: string;
  source?: string;
}

export function isPrimaryWorkspaceRoute(pathname: string): boolean {
  return primaryWorkspaceRoutes.has(pathname);
}

export function getConversationInspectorTitle(_input: ConversationInspectorTitleInput): string {
  return "会话详情";
}

export function isFullWorkspaceInspectorDestination(_destination: string): boolean {
  return false;
}

export function buildScopedWorkspaceRoute(
  destination: PrimaryWorkspaceId,
  options: ScopedWorkspaceRouteOptions = {},
): string {
  const params = new URLSearchParams();
  if (options.scope) params.set("scope", options.scope);
  if (options.chat) params.set("chat", options.chat);
  if (options.focus) params.set("focus", options.focus);
  if (options.source) params.set("source", options.source);

  const query = params.toString();
  return `${getPrimaryWorkspaceRoute(destination)}${query ? `?${query}` : ""}`;
}
