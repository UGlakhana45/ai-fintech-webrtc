export const DEFAULT_SIGNALING_URL = "http://localhost:3001";

export const DEFAULT_ADVISOR_ROOM_ID = "advisor-room";

export interface RegisteredPeer {
  id: string;
  label: string;
}

export interface CallInvitePayload {
  roomId: string;
  fromId: string;
  fromLabel: string;
}

export interface RtcSessionPayload {
  roomId: string;
}

export type WebRTCConnectionStatus =
  | "idle"
  | "connecting"
  | "awaiting-peer"
  | "negotiating"
  | "connected"
  | "error"
  | "ended";

export interface SessionDescriptionPayload {
  roomId: string;
  type: RTCSdpType;
  sdp: string;
}

export interface IceCandidatePayload {
  roomId: string;
  candidate: RTCIceCandidateInit | null;
}

export interface UseLiveAdvisorResult {
  signalingConnected: boolean;
  mySocketId: string | null;
  displayLabel: string;
  setDisplayLabel: (value: string) => void;
  commitDisplayLabel: () => void;
  remotePeers: RegisteredPeer[];
  incomingInvite: CallInvitePayload | null;
  invitePeer: (targetSocketId: string) => void;
  acceptIncomingInvite: () => void;
  declineIncomingInvite: () => void;
  joinPublicTestRoom: () => Promise<void>;

  status: WebRTCConnectionStatus;
  error: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  endCall: () => void;
}
