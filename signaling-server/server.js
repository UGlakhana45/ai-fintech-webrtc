const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST?.trim() || "0.0.0.0";

function corsOriginOption() {
  const raw = process.env.SIGNALING_CORS_ORIGIN?.trim();
  if (!raw) {
    return true;
  }
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (list.includes("*")) {
    return true;
  }
  return list.length === 1 ? list[0] : list;
}

const corsValue = corsOriginOption();

const app = express();
app.use(cors({ origin: corsValue }));
app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: corsValue, methods: ["GET", "POST"] },
});

const peers = new Map();
const roomRoles = new Map();

function broadcastPeers() {
  const list = Array.from(peers.values());
  io.emit("peers:updated", { peers: list });
}

io.on("connection", (socket) => {
  socket.on("register", (payload) => {
    const raw =
      typeof payload?.label === "string" ? payload.label.trim() : "";
    const label =
      raw.length > 0
        ? raw.slice(0, 48)
        : `Device ${socket.id.slice(0, 8)}`;
    peers.set(socket.id, { id: socket.id, label });
    broadcastPeers();
  });

  socket.on("call-peer", (targetSocketId) => {
    if (typeof targetSocketId !== "string" || !targetSocketId.trim()) {
      socket.emit("call-peer-error", { message: "Invalid peer id" });
      return;
    }
    const targetId = targetSocketId.trim();
    if (targetId === socket.id) {
      socket.emit("call-peer-error", { message: "Cannot call yourself" });
      return;
    }
    const targetSocket = io.sockets.sockets.get(targetId);
    if (!targetSocket || !targetSocket.connected) {
      socket.emit("call-peer-error", { message: "That device is offline" });
      return;
    }
    const roomId = `pair-${[socket.id, targetId].sort().join("-")}`;
    roomRoles.set(roomId, { offerer: socket.id, answerer: targetId });
    const fromMeta = peers.get(socket.id);
    const fromLabel = fromMeta?.label ?? "Peer";
    socket.emit("rtc:session", { roomId });
    targetSocket.emit("call-invite", {
      roomId,
      fromId: socket.id,
      fromLabel,
    });
  });

  socket.on("join-room", (roomId) => {
    if (typeof roomId !== "string" || !roomId.trim()) {
      return;
    }
    const id = roomId.trim();
    socket.join(id);

    const room = io.sockets.adapter.rooms.get(id);
    const size = room ? room.size : 0;
    if (size === 2) {
      const roles = roomRoles.get(id);
      if (roles) {
        io.to(roles.offerer).emit("signaling:you-are-offerer");
        io.to(roles.answerer).emit("signaling:you-are-answerer");
      } else {
        const peerIds = Array.from(room);
        const [first, second] = peerIds;
        io.to(first).emit("signaling:you-are-offerer");
        io.to(second).emit("signaling:you-are-answerer");
      }
    }
  });

  socket.on("offer", (payload) => {
    if (!payload || typeof payload.roomId !== "string") return;
    socket.to(payload.roomId).emit("offer", payload);
  });

  socket.on("answer", (payload) => {
    if (!payload || typeof payload.roomId !== "string") return;
    socket.to(payload.roomId).emit("answer", payload);
  });

  socket.on("ice-candidate", (payload) => {
    if (!payload || typeof payload.roomId !== "string") return;
    socket.to(payload.roomId).emit("ice-candidate", payload);
  });

  socket.on("leave-room", (roomId) => {
    if (typeof roomId === "string" && roomId.trim()) {
      socket.leave(roomId.trim());
    }
  });

  socket.on("disconnect", () => {
    peers.delete(socket.id);
    broadcastPeers();
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Signaling server listening on http://${HOST}:${PORT}`);
});
