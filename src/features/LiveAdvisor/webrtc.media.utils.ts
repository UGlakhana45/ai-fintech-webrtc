const INSECURE_CONTEXT_MESSAGE =
  "Safari on iPhone/iPad and most mobile browsers only allow camera and microphone on HTTPS or on http://localhost — " +
  "not on plain http:// with a LAN or Wi-Fi IP. Use HTTPS for this site (e.g. mkcert, Cloudflare Tunnel, ngrok) " +
  "or open the app at http://localhost on the machine that runs the dev server.";

export function isLanHttpWithoutTls(): boolean {
  if (typeof window === "undefined") return false;
  return !window.isSecureContext;
}

export async function acquireCallMedia(): Promise<MediaStream> {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    throw new Error(INSECURE_CONTEXT_MESSAGE);
  }

  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    throw new Error(
      "This browser does not support camera or microphone access (getUserMedia).",
    );
  }

  const attempts: MediaStreamConstraints[] = [
    { video: true, audio: true },
    { video: true, audio: false },
    { video: false, audio: true },
  ];

  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      lastError = e;
    }
  }

  throw toFriendlyMediaError(lastError);
}

function toFriendlyMediaError(err: unknown): Error {
  if (err instanceof DOMException) {
    if (err.name === "SecurityError" || err.name === "NotSupportedError") {
      if (typeof window !== "undefined" && !window.isSecureContext) {
        return new Error(INSECURE_CONTEXT_MESSAGE);
      }
    }
    if (
      err.name === "NotFoundError" ||
      err.name === "DevicesNotFoundError"
    ) {
      return new Error(
        "No camera or microphone was found (or both are unavailable). " +
          "Allow access in system settings, close other apps using the camera, " +
          "or plug in a USB mic/webcam. On macOS: System Settings → Privacy & Security → Camera and Microphone.",
      );
    }
    if (
      err.name === "NotAllowedError" ||
      err.name === "PermissionDeniedError"
    ) {
      return new Error(
        "Permission was denied. Click the lock/camera icon in the address bar and allow camera and microphone for this site, then try Call again.",
      );
    }
    if (err.name === "NotReadableError" || err.name === "TrackStartError") {
      return new Error(
        "The camera or microphone is busy or cannot be opened. Quit Zoom, FaceTime, or other tabs using the device, then retry.",
      );
    }
    return new Error(err.message || "Could not open camera or microphone.");
  }
  if (err instanceof Error) {
    return err;
  }
  return new Error("Could not open camera or microphone.");
}
