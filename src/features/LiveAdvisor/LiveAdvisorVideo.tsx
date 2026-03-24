"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveAdvisor } from "./useLiveAdvisor.hook";
import { isLanHttpWithoutTls } from "./webrtc.media.utils";

export function LiveAdvisorVideo() {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const [showInsecureMediaWarning, setShowInsecureMediaWarning] =
    useState(false);

  const {
    signalingConnected,
    mySocketId,
    displayLabel,
    setDisplayLabel,
    commitDisplayLabel,
    remotePeers,
    incomingInvite,
    invitePeer,
    acceptIncomingInvite,
    declineIncomingInvite,
    joinPublicTestRoom,
    status,
    error,
    localStream,
    remoteStream,
    endCall,
  } = useLiveAdvisor();

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setShowInsecureMediaWarning(isLanHttpWithoutTls());
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;
    el.srcObject = localStream;
    void el.play().catch(() => {});
  }, [localStream]);

  useEffect(() => {
    const el = remoteVideoRef.current;
    if (!el) return;
    el.srcObject = remoteStream;
    void el.play().catch(() => {});
  }, [remoteStream]);

  const isLive =
    status === "awaiting-peer" ||
    status === "negotiating" ||
    status === "connected";
  const canEnd =
    status === "connecting" ||
    status === "awaiting-peer" ||
    status === "negotiating" ||
    status === "connected" ||
    status === "error";
  const inMediaSession = isLive || status === "connecting";

  return (
    <section className="flex h-full min-h-[320px] flex-col gap-4 rounded-2xl border border-zinc-200/80 bg-zinc-950 p-4 text-zinc-50 shadow-inner dark:border-zinc-800">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Live advisor
          </h2>
          <p className="text-lg font-semibold text-white">WebRTC session</p>
          <p className="mt-1 text-xs text-zinc-500">
            This tab registers on the signaling server. Pick another online
            device to call, or use the public test room on two clients.
          </p>
        </div>
        <p
          className={`text-xs font-medium ${signalingConnected ? "text-emerald-400" : "text-amber-300"}`}
        >
          Registry: {signalingConnected ? "connected" : "connecting…"}
        </p>
      </header>

      {showInsecureMediaWarning ? (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100">
          <span className="font-semibold text-amber-50">Camera and mic:</span>{" "}
          Safari on iPhone/iPad and many other browsers only allow them on{" "}
          <span className="font-mono text-amber-50">https://</span> or{" "}
          <span className="font-mono text-amber-50">http://localhost</span> — not
          on <span className="font-mono text-amber-50">http://</span> plus a LAN
          IP (privacy rule). Registry/calling can still work; for your own
          video/audio, use HTTPS (mkcert, Cloudflare Tunnel, ngrok) or{" "}
          <span className="font-mono text-amber-50">localhost</span> on the dev
          machine.
        </div>
      ) : null}

      {incomingInvite ? (
        <div className="flex flex-col gap-2 rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-3 text-sm text-sky-50">
          <p>
            <span className="font-semibold">{incomingInvite.fromLabel}</span> is
            calling you.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void acceptIncomingInvite()}
              disabled={inMediaSession}
              className="rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-semibold text-sky-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={declineIncomingInvite}
              className="rounded-lg border border-zinc-500 px-3 py-1.5 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
            >
              Decline
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Your device name
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={displayLabel}
            onChange={(e) => setDisplayLabel(e.target.value)}
            placeholder="e.g. Uday’s laptop"
            maxLength={48}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none sm:max-w-xs"
          />
          <button
            type="button"
            onClick={commitDisplayLabel}
            disabled={!signalingConnected}
            className="rounded-lg bg-zinc-700 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save name
          </button>
        </div>
        {mySocketId ? (
          <p className="mt-2 font-mono text-[11px] text-zinc-500">
            Session id: {mySocketId}
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Online devices
          </p>
          <button
            type="button"
            onClick={() => void joinPublicTestRoom()}
            disabled={!signalingConnected || inMediaSession}
            className="text-xs font-medium text-zinc-400 underline-offset-2 hover:text-white hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40"
          >
            Join public test room
          </button>
        </div>
        {remotePeers.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            No other browsers are registered yet. Open this page on another
            device (same signaling URL) or another tab with a different
            profile.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {remotePeers.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2"
              >
                <span className="text-sm font-medium text-zinc-100">
                  {p.label}
                </span>
                <button
                  type="button"
                  onClick={() => invitePeer(p.id)}
                  disabled={!signalingConnected || inMediaSession}
                  className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Call
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/10">
          <video
            ref={localVideoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
            autoPlay
          />
          <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
            You
          </span>
        </div>
        <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/10">
          <video
            ref={remoteVideoRef}
            className="h-full w-full object-cover"
            playsInline
            autoPlay
          />
          <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
            Remote
          </span>
          {!remoteStream && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/70 px-4 text-center text-sm text-zinc-400">
              {isLive
                ? "Waiting for remote video…"
                : "Call a device from the list or join the public test room."}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        Status:{" "}
        <span className="font-medium text-zinc-200 capitalize">{status}</span>
      </p>

      {error ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={endCall}
          disabled={!canEnd}
          className="inline-flex items-center justify-center rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          End call
        </button>
      </div>
    </section>
  );
}
