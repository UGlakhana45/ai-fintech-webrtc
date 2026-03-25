"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { acquireCallMedia } from "./webrtc.media.utils";
import {
  mixedContentHelpMessage,
  resolveSignalingUrl,
} from "./webrtc.signaling.utils";
import {
  DEFAULT_ADVISOR_ROOM_ID,
  type CallInvitePayload,
  type IceCandidatePayload,
  type RegisteredPeer,
  type RtcSessionPayload,
  type SessionDescriptionPayload,
  type UseLiveAdvisorResult,
  type WebRTCConnectionStatus,
} from "./webrtc.types";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function connectErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Signaling connection failed";
}

export function useLiveAdvisor(): UseLiveAdvisorResult {
  const [signalingConnected, setSignalingConnected] = useState(false);
  const [signalingTargetUrl, setSignalingTargetUrl] = useState("");
  const [signalingLastError, setSignalingLastError] = useState<string | null>(
    null,
  );
  const [mySocketId, setMySocketId] = useState<string | null>(null);
  const [allPeers, setAllPeers] = useState<RegisteredPeer[]>([]);
  const [displayLabel, setDisplayLabel] = useState("");
  const [incomingInvite, setIncomingInvite] = useState<CallInvitePayload | null>(
    null,
  );

  const [status, setStatus] = useState<WebRTCConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const roomIdRef = useRef<string>(DEFAULT_ADVISOR_ROOM_ID);
  const mediaSessionActiveRef = useRef(false);
  const labelRef = useRef("");

  useEffect(() => {
    labelRef.current = displayLabel;
  }, [displayLabel]);

  const remotePeers = useMemo(
    () => allPeers.filter((p) => p.id !== mySocketId),
    [allPeers, mySocketId],
  );

  const detachRtcSocketListeners = useCallback((socket: Socket) => {
    socket.off("offer");
    socket.off("answer");
    socket.off("ice-candidate");
    socket.off("signaling:you-are-offerer");
    socket.off("signaling:you-are-answerer");
  }, []);

  const teardownMedia = useCallback(() => {
    mediaSessionActiveRef.current = false;
    const roomId = roomIdRef.current;
    const s = socketRef.current;
    if (s) {
      s.emit("leave-room", roomId);
      detachRtcSocketListeners(s);
    }

    const pc = pcRef.current;
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.close();
      pcRef.current = null;
    }

    setLocalStream((prev) => {
      prev?.getTracks().forEach((t) => t.stop());
      return null;
    });
    setRemoteStream((prev) => {
      prev?.getTracks().forEach((t) => t.stop());
      return null;
    });
  }, [detachRtcSocketListeners]);

  const endCall = useCallback(() => {
    teardownMedia();
    setIncomingInvite(null);
    setStatus("ended");
  }, [teardownMedia]);

  const beginMediaRef = useRef<(roomId: string) => Promise<void>>(async () => {});

  const beginMedia = useCallback(
    async (roomId: string) => {
      if (typeof window === "undefined") return;
      if (pcRef.current || mediaSessionActiveRef.current) return;

      const socket = socketRef.current;
      if (!socket?.connected) {
        setError(
          "Not connected to signaling. Wait until the registry shows as connected.",
        );
        setStatus("error");
        return;
      }

      mediaSessionActiveRef.current = true;
      setError(null);
      setStatus("connecting");
      roomIdRef.current = roomId.trim();

      const activeRoomId = roomIdRef.current;

      try {
        const stream = await acquireCallMedia();
        if (!mediaSessionActiveRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setLocalStream(stream);

        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        pc.ontrack = (event) => {
          const [incoming] = event.streams;
          if (incoming) {
            setRemoteStream(incoming);
            setStatus("connected");
          }
        };

        pc.onicecandidate = (event) => {
          if (!event.candidate || !socketRef.current) return;
          socketRef.current.emit("ice-candidate", {
            roomId: activeRoomId,
            candidate: event.candidate.toJSON(),
          } satisfies IceCandidatePayload);
        };

        const emitIce = (payload: IceCandidatePayload) => {
          const candidatePc = pcRef.current;
          if (
            !candidatePc ||
            payload.roomId !== activeRoomId ||
            !payload.candidate
          ) {
            return;
          }
          void candidatePc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        };

        const handleOffer = async (payload: SessionDescriptionPayload) => {
          const answerPc = pcRef.current;
          const answerSocket = socketRef.current;
          if (!answerPc || !answerSocket || payload.roomId !== activeRoomId) {
            return;
          }
          try {
            setStatus("negotiating");
            await answerPc.setRemoteDescription(
              new RTCSessionDescription({
                type: payload.type,
                sdp: payload.sdp,
              }),
            );
            const answer = await answerPc.createAnswer();
            await answerPc.setLocalDescription(answer);
            answerSocket.emit("answer", {
              roomId: activeRoomId,
              type: answer.type,
              sdp: answer.sdp ?? "",
            } satisfies SessionDescriptionPayload);
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Failed to handle offer";
            setError(message);
            setStatus("error");
          }
        };

        const handleAnswer = async (payload: SessionDescriptionPayload) => {
          const answerPc = pcRef.current;
          if (!answerPc || payload.roomId !== activeRoomId) return;
          try {
            await answerPc.setRemoteDescription(
              new RTCSessionDescription({
                type: payload.type,
                sdp: payload.sdp,
              }),
            );
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Failed to handle answer";
            setError(message);
            setStatus("error");
          }
        };

        const createAndSendOffer = async () => {
          const offerPc = pcRef.current;
          const offerSocket = socketRef.current;
          if (!offerPc || !offerSocket) return;
          try {
            setStatus("negotiating");
            const offer = await offerPc.createOffer();
            await offerPc.setLocalDescription(offer);
            offerSocket.emit("offer", {
              roomId: activeRoomId,
              type: offer.type,
              sdp: offer.sdp ?? "",
            } satisfies SessionDescriptionPayload);
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Failed to create offer";
            setError(message);
            setStatus("error");
          }
        };

        socket.on("offer", handleOffer);
        socket.on("answer", handleAnswer);
        socket.on("ice-candidate", emitIce);
        socket.on("signaling:you-are-offerer", () => {
          void createAndSendOffer();
        });
        socket.on("signaling:you-are-answerer", () => {
          setStatus("awaiting-peer");
        });

        const join = () => {
          socket.emit("join-room", activeRoomId);
          setStatus("awaiting-peer");
        };

        if (socket.connected) {
          join();
        } else {
          socket.once("connect", join);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Could not start media or call. Check camera/microphone and site permissions.";
        setError(message);
        setStatus("error");
        mediaSessionActiveRef.current = false;
        setLocalStream((prev) => {
          prev?.getTracks().forEach((t) => t.stop());
          return null;
        });
        const s = socketRef.current;
        if (s) {
          detachRtcSocketListeners(s);
        }
        const failedPc = pcRef.current;
        if (failedPc) {
          failedPc.close();
          pcRef.current = null;
        }
      }
    },
    [detachRtcSocketListeners],
  );

  const teardownMediaRef = useRef(teardownMedia);
  const detachRtcRef = useRef(detachRtcSocketListeners);

  useEffect(() => {
    beginMediaRef.current = beginMedia;
    teardownMediaRef.current = teardownMedia;
    detachRtcRef.current = detachRtcSocketListeners;
  }, [beginMedia, teardownMedia, detachRtcSocketListeners]);

  const commitDisplayLabel = useCallback(() => {
    const trimmed = labelRef.current.trim();
    socketRef.current?.emit("register", {
      label: trimmed.length > 0 ? trimmed : undefined,
    });
  }, []);

  const invitePeer = useCallback((targetSocketId: string) => {
    setError(null);
    if (!socketRef.current?.connected) {
      setError("Signaling is offline.");
      return;
    }
    if (pcRef.current || mediaSessionActiveRef.current) {
      setError("End the current session before calling someone else.");
      return;
    }
    socketRef.current.emit("call-peer", targetSocketId);
  }, []);

  const acceptIncomingInvite = useCallback(() => {
    if (!incomingInvite) return;
    const { roomId } = incomingInvite;
    setIncomingInvite(null);
    void beginMediaRef.current(roomId);
  }, [incomingInvite]);

  const declineIncomingInvite = useCallback(() => {
    setIncomingInvite(null);
  }, []);

  const joinPublicTestRoom = useCallback(async () => {
    setError(null);
    if (!socketRef.current?.connected) {
      setError("Signaling is offline.");
      return;
    }
    if (pcRef.current || mediaSessionActiveRef.current) {
      setError("End the current session first.");
      return;
    }
    await beginMediaRef.current(DEFAULT_ADVISOR_ROOM_ID);
  }, []);

  useEffect(() => {
    const url = resolveSignalingUrl();

    if (!url) {
      const rafMissing = requestAnimationFrame(() => {
        setSignalingTargetUrl("");
        setSignalingLastError(
          "NEXT_PUBLIC_SIGNALING_URL is missing. On Vercel: Project → Settings → Environment Variables. Use your public HTTPS signaling server URL (see README.md).",
        );
      });
      return () => cancelAnimationFrame(rafMissing);
    }

    if (typeof window !== "undefined") {
      const blocked = mixedContentHelpMessage(window.location.href, url);
      if (blocked) {
        const rafMixed = requestAnimationFrame(() => {
          setSignalingTargetUrl(url);
          setSignalingLastError(blocked);
        });
        return () => cancelAnimationFrame(rafMixed);
      }
    }

    const raf = requestAnimationFrame(() => {
      setSignalingTargetUrl(url);
      setSignalingLastError(null);
    });

    const socket = io(url, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnectionAttempts: 15,
      reconnectionDelay: 1500,
      timeout: 30000,
      upgrade: true,
      rememberUpgrade: true,
    });
    socketRef.current = socket;

    const onConnect = () => {
      setSignalingLastError(null);
      setSignalingConnected(true);
      setMySocketId(socket.id ?? null);
      socket.emit("register", {
        label: labelRef.current.trim() || undefined,
      });
    };

    const onDisconnect = () => {
      setSignalingConnected(false);
      teardownMediaRef.current();
      setIncomingInvite(null);
      setStatus((prev) => {
        if (prev === "idle" || prev === "ended") return prev;
        return "error";
      });
    };

    const onPeersUpdated = (payload: { peers: RegisteredPeer[] }) => {
      setAllPeers(payload.peers ?? []);
    };

    const onRtcSession = (payload: RtcSessionPayload) => {
      if (!payload?.roomId) return;
      void beginMediaRef.current(payload.roomId);
    };

    const onCallInvite = (payload: CallInvitePayload) => {
      if (!payload?.roomId) return;
      setIncomingInvite(payload);
    };

    const onCallPeerError = (payload: { message?: string }) => {
      setError(payload?.message ?? "Could not start call");
      setStatus("error");
    };

    const onConnectError = (err: Error) => {
      const msg = connectErrorMessage(err);
      setSignalingLastError(msg);
      setError(msg);
      setStatus("error");
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("peers:updated", onPeersUpdated);
    socket.on("rtc:session", onRtcSession);
    socket.on("call-invite", onCallInvite);
    socket.on("call-peer-error", onCallPeerError);
    socket.on("connect_error", onConnectError);

    return () => {
      cancelAnimationFrame(raf);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("peers:updated", onPeersUpdated);
      socket.off("rtc:session", onRtcSession);
      socket.off("call-invite", onCallInvite);
      socket.off("call-peer-error", onCallPeerError);
      socket.off("connect_error", onConnectError);
      detachRtcRef.current(socket);
      teardownMediaRef.current();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return {
    signalingConnected,
    signalingTargetUrl,
    signalingLastError,
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
  };
}
