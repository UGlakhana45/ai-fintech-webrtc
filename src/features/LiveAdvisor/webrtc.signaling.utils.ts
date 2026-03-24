import { DEFAULT_SIGNALING_URL } from "./webrtc.types";

function envPointsToLoopback(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return true;
  }
}

function signalingPort(): string {
  return process.env.NEXT_PUBLIC_SIGNALING_PORT?.trim() || "3001";
}

export function resolveSignalingUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SIGNALING_URL?.trim() ?? "";

  if (typeof window === "undefined") {
    return envUrl || DEFAULT_SIGNALING_URL;
  }

  const { hostname, protocol } = window.location;
  const pageIsLoopback =
    hostname === "localhost" || hostname === "127.0.0.1";

  if (!pageIsLoopback && (!envUrl || envPointsToLoopback(envUrl))) {
    return `${protocol}//${hostname}:${signalingPort()}`;
  }

  return envUrl || DEFAULT_SIGNALING_URL;
}
